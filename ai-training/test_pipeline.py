import time
import numpy as np
import tensorflow as tf
from tensorflow.keras.datasets import mnist

def run_tests():
    """
    Step 10: Testing scripts.
    Measures digit recognition speed and accuracy over 1000 samples.
    """
    try:
        model = tf.keras.models.load_model('sudoku_model_best.h5')
    except Exception as e:
        print(f"Model missing: {e}")
        return

    # Extract 1000 cells to mock Sudoku grid inference
    _, (x_test, y_test) = mnist.load_data()
    test_cells = x_test[:1000].reshape((-1, 28, 28, 1)).astype('float32') / 255.0
    true_labels = y_test[:1000]

    print(f"Testing Model Inference Speed on 1000 random Digits...\n")
    
    start_time = time.time()
    predictions = model.predict(test_cells, batch_size=81) # Test as if 81 puzzle bounds
    end_time = time.time()

    elapsed = end_time - start_time
    time_per_digit = (elapsed / 1000) * 1000 # convert to ms
    
    y_pred = np.argmax(predictions, axis=1)
    correct = np.sum(y_pred == true_labels)
    acc = correct / 1000.0

    print("--- BENCHMARK RESULTS ---")
    print(f"Total Inference Time: {elapsed:.3f} seconds for 1000 cells.")
    print(f"Avg Time Per Digit:   {time_per_digit:.2f} ms")
    if time_per_digit < 10:
        print("✅ Speed goal met (< 10ms/digit)")
    else:
        print("❌ Speed goal failed (> 10ms/digit)")
        
    print(f"Test Subset Accuracy:    {acc * 100:.2f}%")
    if acc >= 0.995:
        print("✅ Accuracy goal met (>= 99.5%)")
    else:
        print("❌ Accuracy goal failed (< 99.5%)")

if __name__ == '__main__':
    run_tests()
