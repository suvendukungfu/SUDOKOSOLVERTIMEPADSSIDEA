"""
Convert the trained Keras model to TensorFlow.js format.
"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from tensorflow.keras.datasets import mnist
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import tensorflowjs as tfjs

print("Rebuilding and retraining model for TF.js conversion...")

# Load data
(x_train, y_train), (x_test, y_test) = mnist.load_data()
x_train = x_train.reshape(-1, 28, 28, 1).astype('float32') / 255.0
x_test = x_test.reshape(-1, 28, 28, 1).astype('float32') / 255.0
x_train = (x_train > 0.3).astype('float32')
x_test = (x_test > 0.3).astype('float32')
y_train_cat = tf.keras.utils.to_categorical(y_train, 10)
y_test_cat = tf.keras.utils.to_categorical(y_test, 10)

# Augmentation
datagen = ImageDataGenerator(
    rotation_range=15, width_shift_range=0.1, height_shift_range=0.1,
    zoom_range=0.15, shear_range=0.1, fill_mode='constant', cval=0.0
)
datagen.fit(x_train)

# Build model
model = models.Sequential([
    layers.Conv2D(32, (3,3), activation='relu', padding='same', input_shape=(28,28,1)),
    layers.BatchNormalization(),
    layers.Conv2D(64, (3,3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.MaxPooling2D((2,2)),
    layers.Dropout(0.25),
    layers.Conv2D(128, (3,3), activation='relu', padding='same'),
    layers.BatchNormalization(),
    layers.Conv2D(256, (3,3), activation='relu', padding='same'),
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

# Train
cb = [
    callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, verbose=1),
    callbacks.EarlyStopping(monitor='val_accuracy', patience=5, restore_best_weights=True, verbose=1),
]

history = model.fit(
    datagen.flow(x_train, y_train_cat, batch_size=128),
    epochs=20,
    validation_data=(x_test, y_test_cat),
    callbacks=cb, verbose=1
)

# Evaluate
test_loss, test_acc = model.evaluate(x_test, y_test_cat, verbose=0)
print(f"\n📊 Overall accuracy: {test_acc*100:.2f}%")

preds = model.predict(x_test, verbose=0).argmax(axis=1)
ones_mask = y_test == 1
ones_as_seven = (preds[ones_mask] == 7).sum()
sevens_mask = y_test == 7
sevens_as_one = (preds[sevens_mask] == 1).sum()
print(f"🎯 1→7 confusion: {ones_as_seven}/{ones_mask.sum()}")
print(f"🎯 7→1 confusion: {sevens_as_one}/{sevens_mask.sum()}")

# Convert to TF.js
tfjs_output = '/Users/suvendusahoo/Desktop/finalsudoku/model-trainer/dist-model'
os.makedirs(tfjs_output, exist_ok=True)
tfjs.converters.save_keras_model(model, tfjs_output)
print(f"\n✅ TF.js model saved to: {tfjs_output}")
for f in sorted(os.listdir(tfjs_output)):
    fpath = os.path.join(tfjs_output, f)
    size = os.path.getsize(fpath)
    print(f"  {f}: {size:,} bytes")
print("🎯 Done!")
