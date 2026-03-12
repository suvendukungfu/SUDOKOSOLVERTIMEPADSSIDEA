import * as tf from "@tensorflow/tfjs";

import { loadAIModel } from "./modelLoader";
import { DEMO_BOARD } from "./fallbackDemoBoard";

/**
 * 🚀 Professional OCR Preprocessing Pipeline (1 vs 7 Fix)
 * Implements the 10-step sequence requested by the user.
 */
export const extractDigitFromCell = (cellMat) => {
  const cv = window.cv;
  
  // STEP 1 — Thresholding (Adaptive)
  // Since we receive a grayscale Mat, we apply adaptive thresholding
  const thresh = new cv.Mat();
  cv.adaptiveThreshold(
    cellMat,
    thresh,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY_INV,
    11,
    2
  );

  // STEP 2 — Remove Grid Lines
  // Morphological opening with a small kernel to remove thin lines
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
  const opened = new cv.Mat();
  cv.morphologyEx(thresh, opened, cv.MORPH_OPEN, kernel);

  // STEP 3 — Contour Detection & Filtering
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(opened, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let maxArea = 0;
  let maxRect = null;
  let maxContourIdx = -1;

  for (let i = 0; i < contours.size(); ++i) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);
    if (area > 30) { // Filter by area to ignore small noise
      const rect = cv.boundingRect(contour);
      // Keep only the largest contour, which should correspond to the digit
      if (area > maxArea && rect.width < cellMat.cols * 0.9 && rect.height < cellMat.rows * 0.9) {
        maxArea = area;
        maxRect = rect;
        maxContourIdx = i;
      }
    }
  }

  // If no significant contour found, return null (empty cell)
  if (!maxRect || maxContourIdx === -1) {
    thresh.delete(); kernel.delete(); opened.delete(); 
    contours.delete(); hierarchy.delete();
    return null;
  }

  // STEP 4 — Digit Cropping
  // Isolate only the largest contour on a fresh mask to remove noise near borders
  const mask = new cv.Mat.zeros(cellMat.rows, cellMat.cols, cv.CV_8UC1);
  cv.drawContours(mask, contours, maxContourIdx, new cv.Scalar(255), -1, cv.LINE_8, hierarchy, 0);
  
  // Crop to bounding box
  const digitMat = mask.roi(maxRect);

  // STEP 5 — Center the Digit (Center of Mass Alignment)
  // First, resize the isolated digit to fit within a 20x20 area (standard MNIST practice)
  let scale = 20.0 / Math.max(maxRect.width, maxRect.height);
  const dsize = new cv.Size(Math.round(maxRect.width * scale), Math.round(maxRect.height * scale));
  const resized = new cv.Mat();
  cv.resize(digitMat, resized, dsize, 0, 0, cv.INTER_AREA);

  // Place in a 28x28 canvas
  const canvas = new cv.Mat.zeros(28, 28, cv.CV_8UC1);
  const xOffset = Math.floor((28 - resized.cols) / 2);
  const yOffset = Math.floor((28 - resized.rows) / 2);
  const roiSlot = canvas.roi(new cv.Rect(xOffset, yOffset, resized.cols, resized.rows));
  resized.copyTo(roiSlot);

  // Center of Mass Alignment
  const moments = cv.moments(canvas, false);
  const finalDst = new cv.Mat.zeros(28, 28, cv.CV_8UC1);
  if (moments.m00 > 0) {
    const cx = moments.m10 / moments.m00;
    const cy = moments.m01 / moments.m00;
    const shiftX = 14 - cx;
    const shiftY = 14 - cy;
    const M = cv.matFromArray(2, 3, cv.CV_32F, [1, 0, shiftX, 0, 1, shiftY]);
    cv.warpAffine(canvas, finalDst, M, new cv.Size(28, 28), cv.INTER_CUBIC, cv.BORDER_CONSTANT, new cv.Scalar(0));
    M.delete();
  } else {
    canvas.copyTo(finalDst);
  }

  // STEP 6 — Normalize for CNN [0, 1]
  const imgData = new Float32Array(28 * 28);
  for (let i = 0; i < 28 * 28; i++) {
    imgData[i] = finalDst.data[i] / 255.0;
  }

  // DEBUG Render: Capture the cleaned digit for UI verification
  const scratchCanvas = document.createElement('canvas');
  scratchCanvas.width = 28;
  scratchCanvas.height = 28;
  cv.imshow(scratchCanvas, finalDst);
  const debugImage = scratchCanvas.toDataURL();

  // Cleanup
  thresh.delete(); kernel.delete(); opened.delete(); 
  contours.delete(); hierarchy.delete(); mask.delete();
  digitMat.delete(); resized.delete(); canvas.delete();
  roiSlot.delete(); finalDst.delete();

  return { imgData, debugImage };
};

/**
 * Run TF.js inference on 81 OpenCV Mats using the professional pipeline
 */
export const recognizeDigits = async (cellMats) => {
  const startTime = performance.now();
  const { model, status } = await loadAIModel();
  
  if (status === "demo") {
    cellMats.forEach(mat => mat.delete());
    return { grid: DEMO_BOARD, status };
  }

  const predictions = new Array(81).fill(0);
  const uncertainties = {}; 
  const debugImages = new Array(81).fill(null);
  const tensorsToPredict = [];
  const indices = [];

  // STEP 7 & 9 — Efficient Preprocessing (< 5ms per cell)
  cellMats.forEach((mat, idx) => {
    const result = extractDigitFromCell(mat);
    if (result) {
      tensorsToPredict.push(result.imgData);
      debugImages[idx] = result.debugImage;
      indices.push(idx);
    }
    mat.delete(); // Cleanup raw cell
  });

  if (tensorsToPredict.length > 0 && model) {
    // Create batch tensor
    const flatArray = new Float32Array(tensorsToPredict.length * 28 * 28);
    for (let i = 0; i < tensorsToPredict.length; i++) {
      flatArray.set(tensorsToPredict[i], i * 784);
    }

    const batchTensor = tf.tensor4d(flatArray, [tensorsToPredict.length, 28, 28, 1]);

    // CNN Prediction
    const preds = await model.predict(batchTensor).array();
    
    // STEP 8 — Confidence Handling
    preds.forEach((probs, i) => {
      const indexedProbs = probs.map((p, idx) => ({ p, idx }));
      indexedProbs.sort((a, b) => b.p - a.p);
      
      const best = indexedProbs[0];
      const cellIdx = indices[i];

      // Confidence threshold (STEP 8)
      if (best.p >= 0.6) {
        predictions[cellIdx] = best.idx;
      } else {
        // Mark as uncertain
        predictions[cellIdx] = 0;
        uncertainties[cellIdx] = best.idx; // Store what we *think* it is for AI Debug View
      }
    });

    tf.dispose(batchTensor);
  }

  // Format into 9x9 grid
  const grid = [];
  for (let i = 0; i < 9; i++) {
    grid.push(predictions.slice(i * 9, i * 9 + 9));
  }

  const endTime = performance.now();
  console.log(`Professional OCR Pipeline took ${Math.round(endTime - startTime)}ms total.`);

  return { grid, uncertainties, debugImages, status };
};
