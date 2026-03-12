/**
 * OpenCV.js Sudoku Grid Extraction Pipeline
 * 
 * 1. Grayscale
 * 2. Adaptive Threshold
 * 3. Find Largest Square Contour
 * 4. Perspective Transform
 * 5. Extract 81 Cell Canvases
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
  
  // 1. Grayscale & Blur
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  
  const blurred = new cv.Mat();
  const ksize = new cv.Size(5, 5);
  cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT);

  // 2. Adaptive Thresholding
  const thresh = new cv.Mat();
  cv.adaptiveThreshold(
    blurred,
    thresh,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY_INV,
    11,
    2
  );

  // 3. Find Contours
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const largestSquare = findLargestSquare(contours);
  
  if (!largestSquare) {
    // Cleanup
    src.delete(); gray.delete(); blurred.delete(); thresh.delete();
    contours.delete(); hierarchy.delete();
    throw new Error('Could not detect Sudoku grid in image.');
  }

  // 4. Perspective Transform (Warp to top-down view)
  const orderedPts = orderPoints(largestSquare);
  
  // Calculate max width/height for warped image
  const widthA = calculateDistance(orderedPts[2], orderedPts[3]);
  const widthB = calculateDistance(orderedPts[1], orderedPts[0]);
  const maxWidth = Math.max(widthA, widthB);

  const heightA = calculateDistance(orderedPts[1], orderedPts[2]);
  const heightB = calculateDistance(orderedPts[0], orderedPts[3]);
  const maxHeight = Math.max(heightA, heightB);

  // Ensure it's a perfect square based on max dimension
  const sideLength = Math.max(maxWidth, maxHeight);

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
  
  // 🚀 CRITICAL: Warp the GRAYSCALE image instead of the thresh image.
  // This allows the OCR pipeline to perform specialized per-cell thresholding.
  cv.warpPerspective(gray, warped, transformMatrix, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

  // 5. Slice into 81 cells
  const cellSize = sideLength / 9;
  const cells = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const x = Math.round(c * cellSize);
      const y = Math.round(r * cellSize);
      const w = Math.round(cellSize);
      const h = Math.round(cellSize);
      
      const rect = new cv.Rect(x, y, w, h);
      const cellMat = warped.roi(rect);
      
      // Clone it so we can delete the warped source later
      cells.push(cellMat.clone());
      
      cellMat.delete();
    }
  }

  // Cleanup OpenCV objects
  src.delete(); gray.delete(); blurred.delete(); thresh.delete();
  contours.delete(); hierarchy.delete(); largestSquare.delete();
  srcCoords.delete(); dstCoords.delete(); transformMatrix.delete();
  warped.delete();

  return cells; // Returns array of cv.Mat (Must be deleted by caller later!)
};

