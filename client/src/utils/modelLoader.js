import * as tf from "@tensorflow/tfjs";

let cachedModel = null;
let cachedStatus = null; // 'local' | 'remote' | 'demo'

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
    cachedModel = await tf.loadLayersModel("/models/sudoku-cnn/model.json");
    cachedStatus = "local";
    console.log("Local AI model loaded successfully.");
    return { model: cachedModel, status: cachedStatus };
  } catch (err) {
    console.warn("Local model failed to load, trying remote model...", err.message);
  }

  // 2. Try Mock Model (if training bypassed)
  try {
    cachedModel = await tf.loadLayersModel("/models/mock-cnn/model.json");
    cachedStatus = "demo";
    console.log("Mock AI model loaded successfully.");
    return { model: cachedModel, status: cachedStatus };
  } catch (err) {
    console.warn("Mock model failed to load. Activating fallback demo mode.", err.message);
  }

  // 3. Fallback Demo Mode
  cachedStatus = "demo";
  console.warn("AI model unavailable – running in demo mode.");
  return { model: null, status: "demo" };
};
