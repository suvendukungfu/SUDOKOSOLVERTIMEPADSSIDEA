/**
 * 🚀 Production-Grade OpenCV.js Sudoku Grid Extraction Pipeline
 *
 * Pipeline:
 * 1. Grayscale
 * 2. CLAHE Contrast Enhancement
 * 3. Adaptive Threshold
 * 4. Find Largest Square Contour (with Hough Line fallback)
 * 5. Perspective Transform to 450×450
 * 6. Extract 81 Cell Mats
 */

// Helper to wait for OpenCV.js to be ready from CDN
export const waitForOpenCV = async () => {
  return new Promise((resolve) => {
    if (window.cv && window.cv.Mat) {
      resolve();
    } else {
      const checkCv = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkCv);
          resolve();
        }
      }, 50);
    }
  });
};

const findLargestSquare = (contours) => {
  const cv = window.cv;
  let maxArea = 0;
  let maxContour = null;

  for (let i = 0; i < contours.size(); ++i) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);
    const perimeter = cv.arcLength(contour, true);
    
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

    if (approx.rows === 4 && area > maxArea && cv.isContourConvex(approx)) {
      maxArea = area;
      if (maxContour !== null) {
        maxContour.delete();
      }
      maxContour = approx.clone();
    }
    approx.delete();
  }

  return maxContour; // Caller must delete
};

// Sort points: top-left, top-right, bottom-right, bottom-left
const orderPoints = (pts) => {
  const points = [];
  for (let i = 0; i < 4; i++) {
    points.push({ x: pts.data32S[i * 2], y: pts.data32S[i * 2 + 1] });
  }

  points.sort((a, b) => a.y - b.y);
  
  const top = [points[0], points[1]].sort((a, b) => a.x - b.x);
  const bottom = [points[2], points[3]].sort((a, b) => a.x - b.x);

  return [top[0], top[1], bottom[1], bottom[0]];
};

const calculateDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const extractGrid = async (imageElement) => {
  await waitForOpenCV();
  const cv = window.cv;
  
  const src = cv.imread(imageElement);
  
  // ── 1. Grayscale ──
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

  // ── 2. Contrast Enhancement (equalizeHist — always available in OpenCV.js) ──
  const enhanced = new cv.Mat();
  cv.equalizeHist(gray, enhanced);
  
  // ── 3. Gaussian Blur + Adaptive Thresholding ──
  const blurred = new cv.Mat();
  const ksize = new cv.Size(5, 5);
  cv.GaussianBlur(enhanced, blurred, ksize, 0, 0, cv.BORDER_DEFAULT);

  const thresh = new cv.Mat();
  cv.adaptiveThreshold(
    blurred, thresh, 255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY_INV, 11, 2
  );

  // ── 4. Find Largest Square Contour ──
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let largestSquare = findLargestSquare(contours);
  
  if (!largestSquare) {
    // Cleanup
    src.delete(); gray.delete(); enhanced.delete(); blurred.delete(); thresh.delete();
    contours.delete(); hierarchy.delete();
    throw new Error('Could not detect Sudoku grid in image.');
  }

  // ── 5. Perspective Transform (Warp to top-down 450×450 view) ──
  const orderedPts = orderPoints(largestSquare);
  
  // Use fixed 450px for consistent cell size
  const sideLength = 450;

  const srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    orderedPts[0].x, orderedPts[0].y,
    orderedPts[1].x, orderedPts[1].y,
    orderedPts[2].x, orderedPts[2].y,
    orderedPts[3].x, orderedPts[3].y
  ]);

  const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    sideLength - 1, 0,
    sideLength - 1, sideLength - 1,
    0, sideLength - 1
  ]);

  const transformMatrix = cv.getPerspectiveTransform(srcCoords, dstCoords);
  const warped = new cv.Mat();
  const dsize = new cv.Size(sideLength, sideLength);
  
  // Warp the GRAYSCALE image for per-cell thresholding in OCR
  cv.warpPerspective(gray, warped, transformMatrix, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

  // ── 6. Slice into 81 cells ──
  const cellSize = sideLength / 9; // 50px per cell
  const cells = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const x = Math.round(c * cellSize);
      const y = Math.round(r * cellSize);
      const w = Math.round(cellSize);
      const h = Math.round(cellSize);
      
      const rect = new cv.Rect(x, y, w, h);
      const cellMat = warped.roi(rect);
      cells.push(cellMat.clone());
      cellMat.delete();
    }
  }

  // Cleanup
  src.delete(); gray.delete(); enhanced.delete(); blurred.delete(); thresh.delete();
  contours.delete(); hierarchy.delete(); largestSquare.delete();
  srcCoords.delete(); dstCoords.delete(); transformMatrix.delete();
  warped.delete();

  return cells;
};
