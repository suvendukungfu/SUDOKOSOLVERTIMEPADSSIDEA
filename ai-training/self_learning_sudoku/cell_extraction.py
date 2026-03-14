from __future__ import annotations

import cv2
import numpy as np

from .schemas import CellCrop


def _normalize_digit_patch(
    binary_cell: np.ndarray,
    bbox: tuple[int, int, int, int],
    image_size: int,
) -> np.ndarray:
    x, y, w, h = bbox
    digit = binary_cell[y : y + h, x : x + w]
    scale = (image_size - 8) / max(w, h)
    resized = cv2.resize(
        digit,
        (max(1, int(round(w * scale))), max(1, int(round(h * scale)))),
        interpolation=cv2.INTER_AREA,
    )

    canvas = np.zeros((image_size, image_size), dtype=np.uint8)
    y_offset = (image_size - resized.shape[0]) // 2
    x_offset = (image_size - resized.shape[1]) // 2
    canvas[y_offset : y_offset + resized.shape[0], x_offset : x_offset + resized.shape[1]] = resized
    return canvas


def extract_cells(
    warped_gray: np.ndarray,
    board_size: int,
    image_size: int,
    min_component_area: int,
    max_component_fill_ratio: float,
) -> list[CellCrop]:
    cell_size = board_size // 9
    cells: list[CellCrop] = []

    for row in range(9):
        for col in range(9):
            y0 = row * cell_size
            x0 = col * cell_size
            cell = warped_gray[y0 : y0 + cell_size, x0 : x0 + cell_size]

            border = max(3, int(cell_size * 0.12))
            inner = cell[border : cell_size - border, border : cell_size - border]

            binary = cv2.adaptiveThreshold(
                inner,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY_INV,
                11,
                2,
            )

            component_count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
            best_bbox = None
            best_area = 0
            inner_h, inner_w = binary.shape[:2]
            max_area = int(inner_h * inner_w * max_component_fill_ratio)

            for component_id in range(1, component_count):
                x, y, w, h, area = stats[component_id]
                if area < min_component_area or area > max_area:
                    continue
                if area > best_area:
                    best_bbox = (int(x), int(y), int(w), int(h))
                    best_area = int(area)

            if best_bbox is None:
                normalized = np.zeros((image_size, image_size), dtype=np.uint8)
                has_component = False
            else:
                normalized = _normalize_digit_patch(binary, best_bbox, image_size)
                has_component = True

            cells.append(
                CellCrop(
                    row=row,
                    col=col,
                    raw_image=cell.copy(),
                    cleaned_binary=binary,
                    normalized_digit=normalized,
                    has_component=has_component,
                    bbox=best_bbox,
                    component_area=best_area,
                )
            )

    return cells
