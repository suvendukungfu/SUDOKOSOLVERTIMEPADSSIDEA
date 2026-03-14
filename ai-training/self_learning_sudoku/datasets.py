from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from tensorflow.keras.datasets import mnist

from .config import SelfLearningConfig


SYNTHETIC_FONTS = [
    cv2.FONT_HERSHEY_SIMPLEX,
    cv2.FONT_HERSHEY_DUPLEX,
    cv2.FONT_HERSHEY_COMPLEX,
    cv2.FONT_HERSHEY_TRIPLEX,
    cv2.FONT_HERSHEY_PLAIN,
]


def _load_emnist_digits() -> tuple[np.ndarray, np.ndarray] | None:
    try:
        import tensorflow_datasets as tfds
    except ImportError:
        return None

    ds = tfds.load("emnist/digits", split="train", as_supervised=True)
    images = []
    labels = []
    for image, label in tfds.as_numpy(ds):
        images.append(image.astype(np.float32) / 255.0)
        labels.append(int(label))
    x = np.asarray(images).reshape(-1, 28, 28, 1)
    y = np.asarray(labels, dtype=np.int64)
    return x, y


def _generate_synthetic_digits(samples_per_digit: int) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(42)
    images = []
    labels = []

    for digit in range(10):
        for _ in range(samples_per_digit):
            canvas = np.zeros((28, 28), dtype=np.uint8)
            font = SYNTHETIC_FONTS[rng.integers(0, len(SYNTHETIC_FONTS))]
            font_scale = float(rng.uniform(0.7, 1.0))
            thickness = int(rng.integers(1, 3))
            text = str(digit)
            text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
            x = max(0, (28 - text_size[0]) // 2 + int(rng.integers(-2, 3)))
            y = max(text_size[1], (28 + text_size[1]) // 2 + int(rng.integers(-2, 3)))
            cv2.putText(canvas, text, (x, y), font, font_scale, 255, thickness, cv2.LINE_AA)

            angle = float(rng.uniform(-18, 18))
            matrix = cv2.getRotationMatrix2D((14, 14), angle, rng.uniform(0.9, 1.05))
            warped = cv2.warpAffine(canvas, matrix, (28, 28), flags=cv2.INTER_LINEAR, borderValue=0)
            noise = rng.normal(0, 10, size=(28, 28))
            warped = np.clip(warped.astype(np.float32) + noise, 0, 255).astype(np.uint8)
            images.append(warped.astype(np.float32) / 255.0)
            labels.append(digit)

    return np.asarray(images).reshape(-1, 28, 28, 1), np.asarray(labels, dtype=np.int64)


def _load_self_learning_samples(config: SelfLearningConfig) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    metadata_path = config.paths.dataset_dir / "metadata.jsonl"
    if not metadata_path.exists():
        empty = np.empty((0, 28, 28, 1), dtype=np.float32)
        return empty, np.empty((0,), dtype=np.int64), np.empty((0,), dtype=np.int64)

    digit_images = []
    digit_labels = []
    detector_labels = []

    with metadata_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            payload = json.loads(line)
            image_path = Path(payload["image_path"])
            image = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
            if image is None:
                continue
            resized = cv2.resize(image, (28, 28), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
            digit_images.append(resized.reshape(28, 28, 1))
            detector_labels.append(0 if payload["label"] == "empty" else 1)
            digit_labels.append(0 if payload["label"] == "empty" else int(payload["label"]))

    if not digit_images:
        empty = np.empty((0, 28, 28, 1), dtype=np.float32)
        return empty, np.empty((0,), dtype=np.int64), np.empty((0,), dtype=np.int64)

    return (
        np.asarray(digit_images, dtype=np.float32),
        np.asarray(digit_labels, dtype=np.int64),
        np.asarray(detector_labels, dtype=np.int64),
    )


def build_digit_dataset(config: SelfLearningConfig) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    (x_train, y_train), (x_test, y_test) = mnist.load_data()
    x_train = x_train.astype(np.float32) / 255.0
    x_test = x_test.astype(np.float32) / 255.0
    x_mnist = np.concatenate([x_train, x_test], axis=0).reshape(-1, 28, 28, 1)
    y_mnist = np.concatenate([y_train, y_test], axis=0)

    bundles = [(x_mnist, y_mnist)]

    emnist = _load_emnist_digits()
    if emnist is not None:
        bundles.append(emnist)

    synthetic = _generate_synthetic_digits(config.synthetic_samples_per_digit)
    bundles.append(synthetic)

    self_images, self_labels, _ = _load_self_learning_samples(config)
    if len(self_images) > 0:
        digit_mask = self_labels > 0
        bundles.append((self_images[digit_mask], self_labels[digit_mask]))

    x = np.concatenate([bundle[0] for bundle in bundles], axis=0)
    y = np.concatenate([bundle[1] for bundle in bundles], axis=0)
    return train_test_split(x, y, test_size=0.15, random_state=42, stratify=y)


def build_detector_dataset(config: SelfLearningConfig) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    x_train, x_val, y_train, y_val = build_digit_dataset(config)
    digit_train = (y_train > 0).astype(np.float32)
    digit_val = (y_val > 0).astype(np.float32)

    rng = np.random.default_rng(7)
    blank_train = np.clip(rng.normal(0.02, 0.03, size=x_train.shape), 0.0, 1.0).astype(np.float32)
    blank_val = np.clip(rng.normal(0.02, 0.03, size=x_val.shape), 0.0, 1.0).astype(np.float32)

    self_images, _, detector_labels = _load_self_learning_samples(config)
    train_x = np.concatenate([x_train, blank_train], axis=0)
    train_y = np.concatenate([digit_train, np.zeros(len(blank_train), dtype=np.float32)], axis=0)

    val_x = np.concatenate([x_val, blank_val], axis=0)
    val_y = np.concatenate([digit_val, np.zeros(len(blank_val), dtype=np.float32)], axis=0)

    if len(self_images) > 0:
        train_x = np.concatenate([train_x, self_images], axis=0)
        train_y = np.concatenate([train_y, detector_labels.astype(np.float32)], axis=0)

    train_perm = rng.permutation(len(train_x))
    val_perm = rng.permutation(len(val_x))
    return train_x[train_perm], val_x[val_perm], train_y[train_perm], val_y[val_perm]


def make_tf_dataset(
    x: np.ndarray,
    y: np.ndarray,
    batch_size: int,
    training: bool,
) -> tf.data.Dataset:
    ds = tf.data.Dataset.from_tensor_slices((x, y))
    if training:
        ds = ds.shuffle(min(len(x), 5000), reshuffle_each_iteration=True)
    ds = ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return ds
