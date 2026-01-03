// server/index.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// multer storage
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Sudoku solver (backtracking)
function isSafe(board, r, c, val) {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === val || board[i][c] === val) return false;
  }
  const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    if (board[br+i][bc+j] === val) return false;
  return true;
}
function solveBoard(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        for (let v = 1; v <= 9; v++) {
          if (isSafe(board, r, c, v)) {
            board[r][c] = v;
            if (solveBoard(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// parse OCR text into 9x9 grid (best-effort)
function parseTextToGrid(text) {
  // extract digits
  const digits = (text.match(/\d/g) || []).map(x => parseInt(x, 10));
  // if we have exactly 81 digits, split into 9x9
  if (digits.length >= 81) {
    const grid = [];
    for (let r = 0; r < 9; r++) grid.push(digits.slice(r*9, r*9+9));
    return grid;
  }
  // fallback: return empty grid (frontend should allow manual input)
  return Array.from({length:9}, ()=>Array(9).fill(0));
}

// POST /upload endpoint
app.post('/upload', upload.single('sudokuImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const imagePath = req.file.path;

    // Run Tesseract on the whole image (simple)
    const worker = Tesseract.createWorker();
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    await worker.setParameters({ tessedit_char_whitelist: '0123456789' });

    const { data: { text } } = await worker.recognize(imagePath);
    await worker.terminate();

    const grid = parseTextToGrid(text);

    // attempt to solve
    const board = grid.map(row => row.slice());
    const solved = solveBoard(board) ? board : null;

    // optionally delete uploaded file
    // fs.unlinkSync(imagePath);

    res.json({ ocrText: text, parsedGrid: grid, solved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Processing error', details: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
