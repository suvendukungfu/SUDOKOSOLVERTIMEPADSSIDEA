from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from .config import SelfLearningConfig


def _plot_confusion_matrix(confusion: np.ndarray, output_path: Path) -> None:
    plt.figure(figsize=(8, 7))
    plt.imshow(confusion, cmap="viridis")
    plt.title("Pseudo-Labeled Confusion Matrix")
    plt.xlabel("Predicted")
    plt.ylabel("True")
    plt.colorbar()
    plt.tight_layout()
    plt.savefig(output_path, dpi=160)
    plt.close()


def _plot_history(history: list[dict], output_path: Path) -> None:
    if not history:
        return

    x = np.arange(len(history))
    accuracy = [item["pseudo_digit_accuracy"] for item in history]
    solve_rate = [item["solve_rate"] for item in history]

    plt.figure(figsize=(10, 4))
    plt.plot(x, accuracy, label="Pseudo digit accuracy")
    plt.plot(x, solve_rate, label="Solve rate")
    plt.ylim(0, 1.05)
    plt.xlabel("Processed puzzle")
    plt.ylabel("Score")
    plt.title("System Performance Over Time")
    plt.legend()
    plt.tight_layout()
    plt.savefig(output_path, dpi=160)
    plt.close()


def generate_dashboard(config: SelfLearningConfig) -> Path:
    metrics_path = config.paths.metrics_file
    if not metrics_path.exists():
        raise FileNotFoundError("Metrics summary not found. Process at least one image first.")

    with metrics_path.open("r", encoding="utf-8") as handle:
        summary = json.load(handle)

    confusion_path = config.paths.reports_dir / "confusion_matrix.png"
    history_path = config.paths.reports_dir / "performance_history.png"

    _plot_confusion_matrix(np.asarray(summary["confusion_matrix"]), confusion_path)
    _plot_history(summary["history"], history_path)

    verified_digits = summary["verified_digits"] or 1
    accuracy = summary["verified_correct"] / verified_digits
    solve_rate = summary["successful_solves"] / max(summary["processed_puzzles"], 1)

    report_path = config.paths.reports_dir / "dashboard.html"
    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Sudoku Self-Learning Dashboard</title>
  <style>
    body {{ font-family: Arial, sans-serif; background:#0f172a; color:#e2e8f0; margin: 40px; }}
    .cards {{ display:grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap:16px; }}
    .card {{ background:#111827; padding:20px; border-radius:16px; }}
    img {{ max-width:100%; border-radius:12px; margin-top:12px; }}
    table {{ width:100%; border-collapse: collapse; margin-top:20px; }}
    td, th {{ padding:8px; border-bottom:1px solid #334155; text-align:left; }}
  </style>
</head>
<body>
  <h1>Sudoku Self-Learning Dashboard</h1>
  <div class="cards">
    <div class="card"><h3>Processed Puzzles</h3><p>{summary["processed_puzzles"]}</p></div>
    <div class="card"><h3>Solve Rate</h3><p>{solve_rate:.2%}</p></div>
    <div class="card"><h3>Pseudo Digit Accuracy</h3><p>{accuracy:.2%}</p></div>
    <div class="card"><h3>Harvested Samples</h3><p>{summary["harvested_samples"]}</p></div>
  </div>
  <h2>Performance Trends</h2>
  <img src="{history_path.name}" alt="Performance trends" />
  <h2>Confusion Matrix</h2>
  <img src="{confusion_path.name}" alt="Confusion matrix" />
  <h2>Recent Runs</h2>
  <table>
    <thead><tr><th>Timestamp</th><th>Image</th><th>Solved</th><th>Samples</th><th>Suspicious Cells</th></tr></thead>
    <tbody>
      {"".join(
          f"<tr><td>{item['timestamp']}</td><td>{Path(item['image_path']).name}</td><td>{item['success']}</td><td>{item['harvested_samples']}</td><td>{item['suspicious_cells']}</td></tr>"
          for item in summary["history"][-20:]
      )}
    </tbody>
  </table>
</body>
</html>"""
    report_path.write_text(html, encoding="utf-8")
    return report_path
