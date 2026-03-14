from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass(slots=True)
class PreprocessedImage:
    original: np.ndarray
    gray: np.ndarray
    clahe: np.ndarray
    blurred: np.ndarray
    threshold: np.ndarray
    edges: np.ndarray


def load_image(image_path: str) -> np.ndarray:
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Unable to read image: {image_path}")
    return image


def preprocess_image(image: np.ndarray) -> PreprocessedImage:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(gray)
    blurred = cv2.GaussianBlur(clahe, (5, 5), 0)

    threshold = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        11,
        2,
    )

    edges = cv2.Canny(blurred, 50, 150)

    return PreprocessedImage(
        original=image,
        gray=gray,
        clahe=clahe,
        blurred=blurred,
        threshold=threshold,
        edges=edges,
    )
