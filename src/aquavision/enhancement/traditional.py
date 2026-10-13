import cv2
import numpy as np


def white_balance(image: np.ndarray) -> np.ndarray:
    """Apply Gray-World white balance to an RGB image."""

    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("Expected an RGB image with shape (H, W, 3).")

    image = image.astype(np.float32)

    channel_means = image.mean(axis=(0, 1))

    if np.any(channel_means == 0):
        raise ValueError("Cannot apply white balance when a channel mean is zero.")

    target = channel_means.mean()
    scale = target / channel_means

    balanced = image * scale
    return np.clip(balanced, 0, 255).astype(np.uint8)


def apply_clahe(
    image: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid_size: tuple[int, int] = (8, 8),
) -> np.ndarray:
    """Improve local contrast using CLAHE on the LAB luminance channel."""

    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("Expected an RGB image with shape (H, W, 3).")

    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)

    l_channel, a_channel, b_channel = cv2.split(lab)

    clahe = cv2.createCLAHE(
        clipLimit=clip_limit,
        tileGridSize=tile_grid_size,
    )

    enhanced_l = clahe.apply(l_channel)

    enhanced_lab = cv2.merge((enhanced_l, a_channel, b_channel))

    return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)


def enhance_image(image: np.ndarray) -> np.ndarray:
    """Apply the traditional AquaVision enhancement pipeline."""

    balanced = white_balance(image)
    enhanced = apply_clahe(balanced)

    return enhanced