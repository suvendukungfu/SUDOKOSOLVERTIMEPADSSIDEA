from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass(slots=True)
class DetectedBoard:
    corners: np.ndarray
    warped_gray: np.ndarray
    warped_color: np.ndarray
    method: str


def _order_points(points: np.ndarray) -> np.ndarray:
    points = np.asarray(points, dtype=np.float32)
    s = points.sum(axis=1)
    diff = np.diff(points, axis=1)

    ordered = np.zeros((4, 2), dtype=np.float32)
    ordered[0] = points[np.argmin(s)]
    ordered[2] = points[np.argmax(s)]
    ordered[1] = points[np.argmin(diff)]
    ordered[3] = points[np.argmax(diff)]
    return ordered


def _warp_from_corners(image: np.ndarray, corners: np.ndarray, board_size: int) -> tuple[np.ndarray, np.ndarray]:
    destination = np.array(
        [[0, 0], [board_size - 1, 0], [board_size - 1, board_size - 1], [0, board_size - 1]],
        dtype=np.float32,
    )
    transform = cv2.getPerspectiveTransform(_order_points(corners), destination)
    warped_color = cv2.warpPerspective(image, transform, (board_size, board_size))
    warped_gray = cv2.cvtColor(warped_color, cv2.COLOR_BGR2GRAY)
    return warped_gray, warped_color


def _detect_via_contours(original: np.ndarray, threshold: np.ndarray, board_size: int) -> DetectedBoard | None:
    contours, _ = cv2.findContours(threshold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best_quad = None
    best_area = 0.0

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < best_area:
            continue

        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) != 4 or not cv2.isContourConvex(approx):
            continue

        best_quad = approx.reshape(4, 2).astype(np.float32)
        best_area = area

    if best_quad is None:
        return None

    warped_gray, warped_color = _warp_from_corners(original, best_quad, board_size)
    return DetectedBoard(corners=_order_points(best_quad), warped_gray=warped_gray, warped_color=warped_color, method="contour")


def _line_intersection(line_a: np.ndarray, line_b: np.ndarray) -> tuple[float, float] | None:
    x1, y1, x2, y2 = line_a
    x3, y3, x4, y4 = line_b
    denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if abs(denominator) < 1e-6:
        return None
    px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator
    py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator
    return px, py


def _detect_via_hough(original: np.ndarray, edges: np.ndarray, board_size: int) -> DetectedBoard | None:
    lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=150,
        minLineLength=min(edges.shape[:2]) * 0.5,
        maxLineGap=25,
    )

    if lines is None:
        return None

    horizontal = []
    vertical = []
    for raw_line in lines[:, 0]:
        x1, y1, x2, y2 = raw_line
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        if abs(angle) < 15 or abs(angle) > 165:
            horizontal.append(raw_line)
        elif abs(abs(angle) - 90) < 15:
            vertical.append(raw_line)

    if len(horizontal) < 2 or len(vertical) < 2:
        return None

    top = min(horizontal, key=lambda line: (line[1] + line[3]) / 2)
    bottom = max(horizontal, key=lambda line: (line[1] + line[3]) / 2)
    left = min(vertical, key=lambda line: (line[0] + line[2]) / 2)
    right = max(vertical, key=lambda line: (line[0] + line[2]) / 2)

    corners = [
        _line_intersection(top, left),
        _line_intersection(top, right),
        _line_intersection(bottom, right),
        _line_intersection(bottom, left),
    ]

    if any(corner is None for corner in corners):
        return None

    corner_array = np.asarray(corners, dtype=np.float32)
    warped_gray, warped_color = _warp_from_corners(original, corner_array, board_size)
    return DetectedBoard(corners=_order_points(corner_array), warped_gray=warped_gray, warped_color=warped_color, method="hough")


def detect_board(original: np.ndarray, threshold: np.ndarray, edges: np.ndarray, board_size: int) -> DetectedBoard:
    contour_board = _detect_via_contours(original, threshold, board_size)
    if contour_board is not None:
        return contour_board

    hough_board = _detect_via_hough(original, edges, board_size)
    if hough_board is not None:
        return hough_board

    raise RuntimeError("Failed to detect Sudoku board with contour and Hough fallback.")
