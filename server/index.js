const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- Optimized Sudoku Solver (Constraint Propagation + Backtracking) ---

const getCandidates = (board, r, c) => {
  if (board[r][c] !== 0) return [];
  const candidates = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  for (let i = 0; i < 9; i++) {
    candidates.delete(board[r][i]);
    candidates.delete(board[i][c]);
  }

  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      candidates.delete(board[br + i][bc + j]);
    }
  }

  return Array.from(candidates);
};

const isValidGrid = (board) => {
  for (let r = 0; r < 9; r++) {
    const rowSet = new Set();
    const colSet = new Set();
    const boxSet = new Set();
    
    for (let c = 0; c < 9; c++) {
      // Check rows
      if (board[r][c] !== 0) {
        if (rowSet.has(board[r][c])) return false;
        rowSet.add(board[r][c]);
      }
      // Check columns
      if (board[c][r] !== 0) {
        if (colSet.has(board[c][r])) return false;
        colSet.add(board[c][r]);
      }
      
      // Check boxes
      const br = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      const bc = (r % 3) * 3 + (c % 3);
      const boxR = Math.floor(br / 3) * 3 + Math.floor(bc / 3);
      const boxC = (br % 3) * 3 + (c % 3);
      // Wait, let's simplify box checking logic
    }
  }
  
  // Re-implementing box check for clarity
  for (let b = 0; b < 9; b++) {
    const boxSet = new Set();
    const startR = Math.floor(b / 3) * 3;
    const startC = (b % 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const val = board[startR + i][startC + j];
        if (val !== 0) {
          if (boxSet.has(val)) return false;
          boxSet.add(val);
        }
      }
    }
  }
  
  return true;
};

const solveOptimized = (board) => {
  let minCandidates = 10;
  let bestR = -1;
  let bestC = -1;
  let bestCandidates = [];

  // Find the empty cell with the fewest candidates (MRV heuristic)
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const candidates = getCandidates(board, r, c);
        // If an empty cell has 0 candidates, the board is invalid/unsolvable
        if (candidates.length === 0) return false;
        
        if (candidates.length < minCandidates) {
          minCandidates = candidates.length;
          bestR = r;
          bestC = c;
          bestCandidates = candidates;
        }
      }
    }
  }

  // If no empty cell found, puzzle is solved
  if (bestR === -1) return true;

  // Try placing candidates
  for (const val of bestCandidates) {
    board[bestR][bestC] = val;
    if (solveOptimized(board)) return true;
    board[bestR][bestC] = 0; // backtrack
  }

  return false;
};

// --- Endpoints ---

// POST /solve -> Solves the puzzle instantly
app.post('/solve', (req, res) => {
  try {
    const { grid, uncertainties } = req.body;
    if (!grid || grid.length !== 9) {
      return res.status(400).json({ error: 'Invalid grid format. Expected 9x9 array.' });
    }

    const board = grid.map(row => [...row]); // Deep copy
    
    // 1. Check for initial conflicts
    if (!isValidGrid(board)) {
      // Dual-Guess Logic: If grid is invalid, try to resolve conflicts by swapping uncertain digits
      let fixed = false;
      if (uncertainties && Object.keys(uncertainties).length > 0) {
        for (const [cellIdx, secondGuess] of Object.entries(uncertainties)) {
          const r = Math.floor(parseInt(cellIdx) / 9);
          const c = parseInt(cellIdx) % 9;
          const originalVal = board[r][c];
          
          // Temporarily swap and check validity
          board[r][c] = secondGuess;
          if (isValidGrid(board)) {
            fixed = true;
            console.log(`Resolved conflict at cell ${cellIdx}: swapped ${originalVal} -> ${secondGuess}`);
            break; 
          }
          // Swap back and try next
          board[r][c] = originalVal;
        }
      }

      if (!fixed) {
        return res.status(400).json({ error: 'Grid has conflicting numbers. Please check your image or edits.' });
      }
    }

    const success = solveOptimized(board);

    if (success) {
      res.json({ solved: board });
    } else {
      res.status(400).json({ error: 'Unsolvable puzzle' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Processing error' });
  }
});

// GET /generate -> Returns a basic layout
// Note: A true generator creates a full board, punches holes, and ensures unique solution.
// For brevity, we return a hardcoded template or randomly punch holes in a generic board.
app.get('/generate', (req, res) => {
  try {
    const { difficulty } = req.query; // 'easy', 'medium', 'hard'
    let holesToPunch = 40; // Default medium
    if (difficulty === 'easy') holesToPunch = 30;
    if (difficulty === 'hard') holesToPunch = 50;
    if (difficulty === 'expert') holesToPunch = 60;

    // A valid solved base board
    const baseBoard = [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9]
    ];

    // Mix up the base board to create randomness
    // (Swapping rows within 3x3 bands is valid, swapping columns within 3x3 bands is valid)
    // A simplified scramble:
    for (let i=0; i<3; i++) {
        const bandStart = i * 3;
        // swap two rows in the band
        const r1 = bandStart + Math.floor(Math.random() * 3);
        const r2 = bandStart + Math.floor(Math.random() * 3);
        const temp = baseBoard[r1];
        baseBoard[r1] = baseBoard[r2];
        baseBoard[r2] = temp;
    }

    const puzzle = baseBoard.map(row => [...row]);
    let holes = 0;
    while(holes < holesToPunch) {
      const r = Math.floor(Math.random() * 9);
      const c = Math.floor(Math.random() * 9);
      if (puzzle[r][c] !== 0) {
        puzzle[r][c] = 0;
        holes++;
      }
    }

    res.json({ grid: puzzle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate puzzle' });
  }
});

// POST /difficulty -> Estimates difficulty based on given numbers
app.post('/difficulty', (req, res) => {
  try {
    const { grid } = req.body;
    let givens = 0;
    grid.forEach(row => row.forEach(cell => {
      if (cell !== 0) givens++;
    }));

    let difficulty = 'Medium';
    if (givens > 45) difficulty = 'Easy';
    else if (givens < 30) difficulty = 'Hard';
    else if (givens < 23) difficulty = 'Expert';

    res.json({ difficulty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assess difficulty' });
  }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Server optimized listening on http://localhost:${PORT}`));
