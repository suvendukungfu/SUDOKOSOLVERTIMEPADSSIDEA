import json
import numpy as np
import os

model_json = {
  "format": "layers-model",
  "generatedBy": "keras",
  "convertedBy": "TensorFlow.js Converter",
  "modelTopology": {
    "keras_version": "2.15.0",
    "backend": "tensorflow",
    "model_config": {
      "class_name": "Sequential",
      "config": {
        "name": "sequential",
        "layers": [
          {"class_name": "InputLayer", "config": {"batch_input_shape": [None, 28, 28, 1], "dtype": "float32", "sparse": False, "ragged": False, "name": "input_1"}},
          {"class_name": "Flatten", "config": {"name": "flatten", "trainable": True, "dtype": "float32", "data_format": "channels_last"}},
          {"class_name": "Dense", "config": {"name": "dense", "trainable": True, "dtype": "float32", "units": 10, "activation": "softmax", "use_bias": True, "kernel_initializer": {"class_name": "GlorotUniform", "config": {"seed": None}}, "bias_initializer": {"class_name": "Zeros", "config": {}}, "kernel_regularizer": None, "bias_regularizer": None, "activity_regularizer": None, "kernel_constraint": None, "bias_constraint": None}}
        ]
      }
    }
  },
  "weightsManifest": [
    {
      "paths": ["group1-shard1of1.bin"],
      "weights": [
        {"name": "dense/kernel", "shape": [784, 10], "dtype": "float32"},
        {"name": "dense/bias", "shape": [10], "dtype": "float32"}
      ]
    }
  ]
}

# Ensure directory exists in the react client
output_dir = "models/mock-cnn"
os.makedirs(output_dir, exist_ok=True)

# Save topology
with open(os.path.join(output_dir, "model.json"), "w") as f:
    json.dump(model_json, f, indent=2)

# Generate uniform distribution random weights for dense layers (784*10 + 10)
# These act as the fake predictions outputs (0-9)
weights = np.random.uniform(low=-1.0, high=1.0, size=(784 * 10 + 10)).astype(np.float32)

# Save explicitly as .bin shards
with open(os.path.join(output_dir, "group1-shard1of1.bin"), "wb") as f:
    f.write(weights.tobytes())

print(f"✅ Fast Lightweight mock model generated directly to: {output_dir}")
