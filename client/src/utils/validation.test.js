import test from "node:test";
import assert from "node:assert/strict";

import { findGridConflicts, isValidMove } from "./validation.js";

const emptyGrid = Array.from({ length: 9 }, () => Array(9).fill(null));

test("isValidMove accepts a legal placement", () => {
  const grid = emptyGrid.map((row) => [...row]);
  grid[0][0] = 5;
  grid[1][1] = 3;

  assert.equal(isValidMove(grid, 0, 1, 4), true);
});

test("isValidMove rejects row, column, and box conflicts", () => {
  const grid = emptyGrid.map((row) => [...row]);
  grid[0][0] = 7;
  grid[0][4] = 5;
  grid[4][0] = 6;
  grid[1][1] = 8;

  assert.equal(isValidMove(grid, 0, 2, 5), false);
  assert.equal(isValidMove(grid, 2, 0, 6), false);
  assert.equal(isValidMove(grid, 2, 2, 8), false);
});

test("findGridConflicts reports each conflicting filled cell", () => {
  const grid = emptyGrid.map((row) => [...row]);
  grid[0][0] = 9;
  grid[0][3] = 9;
  grid[4][4] = 2;
  grid[7][4] = 2;

  const conflicts = findGridConflicts(grid);

  assert.deepEqual(conflicts, [
    [0, 0],
    [0, 3],
    [4, 4],
    [7, 4],
  ]);
});

test("findGridConflicts ignores empty cells represented as null or zero", () => {
  const grid = emptyGrid.map((row) => [...row]);
  grid[0][0] = 4;
  grid[0][1] = 0;
  grid[1][0] = null;

  assert.deepEqual(findGridConflicts(grid), []);
});
