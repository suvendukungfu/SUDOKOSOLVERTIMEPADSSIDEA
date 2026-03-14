const BOARD_SIZE = 9;
const BOX_SIZE = 3;

const HOLES_BY_DIFFICULTY = {
  easy: 30,
  medium: 40,
  hard: 50,
  expert: 60,
};

const BASE_BOARD = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const isCellValue = (value) =>
  Number.isInteger(value) && value >= 0 && value <= BOARD_SIZE;

const cloneBoard = (board) => board.map((row) => [...row]);

const hasValidGridShape = (board) =>
  Array.isArray(board) &&
  board.length === BOARD_SIZE &&
  board.every(
    (row) =>
      Array.isArray(row) &&
      row.length === BOARD_SIZE &&
      row.every(isCellValue),
  );

const hasDuplicateDigits = (values) => {
  const seen = new Set();

  for (const value of values) {
    if (value === 0) continue;
    if (seen.has(value)) return true;
    seen.add(value);
  }

  return false;
};

const getRow = (board, rowIndex) => board[rowIndex];

const getColumn = (board, colIndex) => board.map((row) => row[colIndex]);

const getBox = (board, rowIndex, colIndex) => {
  const startRow = Math.floor(rowIndex / BOX_SIZE) * BOX_SIZE;
  const startCol = Math.floor(colIndex / BOX_SIZE) * BOX_SIZE;
  const values = [];

  for (let row = startRow; row < startRow + BOX_SIZE; row += 1) {
    for (let col = startCol; col < startCol + BOX_SIZE; col += 1) {
      values.push(board[row][col]);
    }
  }

  return values;
};

const isValidGrid = (board) => {
  if (!hasValidGridShape(board)) {
    return false;
  }

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    if (hasDuplicateDigits(getRow(board, index))) {
      return false;
    }

    if (hasDuplicateDigits(getColumn(board, index))) {
      return false;
    }
  }

  for (let row = 0; row < BOARD_SIZE; row += BOX_SIZE) {
    for (let col = 0; col < BOARD_SIZE; col += BOX_SIZE) {
      if (hasDuplicateDigits(getBox(board, row, col))) {
        return false;
      }
    }
  }

  return true;
};

const getCandidates = (board, row, col) => {
  if (board[row][col] !== 0) {
    return [];
  }

  const candidates = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    candidates.delete(board[row][index]);
    candidates.delete(board[index][col]);
  }

  for (const value of getBox(board, row, col)) {
    candidates.delete(value);
  }

  return Array.from(candidates);
};

const selectNextCell = (board) => {
  let bestCell = null;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] !== 0) continue;

      const candidates = getCandidates(board, row, col);
      if (candidates.length === 0) {
        return { row, col, candidates };
      }

      if (!bestCell || candidates.length < bestCell.candidates.length) {
        bestCell = { row, col, candidates };
      }
    }
  }

  return bestCell;
};

const solveBoard = (board, steps = null) => {
  const nextCell = selectNextCell(board);

  if (!nextCell) {
    return true;
  }

  const { row, col, candidates } = nextCell;
  if (candidates.length === 0) {
    return false;
  }

  for (const value of candidates) {
    board[row][col] = value;

    if (steps) {
      steps.push({ row, col, value });
    }

    if (solveBoard(board, steps)) {
      return true;
    }

    board[row][col] = 0;
    if (steps) {
      steps.pop();
    }
  }

  return false;
};

const solvePuzzle = (grid) => {
  if (!hasValidGridShape(grid) || !isValidGrid(grid)) {
    return null;
  }

  const board = cloneBoard(grid);
  return solveBoard(board) ? board : null;
};

const solvePuzzleWithSteps = (grid) => {
  if (!hasValidGridShape(grid) || !isValidGrid(grid)) {
    return null;
  }

  const board = cloneBoard(grid);
  const steps = [];

  if (!solveBoard(board, steps)) {
    return null;
  }

  return { solved: board, steps };
};

