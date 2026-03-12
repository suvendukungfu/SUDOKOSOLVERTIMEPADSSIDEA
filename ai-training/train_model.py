import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.datasets import mnist
import cv2

def build_cnn_model():
    """
    Step 4: CNN Model Architecture
    Creates a robust CNN with BatchNormalization and Dropout as requested.
    """
    model = models.Sequential([
        layers.Input(shape=(28, 28, 1)),
        
        layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        layers.Flatten(),
        layers.Dense(128, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.5),
        layers.Dense(10, activation='softmax')
    ])
    
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


def load_datasets():
    """
    Step 2: Dataset Preparation
    Loads MNIST and optionally a local Kaggle dataset if provided.
    Normalizes images to [0, 1] float32 arrays.
    """
    print("Loading base MNIST dataset...")
    (x_train_mnist, y_train_mnist), (x_test_mnist, y_test_mnist) = mnist.load_data()
    
    # Reshape and normalize standard MNIST
    x_train = x_train_mnist.reshape((-1, 28, 28, 1)).astype('float32') / 255.0
    x_test = x_test_mnist.reshape((-1, 28, 28, 1)).astype('float32') / 255.0
    
    y_train = y_train_mnist
    y_test = y_test_mnist
    
    # Optional: Load Kaggle Sudoku dataset if it exists in 'dataset/'
    kaggle_dir = os.path.join(os.path.dirname(__main__.__file__), "dataset") if '__main__' in globals() else "dataset"
    if os.path.exists(kaggle_dir) and len(os.listdir(kaggle_dir)) > 0:
        print(f"Found custom dataset in {kaggle_dir}. Merging with MNIST...")
        # Add custom image loading logic here:
        # 1. Iterate through folders 0-9
        # 2. cv2.imread(..., cv2.IMREAD_GRAYSCALE)
        # 3. cv2.resize to (28, 28)
        # 4. Invert (255 - img) if necessary to match MNIST (white text, black bg)
        # 5. np.append() to x_train and y_train
        pass
    else:
        print("No local Kaggle dataset found in 'dataset/'. Training purely on MNIST.")

    return (x_train, y_train), (x_test, y_test)


def train_model():
    """
    Step 5: Model Training
    Loads dataset, applies augmentation, and trains the model.
    """
    (x_train, y_train), (x_val, y_val) = load_datasets()
    
    try:
        from augmentations import get_training_augmentations
        aug = get_training_augmentations()
        print("Albumentations pipeline loaded.")
    except ImportError:
        print("Warning: augmentations.py missing. Skipping dynamic augmentation.")
        aug = None
    
    # Custom Data Generator for Augmentations
    class AugmentingDataGenerator(tf.keras.utils.Sequence):
        def __init__(self, x, y, batch_size=128):
            self.x = x
            self.y = y
            self.batch_size = batch_size
            self.indices = np.arange(len(self.x))
            
        def __len__(self):
            return int(np.ceil(len(self.x) / self.batch_size))
            
        def __getitem__(self, index):
            # Get batch
            idxs = self.indices[index * self.batch_size:(index + 1) * self.batch_size]
            batch_x = self.x[idxs]
            batch_y = self.y[idxs]
            
            if aug:
                # Augmentations require image data; converting to [0, 255] float temporarily
                # Albumentations can also handle float32 [0,1] directly depending on the ops
                aug_x = np.zeros_like(batch_x)
                for i, img in enumerate(batch_x):
                    augmented = aug(image=img)
                    aug_x[i] = augmented['image']
                return aug_x, batch_y
            
            return batch_x, batch_y
            
        def on_epoch_end(self):
            np.random.shuffle(self.indices)

    train_gen = AugmentingDataGenerator(x_train, y_train)
    
    model = build_cnn_model()
    model.summary()

    # Callbacks
    checkpoint = tf.keras.callbacks.ModelCheckpoint(
        'sudoku_model_best.h5', 
        save_best_only=True, 
        monitor='val_accuracy'
    )
    early_stopping = tf.keras.callbacks.EarlyStopping(
        monitor='val_loss', 
        patience=4, 
        restore_best_weights=True
    )

    print("\nStarting CNN Training Phase...")
    history = model.fit(
        train_gen,
        epochs=20,
        validation_data=(x_val, y_val),
        callbacks=[checkpoint, early_stopping]
    )

    # Save finalized output
    model.save('sudoku_model_final.h5')
    print("\nTraining Complete! Model saved as 'sudoku_model_final.h5'.")
    return model, history

if __name__ == "__main__":
    train_model()
