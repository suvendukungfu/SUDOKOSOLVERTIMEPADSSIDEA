import * as tf from "@tensorflow/tfjs";

let cachedModel = null;
let cachedStatus = null; // 'local' | 'remote' | 'demo'

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5001";
const PRODUCTION_MODEL_URL =
  import.meta.env.VITE_MODEL_URL || `${API_BASE_URL}/models/sudoku-cnn/model.json`;
const MOCK_MODEL_URL =
  import.meta.env.VITE_MOCK_MODEL_URL || `${API_BASE_URL}/models/mock-cnn/model.json`;

export const loadAIModel = async () => {
  if (cachedModel && cachedStatus) {
    return { model: cachedModel, status: cachedStatus };
  }
  if (cachedStatus === "demo") {
    // we already know it failed
    return { model: null, status: "demo" };
  }

  try {
    // 5️⃣ TensorFlow Backend Setup
    await tf.setBackend("webgl");
    await tf.ready();
    console.log("TensorFlow.js WebGL backend initialized.");
  } catch (err) {
    console.warn("Could not set WebGL backend, falling back to default.", err);
  }

  // 1. Try Local Model
  try {
    cachedModel = await tf.loadLayersModel(PRODUCTION_MODEL_URL);
    cachedStatus = "local";
    console.log(`AI model loaded successfully from ${PRODUCTION_MODEL_URL}.`);
    return { model: cachedModel, status: cachedStatus };
  } catch (err) {
    console.warn("Production model failed to load, trying mock model...", err.message);
  }

  // 2. Try Mock Model (if training bypassed)
  try {
    cachedModel = await tf.loadLayersModel(MOCK_MODEL_URL);
    cachedStatus = "demo";
    console.log(`Mock AI model loaded successfully from ${MOCK_MODEL_URL}.`);
    return { model: cachedModel, status: cachedStatus };
  } catch (err) {
    console.warn("Mock model failed to load. Activating fallback demo mode.", err.message);
  }

  // 3. Fallback Demo Mode
  cachedStatus = "demo";
  console.warn("AI model unavailable – running in demo mode.");
  return { model: null, status: "demo" };
};
