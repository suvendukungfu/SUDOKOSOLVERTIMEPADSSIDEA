from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import cv2

from .config import SelfLearningConfig
from .schemas import CellCrop, CellPrediction


class DatasetStore:
    def __init__(self, config: SelfLearningConfig) -> None:
        self.config = config
        self.images_dir = self.config.paths.dataset_dir / "images"
        self.metadata_path = self.config.paths.dataset_dir / "metadata.jsonl"
        self.config.paths.ensure()

    def count_samples(self) -> int:
        if not self.metadata_path.exists():
            return 0
        with self.metadata_path.open("r", encoding="utf-8") as handle:
            return sum(1 for _ in handle)

    def should_retrain(self) -> bool:
        current = self.count_samples()
        state = self._read_state()
        return current - state.get("last_retrain_sample_count", 0) >= self.config.auto_retrain_threshold

    def mark_retrained(self) -> None:
        state = self._read_state()
        state["last_retrain_sample_count"] = self.count_samples()
        state.setdefault("history", []).append(
            {"timestamp": datetime.now(timezone.utc).isoformat(), "sample_count": state["last_retrain_sample_count"]}
        )
        with self.config.paths.state_file.open("w", encoding="utf-8") as handle:
            json.dump(state, handle, indent=2)

    def _read_state(self) -> dict:
        if self.config.paths.state_file.exists():
            with self.config.paths.state_file.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        return {"last_retrain_sample_count": 0, "history": []}

    def harvest(
        self,
        image_path: str,
        cells: list[CellCrop],
        predictions: list[CellPrediction],
        solved_grid: list[list[int]] | None,
        recognizer_threshold: float,
        detector_threshold: float,
    ) -> int:
        if solved_grid is None:
            return 0

        harvested = 0
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")

        with self.metadata_path.open("a", encoding="utf-8") as metadata_handle:
            for cell, prediction in zip(cells, predictions):
                label: str | None = None
                sample_type: str | None = None

                solved_digit = solved_grid[cell.row][cell.col]
                if prediction.predicted_digit > 0:
                    if solved_digit != prediction.predicted_digit:
                        label = str(solved_digit)
                        sample_type = "corrected_digit"
                        prediction.corrected_digit = solved_digit
                    elif prediction.confidence >= max(0.85, recognizer_threshold):
                        label = str(solved_digit)
                        sample_type = "verified_digit"
                elif prediction.detector_probability <= detector_threshold * 0.4 and not cell.has_component:
                    label = "empty"
                    sample_type = "verified_empty"

                if label is None:
                    continue

                label_dir = self.images_dir / label
                label_dir.mkdir(parents=True, exist_ok=True)
                file_name = f"{timestamp}_r{cell.row}_c{cell.col}_{sample_type}.png"
                output_path = label_dir / file_name
                cv2.imwrite(str(output_path), cell.normalized_digit)
                prediction.image_path = str(output_path)

                record = {
                    "timestamp": timestamp,
                    "source_image": image_path,
                    "row": cell.row,
                    "col": cell.col,
                    "label": label,
                    "predicted_digit": prediction.predicted_digit,
                    "corrected_digit": prediction.corrected_digit,
                    "detector_probability": prediction.detector_probability,
                    "recognition_confidence": prediction.confidence,
                    "reasons": prediction.suspicious_reasons,
                    "sample_type": sample_type,
                    "image_path": str(output_path),
                }
                metadata_handle.write(json.dumps(record) + "\n")
                harvested += 1

        return harvested
