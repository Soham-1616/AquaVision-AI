from pathlib import Path

import numpy as np
from PIL import Image


def load_image(path: str | Path) -> Image.Image:
    """Load an image and convert it to RGB."""

    path = Path(path)

    if not path.is_file():
        raise FileNotFoundError(f"Image not found: {path}")

    with Image.open(path) as image:
        return image.convert("RGB")


def to_numpy(image: Image.Image) -> np.ndarray:
    """Convert a PIL RGB image to a NumPy array."""

    return np.asarray(image)


def resize_image(
    image: Image.Image,
    size: tuple[int, int] = (640, 640),
) -> Image.Image:
    """Resize an image to the specified (width, height)."""

    if size[0] <= 0 or size[1] <= 0:
        raise ValueError("Image dimensions must be positive.")

    return image.resize(size, Image.Resampling.LANCZOS)


def normalize_image(image: np.ndarray) -> np.ndarray:
    """Normalize uint8 RGB image values from [0, 255] to [0, 1]."""

    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("Expected an RGB image with shape (H, W, 3).")

    return image.astype(np.float32) / 255.0