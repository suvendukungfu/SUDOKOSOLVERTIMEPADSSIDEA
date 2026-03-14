import { getTensorFlow, loadAIModel } from "./modelLoader";
import { DEMO_BOARD } from "./fallbackDemoBoard";

/**
 * 🚀 Professional OCR Pipeline v3
 * Implements all 8 improvements for robust 1 vs 7 recognition:
 * 1️⃣ Connected Component digit extraction
 * 2️⃣ Bounding box centering
 * 3️⃣ Stroke thickness preservation (no morphological ops)
 * 4️⃣ Pixel normalization [0,1], shape [28,28,1]
 * 7️⃣ Confidence filtering (< 0.6 → empty)
 * 8️⃣ Debug visualization
 */

export const extractDigitFromCell = (cellMat) => {
  const cv = window.cv;
  const h = cellMat.rows, w = cellMat.cols;

  // ── STEP 1: Adaptive Thresholding ──
  // No morphological ops — preserves stroke thickness (requirement 3️⃣)
  const thresh = new cv.Mat();
  cv.adaptiveThreshold(
    cellMat, thresh, 255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY_INV, 11, 2
  );

  // ── STEP 2: Remove border pixels (grid lines) ──
  // Zero out ~10% border to kill grid-line fragments
  const border = Math.max(3, Math.floor(Math.min(h, w) * 0.1));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y < border || y >= h - border || x < border || x >= w - border) {
        thresh.ucharPtr(y, x)[0] = 0;
      }
    }
  }

  // ── STEP 3: Connected Components (requirement 1️⃣) ──
  // Find the LARGEST connected component = the digit
  const labels = new cv.Mat();
  const stats = new cv.Mat();
  const centroids = new cv.Mat();
  const numLabels = cv.connectedComponentsWithStats(thresh, labels, stats, centroids);

  // Find largest component (skip label 0 = background)
  let bestLabel = -1;
  let bestArea = 0;
  for (let label = 1; label < numLabels; label++) {
    const area = stats.intAt(label, cv.CC_STAT_AREA);
    const compW = stats.intAt(label, cv.CC_STAT_WIDTH);
    const compH = stats.intAt(label, cv.CC_STAT_HEIGHT);
    
    // Filter: not too small (noise), not too big (border artifacts)
    if (area > 20 && compW < w * 0.85 && compH < h * 0.85 && area > bestArea) {
      bestArea = area;
      bestLabel = label;
    }
  }

  if (bestLabel === -1) {
    thresh.delete(); labels.delete(); stats.delete(); centroids.delete();
    return null; // Empty cell
  }

  // Create a clean mask with ONLY the largest component
  const digitMask = new cv.Mat.zeros(h, w, cv.CV_8UC1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (labels.intAt(y, x) === bestLabel) {
        // Copy ORIGINAL thresholded pixel value (preserves stroke, requirement 3️⃣)
        digitMask.ucharPtr(y, x)[0] = thresh.ucharPtr(y, x)[0];
      }
    }
  }

  // ── STEP 4: Bounding Box Centering (requirement 2️⃣) ──
  // Use stats from connected components for the exact bounding box
  const bx = stats.intAt(bestLabel, cv.CC_STAT_LEFT);
  const by = stats.intAt(bestLabel, cv.CC_STAT_TOP);
  const bw = stats.intAt(bestLabel, cv.CC_STAT_WIDTH);
  const bh = stats.intAt(bestLabel, cv.CC_STAT_HEIGHT);

  // Crop the digit using its bounding box
  const cropped = digitMask.roi(new cv.Rect(bx, by, bw, bh));

  // Resize to fit in 20x20 (preserving aspect ratio)
  const scaleFactor = 20.0 / Math.max(bw, bh);
  const newW = Math.max(1, Math.round(bw * scaleFactor));
  const newH = Math.max(1, Math.round(bh * scaleFactor));
  const resized = new cv.Mat();
  cv.resize(cropped, resized, new cv.Size(newW, newH), 0, 0, cv.INTER_AREA);

  // Center in 28x28 canvas with padding
  const canvas28 = new cv.Mat.zeros(28, 28, cv.CV_8UC1);
  const xOff = Math.floor((28 - newW) / 2);
  const yOff = Math.floor((28 - newH) / 2);
  const roi = canvas28.roi(new cv.Rect(xOff, yOff, newW, newH));
  resized.copyTo(roi);

  // ── STEP 5: Normalize to [0, 1] (requirement 4️⃣) ──
  const imgData = new Float32Array(28 * 28);
  for (let i = 0; i < 28 * 28; i++) {
    imgData[i] = canvas28.data[i] / 255.0;
  }

  // ── STEP 6: Debug Visualization (requirement 8️⃣) ──
  const scratchCanvas = document.createElement('canvas');
  scratchCanvas.width = 28;
  scratchCanvas.height = 28;
  cv.imshow(scratchCanvas, canvas28);
  const debugImage = scratchCanvas.toDataURL();

  // Cleanup
  thresh.delete(); labels.delete(); stats.delete(); centroids.delete();
  digitMask.delete(); cropped.delete(); resized.delete();
  canvas28.delete(); roi.delete();

  return { imgData, debugImage };
};

/**
 * Run TF.js inference on 81 OpenCV Mats
 */
export const recognizeDigits = async (cellMats) => {
  const startTime = performance.now();
  const tf = await getTensorFlow();
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

  // Preprocess each cell
  cellMats.forEach((mat, idx) => {
    const result = extractDigitFromCell(mat);
    if (result) {
      tensorsToPredict.push(result.imgData);
      debugImages[idx] = result.debugImage;
      indices.push(idx);
    }
    mat.delete();
  });

  if (tensorsToPredict.length > 0 && model) {
    // Create batch tensor — shape [N, 28, 28, 1] (requirement 4️⃣)
    const flatArray = new Float32Array(tensorsToPredict.length * 28 * 28);
    for (let i = 0; i < tensorsToPredict.length; i++) {
      flatArray.set(tensorsToPredict[i], i * 784);
    }

    const batchTensor = tf.tensor4d(flatArray, [tensorsToPredict.length, 28, 28, 1]);
    const preds = await model.predict(batchTensor).array();
    
    // ── Prediction with Debug Logging (requirements 7️⃣ & 8️⃣) ──
    console.log("─── OCR Predictions ───");
    preds.forEach((probs, i) => {
      const indexedProbs = probs.map((p, idx) => ({ p, idx }));
      indexedProbs.sort((a, b) => b.p - a.p);
      
      const best = indexedProbs[0];
      const second = indexedProbs[1];
      const cellIdx = indices[i];
      const r = Math.floor(cellIdx / 9), c = cellIdx % 9;
      
      // Debug log (requirement 8️⃣)
      console.log(`  [${r},${c}] → ${best.idx} (${(best.p*100).toFixed(1)}%)  runner-up: ${second.idx} (${(second.p*100).toFixed(1)}%)`);

      // Confidence filtering (requirement 7️⃣)
      if (best.p >= 0.6) {
        predictions[cellIdx] = best.idx;
      } else {
        predictions[cellIdx] = 0; // Treat as empty
        uncertainties[cellIdx] = best.idx;
        console.log(`    ⚠ LOW CONFIDENCE — treating as empty`);
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
  console.log(`Professional OCR Pipeline v3 took ${Math.round(endTime - startTime)}ms total.`);

  return { grid, uncertainties, debugImages, status };
};