const parseUncertaintyEntry = ([cellIndex, value]) => {
  const parsedIndex = Number.parseInt(cellIndex, 10);
  const parsedValue = Number(value);

  if (
    Number.isNaN(parsedIndex) ||
    parsedIndex < 0 ||
    parsedIndex >= BOARD_SIZE * BOARD_SIZE ||
    !Number.isInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > BOARD_SIZE
  ) {
    return null;
  }

  return {
    row: Math.floor(parsedIndex / BOARD_SIZE),
    col: parsedIndex % BOARD_SIZE,
    value: parsedValue,
  };
};

const solvePuzzleWithUncertainties = (grid, uncertainties = {}) => {
  if (!hasValidGridShape(grid)) {
    return null;
  }

  if (isValidGrid(grid)) {
    const solved = solvePuzzle(grid);
    return solved ? { solved, correction: null } : null;
  }

  for (const entry of Object.entries(uncertainties)) {
    const parsed = parseUncertaintyEntry(entry);
    if (!parsed) continue;

    const { row, col, value } = parsed;
    const candidateBoard = cloneBoard(grid);
    const previousValue = candidateBoard[row][col];
    candidateBoard[row][col] = value;

    if (!isValidGrid(candidateBoard)) {
      continue;
    }

    const solved = solvePuzzle(candidateBoard);
    if (solved) {
      return {
        solved,
        correction: {
          row,
          col,
          from: previousValue,
          to: value,
        },
      };
    }
  }

  return null;
};

const estimateDifficulty = (grid) => {
  if (!hasValidGridShape(grid)) {
    return null;
  }

  let givens = 0;
  grid.forEach((row) =>
    row.forEach((cell) => {
      if (cell !== 0) {
        givens += 1;
      }
    }),
  );

  if (givens < 23) return "Expert";
  if (givens < 30) return "Hard";
  if (givens > 45) return "Easy";
  return "Medium";
};

const randomIndex = (max, randomFn) => Math.floor(randomFn() * max);

const swapRowsInBand = (board, band, randomFn) => {
  const bandStart = band * BOX_SIZE;
  const first = bandStart + randomIndex(BOX_SIZE, randomFn);
  const second = bandStart + randomIndex(BOX_SIZE, randomFn);
  [board[first], board[second]] = [board[second], board[first]];
};

const swapColumnsInStack = (board, stack, randomFn) => {
  const stackStart = stack * BOX_SIZE;
  const first = stackStart + randomIndex(BOX_SIZE, randomFn);
  const second = stackStart + randomIndex(BOX_SIZE, randomFn);

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    [board[row][first], board[row][second]] = [
      board[row][second],
      board[row][first],
    ];
  }
};

const generatePuzzle = (difficulty = "medium", randomFn = Math.random) => {
  const normalizedDifficulty = String(difficulty).toLowerCase();
  const holesToPunch = HOLES_BY_DIFFICULTY[normalizedDifficulty] ?? HOLES_BY_DIFFICULTY.medium;
  const board = cloneBoard(BASE_BOARD);

  for (let band = 0; band < BOX_SIZE; band += 1) {
    swapRowsInBand(board, band, randomFn);
    swapColumnsInStack(board, band, randomFn);
  }

  let holes = 0;
  while (holes < holesToPunch) {
    const row = randomIndex(BOARD_SIZE, randomFn);
    const col = randomIndex(BOARD_SIZE, randomFn);

    if (board[row][col] !== 0) {
      board[row][col] = 0;
      holes += 1;
    }
  }

  return board;
};

module.exports = {
  BASE_BOARD,
  estimateDifficulty,
  generatePuzzle,
  getCandidates,
  hasValidGridShape,
  isValidGrid,
  solvePuzzle,
  solvePuzzleWithSteps,
  solvePuzzleWithUncertainties,
};
