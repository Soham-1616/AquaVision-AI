"""
AquaVision AI — Marine Object Detection

Provides a thin wrapper around Ultralytics YOLO for single-image
inference on underwater images.

Expected model: YOLOv8n trained on RUOD (10 marine classes).
Expected checkpoint path: models/best.pt

Usage:
    from aquavision.detection.detector import load_model, run_detection

    model = load_model("models/best.pt")
    result = run_detection(model, rgb_image)
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np


# ── Structured detection result ───────────────────────────────

@dataclass
class DetectionResult:
    """Holds the output of a single YOLO inference run."""

    # Per-detection arrays (N detections)
    boxes: np.ndarray          # (N, 4) — xyxy pixel coordinates
    class_ids: np.ndarray      # (N,)   — integer class indices
    class_names: list[str]     # (N,)   — resolved class names
    confidences: np.ndarray    # (N,)   — float32 confidence scores

    # Summary
    count: int = 0
    inference_ms: float = 0.0  # measured with time.perf_counter

    # Annotated output image (RGB uint8, same size as input)
    annotated_image: np.ndarray | None = None

    # Model metadata
    model_class_names: dict = field(default_factory=dict)


# ── Model loading ─────────────────────────────────────────────

def load_model(checkpoint_path: str | Path):
    """
    Load a YOLO checkpoint using the Ultralytics API.

    Parameters
    ----------
    checkpoint_path : path to the .pt file.

    Returns
    -------
    ultralytics.YOLO model instance.

    Raises
    ------
    FileNotFoundError  — if the checkpoint does not exist.
    ImportError         — if ultralytics is not installed.
    Exception           — if the checkpoint cannot be loaded.
    """
    path = Path(checkpoint_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(
            f"YOLO checkpoint not found: {path}\n"
            "Place best.pt in models/ — see models/README.md."
        )

    from ultralytics import YOLO
    model = YOLO(str(path))
    return model


# ── Single-image inference ────────────────────────────────────

# Default inference settings — identical for original and enhanced
# images so that comparisons are controlled.
_DEFAULT_IMGSZ = 640
_DEFAULT_CONF  = 0.25
_DEFAULT_IOU   = 0.45


def run_detection(
    model,
    image: np.ndarray,
    *,
    imgsz: int = _DEFAULT_IMGSZ,
    conf: float = _DEFAULT_CONF,
    iou: float = _DEFAULT_IOU,
) -> DetectionResult:
    """
    Run YOLO inference on a single RGB uint8 image.

    Parameters
    ----------
    model  : loaded Ultralytics YOLO model.
    image  : RGB uint8 NumPy array with shape (H, W, 3).
    imgsz  : inference input resolution (default 640).
    conf   : confidence threshold (default 0.25).
    iou    : NMS IoU threshold (default 0.45).

    Returns
    -------
    DetectionResult with boxes, classes, confidences, timing,
    and an annotated RGB image.

    Raises
    ------
    ValueError — if the image has an unexpected shape or dtype.
    """
    # ── Validate input ──
    if image is None or not isinstance(image, np.ndarray):
        raise ValueError("Expected a NumPy ndarray image.")
    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError(
            f"Expected RGB image with shape (H, W, 3), got {image.shape}."
        )
    if image.dtype != np.uint8:
        image = np.clip(image, 0, 255).astype(np.uint8)

    # ── Inference (timed) ──
    t0 = time.perf_counter()
    results = model.predict(
        source=image,
        imgsz=imgsz,
        conf=conf,
        iou=iou,
        verbose=False,
    )
    t1 = time.perf_counter()

    inference_ms = (t1 - t0) * 1000

    # ── Parse results ──
    # Ultralytics returns a list; single image → one result.
    r = results[0]

    # Model class-name mapping
    model_names: dict = r.names if hasattr(r, "names") else {}

    boxes_tensor = r.boxes
    n = len(boxes_tensor)

    if n == 0:
        return DetectionResult(
            boxes=np.empty((0, 4), dtype=np.float32),
            class_ids=np.empty(0, dtype=np.int32),
            class_names=[],
            confidences=np.empty(0, dtype=np.float32),
            count=0,
            inference_ms=inference_ms,
            annotated_image=_render_annotated(image, r),
            model_class_names=model_names,
        )

    xyxy = boxes_tensor.xyxy.cpu().numpy().astype(np.float32)       # (N,4)
    cls  = boxes_tensor.cls.cpu().numpy().astype(np.int32)           # (N,)
    conf_arr = boxes_tensor.conf.cpu().numpy().astype(np.float32)   # (N,)

    names = [model_names.get(int(c), f"class_{c}") for c in cls]

    return DetectionResult(
        boxes=xyxy,
        class_ids=cls,
        class_names=names,
        confidences=conf_arr,
        count=n,
        inference_ms=inference_ms,
        annotated_image=_render_annotated(image, r),
        model_class_names=model_names,
    )


def _render_annotated(image: np.ndarray, result) -> np.ndarray:
    """
    Use the Ultralytics result.plot() method to render bounding boxes
    onto the image.  Returns an RGB uint8 array.
    """
    try:
        # result.plot() returns a BGR numpy array
        bgr = result.plot()
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        return rgb
    except Exception:
        # Fallback: return the original image unmodified
        return image.copy()
