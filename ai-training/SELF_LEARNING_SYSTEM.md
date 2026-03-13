# Self-Learning Sudoku AI

This package adds a Python-first Sudoku OCR system that improves from processed puzzles over time.

## Components

- `self_learning_sudoku/preprocessing.py`
  grayscale, CLAHE, Gaussian blur, adaptive thresholding, Canny edges
- `self_learning_sudoku/grid_detection.py`
  contour-first board detection with Hough line fallback and perspective warp
- `self_learning_sudoku/cell_extraction.py`
  81-cell slicing, border removal, connected-component digit extraction, 28x28 normalization
- `self_learning_sudoku/recognition.py`
  digit-vs-empty detector plus CNN / ResNet18-like / ViT-lite ensemble voting
- `self_learning_sudoku/solver_dlx.py`
  exact-cover Sudoku solver used to detect OCR inconsistencies and recover solved boards
- `self_learning_sudoku/storage.py`
  self-learning dataset writer for corrected / verified digit crops
- `self_learning_sudoku/training.py`
  detector and recognizer retraining pipeline
- `self_learning_sudoku/dashboard.py`
  HTML dashboard and metrics visualizations

## CLI

Process an image and harvest new labels:

```bash
cd ai-training
python process_sudoku_image.py process /path/to/sudoku.jpg --auto-retrain
```

Retrain all models manually:

```bash
cd ai-training
python retrain_self_learning.py retrain
```

Generate the latest dashboard:

```bash
cd ai-training
python generate_self_learning_dashboard.py dashboard
```

## Outputs

- `self_learning_dataset/`
  harvested normalized cell crops and metadata
- `self_learning_models/`
  detector and ensemble model checkpoints
- `self_learning_artifacts/debug/`
  warped boards and per-image OCR debug reports
- `self_learning_artifacts/reports/dashboard.html`
  aggregate performance dashboard

## Notes

- EMNIST is loaded automatically when `tensorflow-datasets` is installed.
- The system uses pseudo-labels derived from the solved board, so metrics are best treated as continuously improving operational signals rather than hand-labeled benchmark scores.
- The repository currently contains tracked virtual environments; those should be removed from git history before large pushes to GitHub.
