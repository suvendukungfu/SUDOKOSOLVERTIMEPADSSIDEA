from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

import cv2

from .cell_extraction import extract_cells
from .config import SelfLearningConfig
from .dashboard import generate_dashboard
from .grid_detection import detect_board
from .metrics import MetricsTracker
from .preprocessing import load_image, preprocess_image
from .recognition import EnsembleRecognizer
from .schemas import PuzzleProcessingResult
from .solver_dlx import DancingLinksSudokuSolver, find_conflicts, validate_grid
from .storage import DatasetStore
from .training import SelfLearningTrainer


class SelfLearningSudokuSystem:
    def __init__(self, config: SelfLearningConfig | None = None) -> None:
        self.config = config or SelfLearningConfig()
        self.config.paths.ensure()
        self.recognizer = EnsembleRecognizer(self.config)
        self.solver = DancingLinksSudokuSolver()
        self.store = DatasetStore(self.config)
        self.metrics = MetricsTracker(self.config)
        self.trainer = SelfLearningTrainer(self.config)

    def _initial_grid(self, predictions) -> list[list[int]]:
        grid = [[0 for _ in range(9)] for _ in range(9)]
        for prediction in predictions:
            grid[prediction.row][prediction.col] = prediction.predicted_digit
        return grid

    def _mark_conflicts(self, predictions, grid: list[list[int]]) -> None:
        for row, col in find_conflicts(grid):
            for prediction in predictions:
                if prediction.row == row and prediction.col == col and "rule_conflict" not in prediction.suspicious_reasons:
                    prediction.suspicious_reasons.append("rule_conflict")

    def _solve_with_feedback(self, predictions, grid: list[list[int]]) -> tuple[list[list[int]] | None, set[tuple[int, int]]]:
        suspicious = {
            (prediction.row, prediction.col)
            for prediction in predictions
            if prediction.predicted_digit > 0 and prediction.suspicious_reasons
        }
        ranked = sorted(
            [prediction for prediction in predictions if prediction.predicted_digit > 0],
            key=lambda item: (item.confidence, item.detector_probability),
        )

        for extra_removals in range(0, min(18, len(ranked)) + 1):
            working = deepcopy(grid)
            removed = set(suspicious)
            for prediction in ranked[:extra_removals]:
                removed.add((prediction.row, prediction.col))

            for row, col in removed:
                working[row][col] = 0

            if not validate_grid(working):
                continue

            solved = self.solver.solve(working)
            if solved is not None:
                return solved, removed

        return None, suspicious

    def _write_debug_report(
        self,
        image_path: str,
        warped_board_path: Path,
        predictions,
        initial_grid: list[list[int]],
        solved_grid: list[list[int]] | None,
        cells,
    ) -> Path:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        report_dir = self.config.paths.debug_dir / f"{Path(image_path).stem}_{stamp}"
        report_dir.mkdir(parents=True, exist_ok=True)

        cell_records = []
        for cell, prediction in zip(cells, predictions):
            cell_path = report_dir / f"cell_r{cell.row}_c{cell.col}.png"
            cv2.imwrite(str(cell_path), cell.normalized_digit)
            prediction.image_path = prediction.image_path or str(cell_path)
            cell_records.append(
                {
                    "row": cell.row,
                    "col": cell.col,
                    "predicted_digit": prediction.predicted_digit,
                    "confidence": prediction.confidence,
                    "detector_probability": prediction.detector_probability,
                    "corrected_digit": prediction.corrected_digit,
                    "reasons": prediction.suspicious_reasons,
                    "image": cell_path.name,
                }
            )

        payload = {
            "source_image": image_path,
            "warped_board": str(warped_board_path),
            "initial_grid": initial_grid,
            "solved_grid": solved_grid,
            "cells": cell_records,
        }
        (report_dir / "debug.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")

        rows_html = "".join(
            f"<tr><td>{item['row']}</td><td>{item['col']}</td><td><img src='{item['image']}' width='56' /></td>"
            f"<td>{item['predicted_digit']}</td><td>{item['confidence']:.3f}</td><td>{item['detector_probability']:.3f}</td>"
            f"<td>{item['corrected_digit'] if item['corrected_digit'] is not None else ''}</td><td>{', '.join(item['reasons'])}</td></tr>"
            for item in cell_records
        )
        html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Sudoku OCR Debug Report</title>
  <style>
    body {{ font-family: Arial, sans-serif; background:#0f172a; color:#e2e8f0; margin:32px; }}
    img {{ border-radius:8px; background:#111827; padding:4px; }}
    pre {{ background:#111827; padding:16px; border-radius:12px; overflow:auto; }}
    table {{ width:100%; border-collapse: collapse; }}
    td, th {{ border-bottom:1px solid #334155; padding:8px; text-align:left; }}
  </style>
</head>
<body>
  <h1>Sudoku OCR Debug Report</h1>
  <p>Source image: {Path(image_path).name}</p>
  <p>Warped board: <img src="{Path(warped_board_path).name}" width="220" /></p>
  <h2>Initial Grid</h2><pre>{json.dumps(initial_grid, indent=2)}</pre>
  <h2>Solved Grid</h2><pre>{json.dumps(solved_grid, indent=2) if solved_grid else 'No solution found'}</pre>
  <h2>Cell Predictions</h2>
  <table>
    <thead><tr><th>Row</th><th>Col</th><th>Cell</th><th>Pred</th><th>Conf</th><th>Detector</th><th>Corrected</th><th>Reasons</th></tr></thead>
    <tbody>{rows_html}</tbody>
  </table>
</body>
</html>"""
        report_path = report_dir / "report.html"
        report_path.write_text(html, encoding="utf-8")
        warped_target = report_dir / Path(warped_board_path).name
        if warped_target != warped_board_path:
            warped_target.write_bytes(warped_board_path.read_bytes())
        return report_path

    def process_image(self, image_path: str, auto_retrain: bool = False) -> PuzzleProcessingResult:
        image = load_image(image_path)
        preprocessed = preprocess_image(image)
        board = detect_board(
            preprocessed.original,
            preprocessed.threshold,
            preprocessed.edges,
            self.config.board_size,
        )

        warped_name = f"{Path(image_path).stem}_warped.png"
        warped_path = self.config.paths.debug_dir / warped_name
        cv2.imwrite(str(warped_path), board.warped_gray)

        cells = extract_cells(
            board.warped_gray,
            board_size=self.config.board_size,
            image_size=self.config.digit_image_size,
            min_component_area=self.config.min_component_area,
            max_component_fill_ratio=self.config.max_component_fill_ratio,
        )

        predictions = self.recognizer.predict(cells)
        initial_grid = self._initial_grid(predictions)
        self._mark_conflicts(predictions, initial_grid)
        solved_grid, removed = self._solve_with_feedback(predictions, initial_grid)

        if solved_grid is not None:
            for prediction in predictions:
                if prediction.predicted_digit <= 0:
                    continue
                corrected = solved_grid[prediction.row][prediction.col]
                if corrected != prediction.predicted_digit:
                    prediction.corrected_digit = corrected
                    if "solver_correction" not in prediction.suspicious_reasons:
                        prediction.suspicious_reasons.append("solver_correction")
                if (prediction.row, prediction.col) in removed and "re-solved_without_cell" not in prediction.suspicious_reasons:
                    prediction.suspicious_reasons.append("re-solved_without_cell")

        harvested = self.store.harvest(
            image_path=image_path,
            cells=cells,
            predictions=predictions,
            solved_grid=solved_grid,
            recognizer_threshold=self.config.recognizer_threshold,
            detector_threshold=self.config.detector_threshold,
        )

        suspicious_cells = [prediction for prediction in predictions if prediction.suspicious_reasons or prediction.corrected_digit]
        report_path = self._write_debug_report(
            image_path=image_path,
            warped_board_path=warped_path,
            predictions=predictions,
            initial_grid=initial_grid,
            solved_grid=solved_grid,
            cells=cells,
        )

        result = PuzzleProcessingResult(
            image_path=image_path,
            warped_board_path=str(warped_path),
            grid=initial_grid,
            solved_grid=solved_grid,
            success=solved_grid is not None,
            suspicious_cells=suspicious_cells,
            all_predictions=predictions,
            harvested_samples=harvested,
            report_path=str(report_path),
        )

        self.metrics.update(result)
        generate_dashboard(self.config)

        if auto_retrain and self.store.should_retrain():
            self.trainer.retrain_all()
            self.store.mark_retrained()

        return result
