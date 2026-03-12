import os
import subprocess

def export_to_tfjs(h5_model_path="sudoku_model_final.h5", output_dir="models/sudoku-cnn"):
    """
    Step 7: Convert Keras model to TensorFlow.js format
    Requires: pip install tensorflowjs
    """
    if not os.path.exists(h5_model_path):
        print(f"Error: {h5_model_path} not found. Run `python train_model.py` first.")
        return
        
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Step 7: Exporting {h5_model_path} to TFJS...")
    
    # tensorflowjs_converter syntax
    command = [
        "tensorflowjs_converter",
        "--input_format=keras",
        h5_model_path,
        output_dir
    ]
    
    # Run conversion
    result = subprocess.run(command, capture_output=True, text=True)
    
    if result.returncode == 0:
        print("\nExport successful!")
        print(f"Files saved in React project: {output_dir}")
        print(" - model.json")
        print(" - group1-shard1of1.bin (or multiple shards)")
    else:
        print("\nExport failed. Error output:")
        print(result.stderr)

if __name__ == "__main__":
    export_to_tfjs()
