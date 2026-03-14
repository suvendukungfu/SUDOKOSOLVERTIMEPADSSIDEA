import test from "node:test";
import assert from "node:assert/strict";

import {
  applySolvedCorrectionsToGivens,
  buildRecoveryUncertainties,
  getOneSevenAlternate,
  normalizeUncertaintyMap,
  removeResolvedUncertainties,
} from "./ocrRecovery.js";

const emptyGrid = Array.from({ length: 9 }, () => Array(9).fill(null));

test("getOneSevenAlternate only swaps 1 and 7", () => {
  assert.equal(getOneSevenAlternate(1), 7);
  assert.equal(getOneSevenAlternate(7), 1);
  assert.equal(getOneSevenAlternate(4), null);
});

test("normalizeUncertaintyMap coerces values into candidate arrays", () => {
  assert.deepEqual(normalizeUncertaintyMap({ 0: 7, 1: ["1", 1, 11], foo: [3] }), {
    0: [7],
    1: [1],
  });
});

test("buildRecoveryUncertainties injects 1/7 alternates for conflicting cells", () => {
  const grid = emptyGrid.map((row) => [...row]);
  grid[0][0] = 7;
  grid[0][3] = 7;
  grid[2][2] = 1;

  const uncertainties = buildRecoveryUncertainties(grid, {}, [
    [0, 0],
    [0, 3],
  ]);

  assert.deepEqual(uncertainties[0], [1]);
  assert.deepEqual(uncertainties[3], [1]);
  assert.deepEqual(uncertainties[20], [7]);
});

test("applySolvedCorrectionsToGivens only patches OCR givens, not blanks", () => {
  const grid = emptyGrid.map((row) => [...row]);
  grid[0][0] = 7;
  grid[1][1] = 1;

  const solved = Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => ((row * 3 + col) % 9) + 1),
  );

  const corrected = applySolvedCorrectionsToGivens(grid, solved);

  assert.equal(corrected[0][0], solved[0][0]);
  assert.equal(corrected[1][1], solved[1][1]);
  assert.equal(corrected[2][2], null);
});

test("removeResolvedUncertainties drops corrected entries", () => {
  const remaining = removeResolvedUncertainties(
    { 0: [1], 3: [7], 20: [7] },
    [{ row: 0, col: 3 }],
  );

  assert.deepEqual(remaining, {
    0: [1],
    20: [7],
  });
});
