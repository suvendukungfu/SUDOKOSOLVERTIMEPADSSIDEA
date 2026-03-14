from __future__ import annotations

import json
from datetime import datetime, timezone

from .config import SelfLearningConfig
from .schemas import PuzzleProcessingResult


class MetricsTracker:
    def __init__(self, config: SelfLearningConfig) -> None:
        self.config = config
        self.summary = self._load()

    def _load(self) -> dict:
        if self.config.paths.metrics_file.exists():
            with self.config.paths.metrics_file.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        return {
            "processed_puzzles": 0,
            "successful_solves": 0,
            "harvested_samples": 0,
            "verified_digits": 0,
            "verified_correct": 0,
            "corrected_digits": 0,
            "confusion_matrix": [[0 for _ in range(10)] for _ in range(10)],
            "history": [],
        }

    def update(self, result: PuzzleProcessingResult) -> dict:
        self.summary["processed_puzzles"] += 1
        if result.success:
            self.summary["successful_solves"] += 1
        self.summary["harvested_samples"] += result.harvested_samples

        if result.solved_grid is not None:
            for prediction in result.all_predictions:
                if prediction.predicted_digit <= 0:
                    continue
                truth = result.solved_grid[prediction.row][prediction.col]
                self.summary["verified_digits"] += 1
                self.summary["confusion_matrix"][truth][prediction.predicted_digit] += 1
                if truth == prediction.predicted_digit:
                    self.summary["verified_correct"] += 1
                else:
                    self.summary["corrected_digits"] += 1

        accuracy = (
            self.summary["verified_correct"] / self.summary["verified_digits"]
            if self.summary["verified_digits"]
            else 0.0
        )
        solve_rate = self.summary["successful_solves"] / self.summary["processed_puzzles"]

        self.summary["history"].append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "image_path": result.image_path,
                "success": result.success,
                "harvested_samples": result.harvested_samples,
                "pseudo_digit_accuracy": accuracy,
                "solve_rate": solve_rate,
                "suspicious_cells": len(result.suspicious_cells),
            }
        )

        with self.config.paths.metrics_file.open("w", encoding="utf-8") as handle:
            json.dump(self.summary, handle, indent=2)

        return self.summary
