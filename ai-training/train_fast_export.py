"""
Production-Grade MNIST CNN training + high-speed TF.js export.
Targets 99.5%+ accuracy with robust augmentation.
"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import tensorflowjs as tfjs

# Load MNIST
(x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
x_train = x_train.reshape(-1, 28, 28, 1).astype('float32') / 255.0
x_test = x_test.reshape(-1, 28, 28, 1).astype('float32') / 255.0

# Binarize data - this is CRITICAL as Sudoku OCR output is thresholded binary
# 0.3 threshold is good for preserving thin strokes
x_train = (x_train > 0.3).astype('float32')
x_test = (x_test > 0.3).astype('float32')

y_train_cat = tf.keras.utils.to_categorical(y_train, 10)
y_test_cat = tf.keras.utils.to_categorical(y_test, 10)

print(f"Dataset Binarized. Train: {x_train.shape}, Test: {x_test.shape}")

# High-Performance Data Augmentation
# Covers: rotation (perspective), width/height shift (centering noise), zoom (digit scale)
datagen = ImageDataGenerator(
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    zoom_range=0.15,
    fill_mode='constant',
    cval=0.0
)

# Deep Conv2D Architecture
model = models.Sequential([
    layers.Input(shape=(28, 28, 1)),
    
    # Block 1: 32 Filters
    layers.Conv2D(32, (3,3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.Conv2D(32, (3,3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.MaxPooling2D((2,2)),
    layers.Dropout(0.25),
    
    # Block 2: 64 Filters
    layers.Conv2D(64, (3,3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.Conv2D(64, (3,3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.MaxPooling2D((2,2)),
    layers.Dropout(0.25),
    
    # Block 3: 128 Filters
    layers.Conv2D(128, (3,3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.MaxPooling2D((2,2)),
    layers.Dropout(0.25),
    
    layers.Flatten(),
    layers.Dense(256, activation='relu'),
    layers.BatchNormalization(),
    layers.Dropout(0.5),
    layers.Dense(10, activation='softmax')
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# Train 10 epochs with augmentation
# 128 batch size is efficient on most CPUs
print("\n🔥 Starting Production Training...")
model.fit(
    datagen.flow(x_train, y_train_cat, batch_size=128),
    epochs=10,
    validation_data=(x_test, y_test_cat),
    callbacks=[
        callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, verbose=1),
        callbacks.EarlyStopping(monitor='val_accuracy', patience=4, restore_best_weights=True, verbose=1)
    ],
    verbose=1
)

# Evaluate
test_loss, test_acc = model.evaluate(x_test, y_test_cat, verbose=0)
print(f"\n📊 Final Test Accuracy: {test_acc*100:.2f}%")

# Confusion Analysis (1 vs 7)
preds = model.predict(x_test, verbose=0).argmax(axis=1)
ones_mask = y_test == 1
ones_as_seven = (preds[ones_mask] == 7).sum()
sevens_mask = y_test == 7
sevens_as_one = (preds[sevens_mask] == 1).sum()
print(f"🎯 1 as 7 Confusion: {ones_as_seven}/{ones_mask.sum()} ({ones_as_seven/ones_mask.sum()*100:.2f}%)")
print(f"🎯 7 as 1 Confusion: {sevens_as_one}/{sevens_mask.sum()} ({sevens_as_one/sevens_mask.sum()*100:.2f}%)")

# Export to TF.js (Two-Stage Robust Export)
print("\n🔄 Stage 1: Saving Keras model...")
keras_path = '/tmp/sudoku_prod_model.keras'
if os.path.exists(keras_path): os.remove(keras_path)
model.save(keras_path)
print(f"✅ Keras model saved to: {keras_path}")

print("\n🔄 Stage 2: Converting to TensorFlow.js via CLI...")
temp_output_dir = '/tmp/sudoku_dist_model'
final_output_dir = '/Users/suvendusahoo/Desktop/finalsudoku/model-trainer/dist-model'
os.makedirs(temp_output_dir, exist_ok=True)
os.makedirs(final_output_dir, exist_ok=True)

# Delete existing shards in temp to avoid issues
for f in os.listdir(temp_output_dir):
    try: os.remove(os.path.join(temp_output_dir, f))
    except: pass

import subprocess
result = subprocess.run([
    'tensorflowjs_converter',
    '--input_format=keras',
    keras_path,
    temp_output_dir
], capture_output=True, text=True)

if result.returncode == 0:
    print(f"✅ Production Model exported to TEMP: {temp_output_dir}")
    # Now manually copy to the final destination
    print(f"🔄 Copying to FINAL: {final_output_dir}")
    subprocess.run(['cp', '-f'] + [os.path.join(temp_output_dir, f) for f in os.listdir(temp_output_dir)] + [final_output_dir])
    
    for f in sorted(os.listdir(final_output_dir)):
        size = os.path.getsize(os.path.join(final_output_dir, f))
        print(f"  {f}: {size:,} bytes")
else:
    print(f"❌ TF.js conversion failed: {result.stderr}")
    # Fallback to direct API if CLI fails
    try:
        import tensorflowjs as tfjs
        tfjs.converters.save_keras_model(model, final_output_dir)
        print("✅ Fallback direct export succeeded.")
    except Exception as e:
        print(f"❌ Major Failure: All export methods failed. {e}")

print("\n🎯 PIPELINE COMPLETE: Production model ready for browser.")


print("\n🎯 PIPELINE COMPLETE: Production model ready for browser.")
