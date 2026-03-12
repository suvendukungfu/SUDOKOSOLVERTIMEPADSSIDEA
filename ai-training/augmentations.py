import albumentations as A
import numpy as np
import cv2

def get_training_augmentations():
    """
    Returns an Albumentations composition for augmenting 28x28 digit images.
    Focuses on rotations, noise, and perspective shifts common in camera images.
    """
    return A.Compose([
        # Minor perspective shifts to simulate varied camera angles
        A.Perspective(scale=(0.02, 0.06), p=0.5, pad_mode=cv2.BORDER_CONSTANT, pad_val=0),
        
        # Elastic distortions help with thin/curved numbers (helping 1 vs 7 separation)
        A.ElasticTransform(alpha=1, sigma=50, alpha_affine=50, p=0.3),
        
        # Rotations and scaling
        A.ShiftScaleRotate(
            shift_limit=0.08, 
            scale_limit=0.15, 
            rotate_limit=20, 
            p=0.6, 
            border_mode=cv2.BORDER_CONSTANT, 
            value=0
        ),
        
        # Simulating poor lighting or camera noise
        A.RandomBrightnessContrast(brightness_limit=0.3, contrast_limit=0.3, p=0.5),
        A.OneOf([
            A.GaussianBlur(blur_limit=(3, 5), p=0.5),
            A.MedianBlur(blur_limit=3, p=0.3),
            A.MotionBlur(blur_limit=3, p=0.2),
        ], p=0.4),
        
        A.GaussNoise(var_limit=(10.0, 50.0), p=0.3),
    ])

def augment_data(images):
    """
    Applies albumentations to a batch of images dynamically.
    Args:
        images: NumPy array of shape (N, 28, 28, 1) or (N, 28, 28), dtype typically float32 [0, 1] or uint8.
    Returns:
        Augmented NumPy array.
    """
    aug = get_training_augmentations()
    aug_images = np.zeros_like(images)
    
    for i, img in enumerate(images):
        # Convert [0,1] float32 to [0,255] uint8 for Albumentations if needed,
        # but Albumentations handles floats natively if ranges are standard.
        augmented = aug(image=img)
        aug_images[i] = augmented['image']
        
    return aug_images
