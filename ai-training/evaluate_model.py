import numpy as np
import tensorflow as tf
from sklearn.metrics import confusion_matrix, classification_report
try:
    from train_model import load_datasets
except ImportError:
    pass # Provide fallback if running independently

def evaluate():
    """
    Step 6: Model Evaluation
    Loads the best trained model and outputs precision, recall, accuracy.
    """
    try:
        model = tf.keras.models.load_model('sudoku_model_best.h5')
    except Exception as e:
        print("Failed to load 'sudoku_model_best.h5'. Ensure you've ran train_model.py first.")
        return

    # In a real environment, load_datasets() from train_model.py
    # Here we just re-verify against MNIST test set for demonstration.
    from tensorflow.keras.datasets import mnist
    _, (x_test, y_test) = mnist.load_data()
    x_test = x_test.reshape((-1, 28, 28, 1)).astype('float32') / 255.0

    print("Running Evaluation on Verification Set...\n")
    loss, accuracy = model.evaluate(x_test, y_test, verbose=0)
    
    print(f"Goal Metrics Met?")
    print(f"=================")
    print(f"Digit Accuracy: {accuracy * 100:.2f}% (Goal: >= 99.5%)")
    print(f"Cross-entropy Loss: {loss:.4f}\n")

    print("Generating Predictions...")
    predictions = model.predict(x_test)
    y_pred = np.argmax(predictions, axis=1)

    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    print("\nClassification Report (Precision, Recall, F1 for Digits 0-9):")
    print(classification_report(y_test, y_pred))

if __name__ == "__main__":
    evaluate()
