from __future__ import annotations

import tensorflow as tf
from tensorflow.keras import Model, layers


def build_digit_detector(input_shape: tuple[int, int, int] = (28, 28, 1)) -> Model:
    inputs = layers.Input(shape=input_shape)
    x = layers.Conv2D(32, 3, activation="relu", padding="same")(inputs)
    x = layers.Conv2D(64, 3, activation="relu", padding="same")(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Flatten()(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.35)(x)
    outputs = layers.Dense(1, activation="sigmoid")(x)
    model = Model(inputs, outputs, name="digit_detector")
    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
    return model


def build_digit_cnn(input_shape: tuple[int, int, int] = (28, 28, 1), classes: int = 10) -> Model:
    inputs = layers.Input(shape=input_shape)
    x = layers.Conv2D(32, 3, activation="relu", padding="same")(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.Conv2D(64, 3, activation="relu", padding="same")(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(0.25)(x)
    x = layers.Conv2D(128, 3, activation="relu", padding="same")(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Flatten()(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.4)(x)
    outputs = layers.Dense(classes, activation="softmax")(x)
    model = Model(inputs, outputs, name="digit_cnn")
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return model


def _residual_block(x: tf.Tensor, filters: int, stride: int = 1) -> tf.Tensor:
    shortcut = x
    y = layers.Conv2D(filters, 3, strides=stride, padding="same", use_bias=False)(x)
    y = layers.BatchNormalization()(y)
    y = layers.ReLU()(y)
    y = layers.Conv2D(filters, 3, padding="same", use_bias=False)(y)
    y = layers.BatchNormalization()(y)

    if stride != 1 or shortcut.shape[-1] != filters:
        shortcut = layers.Conv2D(filters, 1, strides=stride, padding="same", use_bias=False)(shortcut)
        shortcut = layers.BatchNormalization()(shortcut)

    y = layers.Add()([shortcut, y])
    return layers.ReLU()(y)


def build_resnet18_like(input_shape: tuple[int, int, int] = (28, 28, 1), classes: int = 10) -> Model:
    inputs = layers.Input(shape=input_shape)
    x = layers.Conv2D(32, 3, padding="same", use_bias=False)(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)

    x = _residual_block(x, 32)
    x = _residual_block(x, 32)
    x = _residual_block(x, 64, stride=2)
    x = _residual_block(x, 64)
    x = _residual_block(x, 128, stride=2)
    x = _residual_block(x, 128)
    x = layers.GlobalAveragePooling2D()(x)
    outputs = layers.Dense(classes, activation="softmax")(x)

    model = Model(inputs, outputs, name="digit_resnet18")
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return model


def _transformer_encoder(x: tf.Tensor, projection_dim: int, num_heads: int, mlp_dim: int, dropout: float) -> tf.Tensor:
    x1 = layers.LayerNormalization(epsilon=1e-6)(x)
    attention_output = layers.MultiHeadAttention(
        num_heads=num_heads, key_dim=projection_dim, dropout=dropout
    )(x1, x1)
    x2 = layers.Add()([attention_output, x])
    x3 = layers.LayerNormalization(epsilon=1e-6)(x2)
    x3 = layers.Dense(mlp_dim, activation="gelu")(x3)
    x3 = layers.Dropout(dropout)(x3)
    x3 = layers.Dense(projection_dim)(x3)
    return layers.Add()([x3, x2])


def build_vit_lite(input_shape: tuple[int, int, int] = (28, 28, 1), classes: int = 10) -> Model:
    patch_size = 4
    projection_dim = 64
    num_patches = (input_shape[0] // patch_size) * (input_shape[1] // patch_size)

    inputs = layers.Input(shape=input_shape)
    patches = layers.Conv2D(projection_dim, kernel_size=patch_size, strides=patch_size, padding="valid")(inputs)
    patches = layers.Reshape((num_patches, projection_dim))(patches)

    positions = tf.range(start=0, limit=num_patches, delta=1)
    positional_embedding = layers.Embedding(input_dim=num_patches, output_dim=projection_dim)(positions)
    x = patches + positional_embedding

    x = _transformer_encoder(x, projection_dim, num_heads=4, mlp_dim=128, dropout=0.1)
    x = _transformer_encoder(x, projection_dim, num_heads=4, mlp_dim=128, dropout=0.1)
    x = layers.LayerNormalization(epsilon=1e-6)(x)
    x = layers.Flatten()(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(classes, activation="softmax")(x)

    model = Model(inputs, outputs, name="digit_vit")
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return model


MODEL_BUILDERS = {
    "cnn": build_digit_cnn,
    "resnet18": build_resnet18_like,
    "vit": build_vit_lite,
}
