from __future__ import annotations

from pathlib import Path

import numpy as np
import tensorflow as tf

from .config import SelfLearningConfig
from .schemas import CellCrop, CellPrediction


class EnsembleRecognizer:
    def __init__(self, config: SelfLearningConfig) -> None:
        self.config = config
        self.detector = self._load_detector()
        self.models = self._load_digit_models()

    def _load_detector(self) -> tf.keras.Model | None:
        detector_path = self.config.paths.models_dir / "digit_detector.keras"
        if detector_path.exists():
            return tf.keras.models.load_model(detector_path)
        return None

    def _load_digit_models(self) -> dict[str, tf.keras.Model]:
        loaded = {}
        for name in ("cnn", "resnet18", "vit"):
            path = self.config.paths.models_dir / f"{name}.keras"
            if path.exists():
                loaded[name] = tf.keras.models.load_model(path)

        legacy_model = self.config.paths.base_dir / "sudoku_model_best.h5"
        if "cnn" not in loaded and legacy_model.exists():
            loaded["cnn"] = tf.keras.models.load_model(legacy_model)

        return loaded

    @staticmethod
    def _normalize_probs(probs: np.ndarray) -> np.ndarray:
        normalized = probs.astype(np.float32).copy()
        normalized[..., 0] = 0.0
        sums = normalized.sum(axis=1, keepdims=True)
        sums[sums == 0] = 1.0
        return normalized / sums

    def predict(self, cells: list[CellCrop]) -> list[CellPrediction]:
        if not self.models:
            raise RuntimeError(
                "No digit recognition models found. Train the self-learning models first or place a compatible legacy model."
            )

        batch = np.asarray([cell.normalized_digit for cell in cells], dtype=np.float32).reshape(-1, 28, 28, 1) / 255.0

        if self.detector is not None:
            detector_probs = self.detector.predict(batch, verbose=0).reshape(-1)
        else:
            detector_probs = np.asarray([1.0 if cell.has_component else 0.0 for cell in cells], dtype=np.float32)

        ensemble_outputs: dict[str, np.ndarray] = {}
        for name, model in self.models.items():
            ensemble_outputs[name] = self._normalize_probs(model.predict(batch, verbose=0))

        predictions: list[CellPrediction] = []
        for index, cell in enumerate(cells):
            per_model = {name: output[index].tolist() for name, output in ensemble_outputs.items()}
            weighted = np.zeros(10, dtype=np.float32)
            votes: dict[int, int] = {}
            total_weight = 0.0

            for name, probs in ensemble_outputs.items():
                weight = float(self.config.ensemble_weights.get(name, 1.0))
                weighted += probs[index] * weight
                voted_digit = int(np.argmax(probs[index]))
                votes[voted_digit] = votes.get(voted_digit, 0) + 1
                total_weight += weight

            if total_weight == 0:
                total_weight = 1.0
            weighted /= total_weight

            winning_vote_count = max(votes.values()) if votes else 0
            disagreement = 1.0 - (winning_vote_count / max(len(self.models), 1))
            predicted_digit = int(np.argmax(weighted))
            confidence = float(weighted[predicted_digit])

            suspicious_reasons = []
            if detector_probs[index] < self.config.detector_threshold:
                predicted_digit = 0
                confidence = float(detector_probs[index])
            else:
                if confidence < self.config.recognizer_threshold:
                    suspicious_reasons.append("low_confidence")
                if disagreement > self.config.disagreement_threshold:
                    suspicious_reasons.append("ensemble_disagreement")

            predictions.append(
                CellPrediction(
                    row=cell.row,
                    col=cell.col,
                    detector_probability=float(detector_probs[index]),
                    predicted_digit=predicted_digit,
                    confidence=confidence,
                    ensemble_probs=per_model,
                    voted_probs=weighted.tolist(),
                    suspicious_reasons=suspicious_reasons,
                )
            )

        return predictions
