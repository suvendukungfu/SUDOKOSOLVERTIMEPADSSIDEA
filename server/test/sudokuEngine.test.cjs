const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BASE_BOARD,
  estimateDifficulty,
  generatePuzzle,
  getCandidates,
  hasValidGridShape,
  isValidGrid,
  solvePuzzle,
  solvePuzzleWithSteps,
  solvePuzzleWithUncertainties,
} = require("../solver/sudokuEngine");

const samplePuzzle = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

const sampleSolution = [
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

test("hasValidGridShape rejects malformed boards", () => {
  assert.equal(hasValidGridShape([[1, 2, 3]]), false);
  assert.equal(hasValidGridShape(samplePuzzle), true);
});

test("isValidGrid detects duplicate digits", () => {
  const invalidGrid = samplePuzzle.map((row) => [...row]);
  invalidGrid[0][1] = 5;

  assert.equal(isValidGrid(invalidGrid), false);
  assert.equal(isValidGrid(samplePuzzle), true);
});

test("getCandidates returns the legal digits for an empty cell", () => {
  const candidates = getCandidates(samplePuzzle, 0, 2).sort();
  assert.deepEqual(candidates, [1, 2, 4]);
});

test("solvePuzzle returns the solved board for a valid puzzle", () => {
  assert.deepEqual(solvePuzzle(samplePuzzle), sampleSolution);
});

test("solvePuzzleWithSteps returns only the committed solution path", () => {
  const result = solvePuzzleWithSteps(samplePuzzle);

  assert.ok(result);
  assert.deepEqual(result.solved, sampleSolution);
  assert.equal(result.steps.length, 51);
  assert.deepEqual(result.steps[0], { row: 4, col: 4, value: 5 });
  assert.deepEqual(result.steps.at(-1), { row: 8, col: 6, value: 1 });
});

test("solvePuzzleWithUncertainties can repair a conflicted OCR guess", () => {
  const conflicted = samplePuzzle.map((row) => [...row]);
  conflicted[0][2] = 5;

  const result = solvePuzzleWithUncertainties(conflicted, { 2: 4 });

  assert.ok(result);
  assert.deepEqual(result.solved, sampleSolution);
  assert.deepEqual(result.correction, { row: 0, col: 2, from: 5, to: 4 });
});

test("estimateDifficulty returns expert for very sparse boards", () => {
  const sparseBoard = BASE_BOARD.map((row, rowIndex) =>
    row.map((value, colIndex) => (rowIndex < 2 && colIndex < 2 ? value : 0)),
  );

  assert.equal(estimateDifficulty(BASE_BOARD), "Easy");
  assert.equal(estimateDifficulty(samplePuzzle), "Medium");
  assert.equal(estimateDifficulty(sparseBoard), "Expert");
});

test("generatePuzzle creates a valid shaped board with the expected hole count", () => {
  let seed = 123456789;
  const pseudoRandom = () => {
    seed = (1664525 * seed + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const puzzle = generatePuzzle("hard", pseudoRandom);
  const zeroCount = puzzle.flat().filter((value) => value === 0).length;

  assert.equal(hasValidGridShape(puzzle), true);
  assert.equal(isValidGrid(puzzle), true);
  assert.equal(zeroCount, 50);
});
