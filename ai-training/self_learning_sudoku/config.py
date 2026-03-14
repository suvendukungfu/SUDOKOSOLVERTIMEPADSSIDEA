from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


@dataclass(slots=True)
class SystemPaths:
    base_dir: Path = BASE_DIR
    artifacts_dir: Path = field(default_factory=lambda: BASE_DIR / "self_learning_artifacts")
    dataset_dir: Path = field(default_factory=lambda: BASE_DIR / "self_learning_dataset")
    models_dir: Path = field(default_factory=lambda: BASE_DIR / "self_learning_models")
    metrics_dir: Path = field(default_factory=lambda: BASE_DIR / "self_learning_artifacts" / "metrics")
    debug_dir: Path = field(default_factory=lambda: BASE_DIR / "self_learning_artifacts" / "debug")
    reports_dir: Path = field(default_factory=lambda: BASE_DIR / "self_learning_artifacts" / "reports")
    state_file: Path = field(default_factory=lambda: BASE_DIR / "self_learning_artifacts" / "retrain_state.json")
    metrics_file: Path = field(default_factory=lambda: BASE_DIR / "self_learning_artifacts" / "metrics" / "summary.json")

    def ensure(self) -> "SystemPaths":
        for path in (
            self.artifacts_dir,
            self.dataset_dir,
            self.models_dir,
            self.metrics_dir,
            self.debug_dir,
            self.reports_dir,
        ):
            path.mkdir(parents=True, exist_ok=True)
        (self.dataset_dir / "images").mkdir(parents=True, exist_ok=True)
        return self


@dataclass(slots=True)
class SelfLearningConfig:
    paths: SystemPaths = field(default_factory=SystemPaths)
    board_size: int = 450
    cell_size: int = 50
    digit_image_size: int = 28
    detector_threshold: float = 0.55
    recognizer_threshold: float = 0.50
    disagreement_threshold: float = 0.35
    min_component_area: int = 24
    max_component_fill_ratio: float = 0.90
    auto_retrain_threshold: int = 250
    batch_size: int = 128
    detector_epochs: int = 8
    recognizer_epochs: int = 12
    synthetic_samples_per_digit: int = 4000
    ensemble_weights: dict[str, float] = field(
        default_factory=lambda: {"cnn": 1.0, "resnet18": 1.0, "vit": 1.0}
    )

    def __post_init__(self) -> None:
        self.paths.ensure()
