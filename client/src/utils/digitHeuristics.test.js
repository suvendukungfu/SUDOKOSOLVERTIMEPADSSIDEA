import test from "node:test";
import assert from "node:assert/strict";

import { analyzeOneSevenShape, resolveDigitPrediction } from "./digitHeuristics.js";

const createBlankDigit = () => new Float32Array(28 * 28);

const setPixel = (img, x, y, value = 1) => {
  if (x < 0 || x >= 28 || y < 0 || y >= 28) return;
  img[y * 28 + x] = value;
};

const drawVertical = (img, x, yStart, yEnd, thickness = 1) => {
  for (let y = yStart; y <= yEnd; y += 1) {
    for (let dx = -Math.floor(thickness / 2); dx <= Math.floor(thickness / 2); dx += 1) {
      setPixel(img, x + dx, y);
    }
  }
};

const drawHorizontal = (img, y, xStart, xEnd, thickness = 1) => {
  for (let x = xStart; x <= xEnd; x += 1) {
    for (let dy = -Math.floor(thickness / 2); dy <= Math.floor(thickness / 2); dy += 1) {
      setPixel(img, x, y + dy);
    }
  }
};

const drawDiagonal = (img, xStart, yStart, xEnd, yEnd, thickness = 1) => {
  const steps = Math.max(Math.abs(xEnd - xStart), Math.abs(yEnd - yStart));
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(xStart + ((xEnd - xStart) * step) / steps);
    const y = Math.round(yStart + ((yEnd - yStart) * step) / steps);
    for (let dx = -Math.floor(thickness / 2); dx <= Math.floor(thickness / 2); dx += 1) {
      for (let dy = -Math.floor(thickness / 2); dy <= Math.floor(thickness / 2); dy += 1) {
        setPixel(img, x + dx, y + dy);
      }
    }
  }
};

const buildSyntheticOne = () => {
  const img = createBlankDigit();
  drawHorizontal(img, 5, 11, 16, 2);
  drawVertical(img, 14, 5, 23, 3);
  return img;
};

const buildSyntheticSeven = () => {
  const img = createBlankDigit();
  drawHorizontal(img, 5, 6, 22, 3);
  drawDiagonal(img, 21, 7, 10, 23, 3);
  return img;
};

test("analyzeOneSevenShape favors 1 for narrow vertical digits", () => {
  const result = analyzeOneSevenShape(buildSyntheticOne());
  assert.equal(result.prediction, 1);
  assert.ok(result.confidence >= 0.6);
});

test("analyzeOneSevenShape favors 7 for top-bar diagonal digits", () => {
  const result = analyzeOneSevenShape(buildSyntheticSeven());
  assert.equal(result.prediction, 7);
  assert.ok(result.confidence >= 0.7);
});

test("resolveDigitPrediction uses shape hint to flip close 1/7 predictions", () => {
  const result = resolveDigitPrediction(
    [0.02, 0.45, 0.01, 0.01, 0.01, 0.01, 0.01, 0.39, 0.05, 0.04],
    buildSyntheticSeven(),
  );

  assert.equal(result.prediction, 7);
  assert.deepEqual(result.alternatives, [1]);
});

test("resolveDigitPrediction preserves 1 when the shape agrees with the model", () => {
  const result = resolveDigitPrediction(
    [0.02, 0.51, 0.01, 0.01, 0.01, 0.01, 0.01, 0.32, 0.06, 0.04],
    buildSyntheticOne(),
  );

  assert.equal(result.prediction, 1);
  assert.deepEqual(result.alternatives, [7]);
});
