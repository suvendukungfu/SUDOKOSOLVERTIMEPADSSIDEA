import * as tf from "@tensorflow/tfjs";

let model = null;

// Load the model once
export const loadModel = async () => {
  if (!model) {
    try {
      // Assuming a pre-trained MNIST/Sudoku CNN model exists in public/models
      // NOTE: User must provide this model or we build a dummy fallback handler
      model = await tf.loadLayersModel("/models/sudoku-cnn/model.json");
      console.log("Sudoku CNN loaded successfully.");
    } catch (e) {
      console.warn("Could not load CNN model. Ensure it exists in public/models/sudoku-cnn/model.json.", e);
    }
  }
  return model;
};

// Find the bounding box of the digit inside a cell
const getDigitBoundingBox = (cellMat) => {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(cellMat, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let maxArea = 0;
  let maxRect = null;

  for (let i = 0; i < contours.size(); ++i) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);
    if (area > 15) { // filter tiny noise
      const rect = cv.boundingRect(contour);
      
      // Prevent picking up a huge rectangle that is just the border we missed
      if (area > maxArea && rect.width < cellMat.cols * 0.9 && rect.height < cellMat.rows * 0.9) {
        maxArea = area;
        maxRect = rect;
      }
    }
  }

  contours.delete();
  hierarchy.delete();

  return maxRect;
};

// Preprocess a single cell to 28x28 for MNIST model input
export const preprocessCell = (cellMat) => {
  const rect = getDigitBoundingBox(cellMat);

  // If no bounding box found or very small, assume empty cell (0)
  if (!rect) {
    return null;
  }

  // Crop to digit
  const digitMat = cellMat.roi(rect);

  // Resize and center into a 28x28 image (like MNIST)
  // We want the digit to fit into a 20x20 box inside a 28x28 black image
  let scale = 20.0 / Math.max(rect.width, rect.height);
  const dsize = new cv.Size(Math.round(rect.width * scale), Math.round(rect.height * scale));
  const resized = new cv.Mat();
  cv.resize(digitMat, resized, dsize, 0, 0, cv.INTER_AREA);

  // Create empty 28x28 black image
  const finalDst = new cv.Mat(28, 28, cv.CV_8UC1, new cv.Scalar(0));
  
  // Calculate top left to center it
  const xOffset = Math.floor((28 - resized.cols) / 2);
  const yOffset = Math.floor((28 - resized.rows) / 2);

  const roiRect = new cv.Rect(xOffset, yOffset, resized.cols, resized.rows);
  resized.copyTo(finalDst.roi(roiRect));

  // Extract pixel data and normalize [0, 1]
  const imgData = new Float32Array(28 * 28);
  for (let i = 0; i < 28 * 28; i++) {
    imgData[i] = finalDst.data[i] / 255.0;
  }

  digitMat.delete();
  resized.delete();
  finalDst.delete();

  return imgData; // Float32Array(784)
};

/**
 * Run TF.js inference on 81 OpenCV Mats
 */
export const recognizeDigits = async (cellMats) => {
  await loadModel();
  
  const predictions = new Array(81).fill(0);
  const tensorsToPredict = [];
  const indices = [];

  // Preprocess all cells
  cellMats.forEach((mat, idx) => {
    const cleanImgData = preprocessCell(mat);
    if (cleanImgData) {
      tensorsToPredict.push(cleanImgData);
      indices.push(idx);
    }
    // Delete the mat as we no longer need it
    mat.delete();
  });

  if (tensorsToPredict.length > 0 && model) {
    // Create batch tensor: [batch_size, 28, 28, 1]
    const batchTensor = tf.tensor4d(
      new Float32Array(tensorsToPredict.flat()), 
      [tensorsToPredict.length, 28, 28, 1]
    );

    const preds = await model.predict(batchTensor).array();
    
    // Assign predictions back
    preds.forEach((probs, i) => {
      // Find max probability index (0-9)
      const digit = probs.indexOf(Math.max(...probs));
      // Usually MNIST 0 is class 0. Some models shift it. Assuming standard MNIST.
      // E.g. If class 0 was predicted, it might be an empty spot, or actually a 0
      predictions[indices[i]] = digit;
    });

    tf.dispose(batchTensor);
  }

  // Format into 9x9 grid
  const grid = [];
  for (let i = 0; i < 9; i++) {
    grid.push(predictions.slice(i * 9, i * 9 + 9));
  }

  return grid;
};
