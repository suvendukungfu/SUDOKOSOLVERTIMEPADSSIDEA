const express = require('express');
const cors = require('cors');
const {
  estimateDifficulty,
  generatePuzzle,
  hasValidGridShape,
  isValidGrid,
  solvePuzzleWithSteps,
  solvePuzzleWithUncertainties,
} = require('./solver/sudokuEngine');

const app = express();
app.use(cors());
app.use(express.json());

// --- Endpoints ---

app.post('/solve', (req, res) => {
  try {
    const { grid, uncertainties } = req.body;
    if (!hasValidGridShape(grid)) {
      return res.status(400).json({ error: 'Invalid grid format. Expected 9x9 array.' });
    }

    const result = solvePuzzleWithUncertainties(grid, uncertainties);
    if (!result) {
      const error = isValidGrid(grid)
        ? 'Unsolvable puzzle'
        : 'Grid has conflicting numbers. Please check your image or edits.';
      res.status(400).json({ error });
      return;
    }

    res.json({ solved: result.solved, correction: result.correction });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Processing error' });
  }
});

app.post('/solve-steps', (req, res) => {
  try {
    const { grid } = req.body;
    if (!hasValidGridShape(grid)) {
      return res.status(400).json({ error: 'Invalid grid format. Expected 9x9 array.' });
    }

    const result = solvePuzzleWithSteps(grid);
    if (!result) {
      const error = isValidGrid(grid)
        ? 'Unsolvable puzzle'
        : 'Grid has conflicting numbers. Please check your image or edits.';
      return res.status(400).json({ error });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Processing error' });
  }
});

app.get('/generate', (req, res) => {
  try {
    const { difficulty } = req.query;
    res.json({ grid: generatePuzzle(difficulty) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate puzzle' });
  }
});

app.post('/difficulty', (req, res) => {
  try {
    const { grid } = req.body;
    const difficulty = estimateDifficulty(grid);
    if (!difficulty) {
      return res.status(400).json({ error: 'Invalid grid format. Expected 9x9 array.' });
    }

    res.json({ difficulty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assess difficulty' });
  }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Server optimized listening on http://localhost:${PORT}`));
