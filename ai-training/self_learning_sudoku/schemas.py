from __future__ import annotations

from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

import numpy as np


@dataclass(slots=True)
class CellCrop:
    row: int
    col: int
    raw_image: np.ndarray
    cleaned_binary: np.ndarray
    normalized_digit: np.ndarray
    has_component: bool
    bbox: tuple[int, int, int, int] | None
    component_area: int


@dataclass(slots=True)
class CellPrediction:
    row: int
    col: int
    detector_probability: float
    predicted_digit: int
    confidence: float
    ensemble_probs: dict[str, list[float]] = field(default_factory=dict)
    voted_probs: list[float] = field(default_factory=list)
    suspicious_reasons: list[str] = field(default_factory=list)
    corrected_digit: int | None = None
    image_path: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class PuzzleProcessingResult:
    image_path: str
    warped_board_path: str
    grid: list[list[int]]
    solved_grid: list[list[int]] | None
    success: bool
    suspicious_cells: list[CellPrediction]
    all_predictions: list[CellPrediction]
    harvested_samples: int
    report_path: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["suspicious_cells"] = [cell.to_dict() for cell in self.suspicious_cells]
        payload["all_predictions"] = [cell.to_dict() for cell in self.all_predictions]
        return payload


def normalize_array_for_json(array: np.ndarray | None) -> list[list[int]] | None:
    if array is None:
        return None
    return np.asarray(array).astype(int).tolist()
