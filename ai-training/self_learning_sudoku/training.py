from __future__ import annotations

import json
from pathlib import Path

import tensorflow as tf

from .config import SelfLearningConfig
from .datasets import build_detector_dataset, build_digit_dataset, make_tf_dataset
from .models import MODEL_BUILDERS, build_digit_detector


class SelfLearningTrainer:
    def __init__(self, config: SelfLearningConfig) -> None:
        self.config = config
        self.config.paths.ensure()

    def _load_or_build(self, model_name: str) -> tf.keras.Model:
        model_path = self.config.paths.models_dir / f"{model_name}.keras"
        if model_path.exists():
            return tf.keras.models.load_model(model_path)

        if model_name == "digit_detector":
            return build_digit_detector()

        builder = MODEL_BUILDERS[model_name]
        return builder()

    def _callbacks(self, model_name: str) -> list[tf.keras.callbacks.Callback]:
        checkpoint_path = self.config.paths.models_dir / f"{model_name}.keras"
        return [
            tf.keras.callbacks.ModelCheckpoint(checkpoint_path, save_best_only=True, monitor="val_accuracy"),
            tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=3, restore_best_weights=True),
            tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2),
        ]

    def train_digit_detector(self) -> dict:
        train_x, val_x, train_y, val_y = build_detector_dataset(self.config)
        train_ds = make_tf_dataset(train_x, train_y, self.config.batch_size, training=True)
        val_ds = make_tf_dataset(val_x, val_y, self.config.batch_size, training=False)

        model = self._load_or_build("digit_detector")
        history = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=self.config.detector_epochs,
            callbacks=self._callbacks("digit_detector"),
            verbose=1,
        )
        metrics = {key: float(values[-1]) for key, values in history.history.items()}
        return {"model": "digit_detector", "metrics": metrics}

    def train_digit_model(self, model_name: str) -> dict:
        train_x, val_x, train_y, val_y = build_digit_dataset(self.config)
        train_ds = make_tf_dataset(train_x, train_y, self.config.batch_size, training=True)
        val_ds = make_tf_dataset(val_x, val_y, self.config.batch_size, training=False)

        model = self._load_or_build(model_name)
        history = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=self.config.recognizer_epochs,
            callbacks=self._callbacks(model_name),
            verbose=1,
        )
        metrics = {key: float(values[-1]) for key, values in history.history.items()}
        return {"model": model_name, "metrics": metrics}

    def retrain_all(self) -> dict:
        summary = {"runs": []}
        summary["runs"].append(self.train_digit_detector())
        for model_name in MODEL_BUILDERS:
            summary["runs"].append(self.train_digit_model(model_name))

        summary_path = self.config.paths.metrics_dir / "latest_training_run.json"
        with summary_path.open("w", encoding="utf-8") as handle:
            json.dump(summary, handle, indent=2)
        return summary
