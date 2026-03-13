"""
🚀 Production-Grade Sudoku Digit Recognition Training Pipeline
==============================================================
Senior CV Engineer Implementation

Architecture: Conv2D(32) → Conv2D(64) → MaxPool → Dropout →
              Conv2D(128) → Conv2D(256) → MaxPool → Dropout →
              Flatten → Dense(256) → Dense(10, softmax)

Training Data: MNIST (60K) + Heavy Augmentation
Target: 99.8%+ digit recognition accuracy

Outputs: TensorFlow.js model for browser deployment
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from tensorflow.keras.datasets import mnist
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import json
import struct

print("=" * 60)
print("🚀 Production Sudoku AI — Training Pipeline")
print("=" * 60)
print(f"TensorFlow: {tf.__version__}")
print(f"GPU Available: {len(tf.config.list_physical_devices('GPU')) > 0}")

# ── 1. Load MNIST Dataset ──
print("\n📥 Loading MNIST dataset...")
(x_train, y_train), (x_test, y_test) = mnist.load_data()
print(f"  Train: {x_train.shape}, Test: {x_test.shape}")

# ── 2. Preprocessing ──
# Reshape to [N, 28, 28, 1] and normalize to [0, 1]
x_train = x_train.reshape(-1, 28, 28, 1).astype('float32') / 255.0
x_test = x_test.reshape(-1, 28, 28, 1).astype('float32') / 255.0

# Binarize to match OCR pipeline output (adaptive thresholding produces 0/255)
x_train = (x_train > 0.3).astype('float32')
x_test = (x_test > 0.3).astype('float32')

# One-hot encode labels
y_train_cat = tf.keras.utils.to_categorical(y_train, 10)
y_test_cat = tf.keras.utils.to_categorical(y_test, 10)

print(f"  Preprocessed: train={x_train.shape}, test={x_test.shape}")
print(f"  Pixel range: [{x_train.min()}, {x_train.max()}]")

# ── 3. Data Augmentation (requirement 8️⃣) ──
print("\n🔄 Setting up heavy augmentation pipeline...")
datagen = ImageDataGenerator(
    rotation_range=15,           # ±15° rotation
    width_shift_range=0.1,       # ±10% horizontal shift
    height_shift_range=0.1,      # ±10% vertical shift
    zoom_range=0.15,             # ±15% zoom
    shear_range=0.1,             # Shear
    fill_mode='constant',
    cval=0.0                     # Black fill for shifted pixels
)
datagen.fit(x_train)

# ── 4. Model Architecture (requirement 6️⃣ + 7️⃣) ──
print("\n🏗️  Building production CNN architecture...")

model = models.Sequential([
    # Block 1: 32 filters
    layers.Conv2D(32, (3, 3), activation='relu', padding='same',
                  input_shape=(28, 28, 1)),
    layers.BatchNormalization(),
    
    # Block 2: 64 filters
    layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.MaxPooling2D((2, 2)),
    layers.Dropout(0.25),
    
    # Block 3: 128 filters
    layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    
    # Block 4: 256 filters
    layers.Conv2D(256, (3, 3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.MaxPooling2D((2, 2)),
    layers.Dropout(0.25),
    
    # Classifier head
    layers.Flatten(),
    layers.Dense(256, activation='relu'),
    layers.BatchNormalization(),
    layers.Dropout(0.5),
    layers.Dense(10, activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

# ── 5. Training Callbacks ──
cb = [
    callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, verbose=1),
    callbacks.EarlyStopping(monitor='val_accuracy', patience=5, restore_best_weights=True, verbose=1),
]

# ── 6. Train ──
print("\n🔥 Training with augmented MNIST data...")
print("   This trains on REAL handwritten digits, not synthetic fonts.\n")

history = model.fit(
    datagen.flow(x_train, y_train_cat, batch_size=128),
    epochs=30,
    validation_data=(x_test, y_test_cat),
    callbacks=cb,
    verbose=1
)

# ── 7. Evaluation ──
print("\n📊 Evaluation Results:")
test_loss, test_acc = model.evaluate(x_test, y_test_cat, verbose=0)
print(f"  Overall accuracy: {test_acc*100:.2f}%")

# Per-digit accuracy
preds = model.predict(x_test, verbose=0).argmax(axis=1)
for d in range(10):
    mask = y_test == d
    digit_acc = (preds[mask] == d).mean() * 100
    digit_count = mask.sum()
    print(f"  Digit {d}: {digit_acc:.1f}%  ({digit_count} samples)")

# Specific 1 vs 7 confusion
ones_mask = y_test == 1
ones_as_seven = (preds[ones_mask] == 7).sum()
sevens_mask = y_test == 7
sevens_as_one = (preds[sevens_mask] == 1).sum()
print(f"\n  🎯 1→7 confusion: {ones_as_seven}/{ones_mask.sum()} ({ones_as_seven/ones_mask.sum()*100:.2f}%)")
print(f"  🎯 7→1 confusion: {sevens_as_one}/{sevens_mask.sum()} ({sevens_as_one/sevens_mask.sum()*100:.2f}%)")

# ── 8. Convert directly to TensorFlow.js ──
print("\n🔄 Converting to TensorFlow.js format...")
tfjs_output = '/Users/suvendusahoo/Desktop/finalsudoku/model-trainer/dist-model'
os.makedirs(tfjs_output, exist_ok=True)

import tensorflowjs as tfjs
tfjs.converters.save_keras_model(model, tfjs_output)
print(f"✅ TF.js model saved to: {tfjs_output}")
for f in sorted(os.listdir(tfjs_output)):
    fpath = os.path.join(tfjs_output, f)
    size = os.path.getsize(fpath)
    print(f"  {f}: {size:,} bytes")

print("\n" + "=" * 60)
print("🎯 Training Complete!")
print("=" * 60)
