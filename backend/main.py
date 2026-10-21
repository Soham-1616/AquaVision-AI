"""
AquaVision AI — FastAPI Backend

Serves the React frontend and provides API endpoints for:
- Image enhancement (Traditional + Deep Learning U-Net)
- Object detection (YOLO11s marine detector)
- Combined pipeline (enhance + detect)
"""

import io
import os
import sys
import time
import uuid
import logging
from pathlib import Path
from contextlib import asynccontextmanager

import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from evaluation_metrics import calculate_uiqm, calculate_uciqe, get_benchmark_metrics

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"

UPLOADS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)

# Enhancement model paths
ENHANCEMENT_MODELS = {
    "unet_baseline_l1": MODELS_DIR / "enhancement" / "baseline_l1_best_model.pth",
    "unet_l1_ssim": MODELS_DIR / "enhancement" / "experiment_02_l1_ssim_best_model.pth",
    "unet_default": MODELS_DIR / "enhancement" / "best_model.pth",
}

# Detection model paths  — prefer the fully-trained one from Downloads
DETECTION_MODEL_PATH = MODELS_DIR / "detection" / "best.pt"
DETECTION_FALLBACK_PATH = MODELS_DIR / "detection" / "yolo_sanity_best.pt"

# RUOD class names (from data.yaml in notebook)
RUOD_CLASSES = [
    "holothurian", "echinus", "scallop", "starfish", "fish",
    "corals", "diver", "cuttlefish", "turtle", "jellyfish",
]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aquavision")

# ---------------------------------------------------------------------------
# Global model holders
# ---------------------------------------------------------------------------

_enhancement_models = {}   # name -> loaded PyTorch model
_detection_model = None     # loaded YOLO model
_device = "cpu"
_models_status = {}         # name -> {"loaded": bool, "error": str|None}

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------


def _load_enhancement_model(name: str, path: Path):
    """Load a U-Net enhancement checkpoint."""
    import torch
    from unet_model import EnhancementUNet

    global _enhancement_models, _models_status

    if not path.exists():
        _models_status[name] = {"loaded": False, "error": f"Checkpoint not found: {path}"}
        logger.warning(f"Enhancement model '{name}': checkpoint not found at {path}")
        return

    try:
        model = EnhancementUNet()
        checkpoint = torch.load(path, map_location=_device, weights_only=True)

        # Handle different checkpoint formats
        if isinstance(checkpoint, dict):
            if "model_state_dict" in checkpoint:
                model.load_state_dict(checkpoint["model_state_dict"])
            elif "state_dict" in checkpoint:
                model.load_state_dict(checkpoint["state_dict"])
            else:
                model.load_state_dict(checkpoint)
        else:
            model.load_state_dict(checkpoint)

        model.to(_device)
        model.eval()
        _enhancement_models[name] = model
        _models_status[name] = {"loaded": True, "error": None}
        logger.info(f"Enhancement model '{name}' loaded successfully from {path}")

    except Exception as e:
        _models_status[name] = {"loaded": False, "error": str(e)}
        logger.error(f"Failed to load enhancement model '{name}': {e}")


def _load_detection_model():
    """Load the YOLO detection model."""
    global _detection_model, _models_status

    det_path = DETECTION_MODEL_PATH if DETECTION_MODEL_PATH.exists() else DETECTION_FALLBACK_PATH

    if not det_path.exists():
        _models_status["yolo_detector"] = {"loaded": False, "error": "No YOLO checkpoint found"}
        logger.warning("No YOLO detection checkpoint found")
        return

    try:
        from ultralytics import YOLO
        _detection_model = YOLO(str(det_path))
        _models_status["yolo_detector"] = {"loaded": True, "error": None, "path": str(det_path)}
        logger.info(f"YOLO detection model loaded from {det_path}")

        # Log model info
        if hasattr(_detection_model, 'names'):
            logger.info(f"Detection classes: {_detection_model.names}")

    except Exception as e:
        _models_status["yolo_detector"] = {"loaded": False, "error": str(e)}
        logger.error(f"Failed to load YOLO model: {e}")


# ---------------------------------------------------------------------------
# Lifespan (startup/shutdown)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup."""
    import torch
    global _device

    _device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {_device}")

    # Load enhancement models
    for name, path in ENHANCEMENT_MODELS.items():
        _load_enhancement_model(name, path)

    # Load detection model
    _load_detection_model()

    # Report status
    logger.info("=" * 60)
    logger.info("MODEL STATUS REPORT")
    logger.info("=" * 60)
    for name, status in _models_status.items():
        state = "OK" if status["loaded"] else f"FAILED ({status['error']})"
        logger.info(f"  {name}: {state}")
    logger.info("=" * 60)

    yield

    logger.info("Shutting down AquaVision AI backend")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AquaVision AI",
    description="Underwater Image Enhancement and Marine Object Detection",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve output images
app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def _read_image(file_bytes: bytes) -> np.ndarray:
    """Read uploaded image bytes to RGB numpy array."""
    if not file_bytes:
        raise ValueError("Uploaded file is empty.")
    try:
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        return np.array(image)
    except Exception as e:
        raise ValueError(f"Invalid or unreadable image file: {str(e)}")


def _save_image(image_array: np.ndarray, prefix: str) -> str:
    """Save an RGB numpy array and return the URL path."""
    filename = f"{prefix}_{uuid.uuid4().hex[:8]}.png"
    filepath = OUTPUTS_DIR / filename
    Image.fromarray(image_array).save(str(filepath))
    return f"/outputs/{filename}"


def _enhance_deep_learning(image_rgb: np.ndarray, model_name: str = "unet_default") -> np.ndarray:
    """Run U-Net enhancement on an RGB image."""
    import torch
    import torchvision.transforms.functional as TF

    if model_name not in _enhancement_models:
        raise ValueError(f"Enhancement model '{model_name}' not loaded")

    model = _enhancement_models[model_name]
    pil_image = Image.fromarray(image_rgb)
    orig_w, orig_h = pil_image.size

    # Scale down oversized images (> 1280px) for responsive CPU inference
    max_dim = max(orig_w, orig_h)
    needs_scale = max_dim > 1280
    if needs_scale:
        scale = 1280.0 / max_dim
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        pil_image = pil_image.resize((new_w, new_h), Image.Resampling.BILINEAR)

    w, h = pil_image.size
    pad_w = (8 - w % 8) % 8
    pad_h = (8 - h % 8) % 8

    # Convert to tensor [0, 1]
    tensor = TF.to_tensor(pil_image).unsqueeze(0).to(_device)  # [1, 3, H, W]

    if pad_w > 0 or pad_h > 0:
        tensor = torch.nn.functional.pad(tensor, (0, pad_w, 0, pad_h), mode='reflect')

    with torch.no_grad():
        output = model(tensor)

    # Remove padding
    if pad_w > 0 or pad_h > 0:
        output = output[:, :, :h, :w]

    # Convert back to numpy RGB [0, 255]
    output_np = output.squeeze(0).cpu().numpy()
    output_np = np.transpose(output_np, (1, 2, 0))  # [H, W, 3]
    output_np = np.clip(output_np * 255, 0, 255).astype(np.uint8)

    if needs_scale:
        output_np = cv2.resize(output_np, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)

    return np.ascontiguousarray(output_np)


def _detect_objects(image_rgb: np.ndarray, confidence: float = 0.5):
    """Run YOLO detection on an RGB image. Returns (annotated_image, detections_list)."""
    if _detection_model is None:
        raise ValueError("Detection model not loaded")

    image_rgb = np.ascontiguousarray(image_rgb)
    results = _detection_model(image_rgb, conf=confidence, verbose=False)
    result = results[0]

    # Get annotated image
    annotated = result.plot()
    # YOLO plot() returns BGR, convert to RGB
    annotated_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)

    # Extract detections
    detections = []
    boxes = result.boxes
    if boxes is not None and len(boxes) > 0:
        for i in range(len(boxes)):
            xyxy = boxes.xyxy[i].cpu().numpy()
            conf = float(boxes.conf[i].cpu().numpy())
            cls_id = int(boxes.cls[i].cpu().numpy())

            # Get class name from model
            if hasattr(_detection_model, 'names') and cls_id in _detection_model.names:
                class_name = _detection_model.names[cls_id]
            elif cls_id < len(RUOD_CLASSES):
                class_name = RUOD_CLASSES[cls_id]
            else:
                class_name = f"class_{cls_id}"

            # Assign a color per class
            colors = [
                "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
                "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
            ]
            color = colors[cls_id % len(colors)]

            detections.append({
                "id": f"det_{i}",
                "classLabel": class_name,
                "confidence": round(conf, 4),
                "boundingBox": {
                    "x": round(float(xyxy[0]), 1),
                    "y": round(float(xyxy[1]), 1),
                    "width": round(float(xyxy[2] - xyxy[0]), 1),
                    "height": round(float(xyxy[3] - xyxy[1]), 1),
                },
                "color": color,
            })

    return annotated_rgb, detections


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "AquaVision AI"}


@app.get("/api/capabilities")
async def get_capabilities():
    enhancement_models = []

    # Always available: traditional methods
    enhancement_models.append("White Balance + CLAHE (Traditional)")
    enhancement_models.append("White Balance")
    enhancement_models.append("CLAHE")

    # DL models
    for name in ENHANCEMENT_MODELS:
        status = _models_status.get(name, {})
        if status.get("loaded"):
            label_map = {
                "unet_default": "U-Net Deep Enhancement",
                "unet_baseline_l1": "U-Net Baseline (L1 Loss)",
                "unet_l1_ssim": "U-Net (L1 + SSIM Loss)",
            }
            enhancement_models.append(label_map.get(name, name))

    detection_models = []
    det_status = _models_status.get("yolo_detector", {})
    if det_status.get("loaded"):
        detection_models.append("YOLO11s Marine Object Detector")

    return {
        "connected": True,
        "enhancementModels": enhancement_models,
        "detectionModels": detection_models,
        "supportedFormats": ["image/jpeg", "image/png", "image/webp"],
        "maxFileSize": 20 * 1024 * 1024,
        "supportedClasses": RUOD_CLASSES,
        "version": "1.0.0",
        "modelStatus": _models_status,
    }


@app.post("/api/analysis/enhance")
async def enhance_image(
    file: UploadFile = File(...),
    method: str = Form("auto"),
    quality: str = Form("high"),
):
    """Enhance an uploaded underwater image."""
    start_time = time.time()

    try:
        file_bytes = await file.read()
        try:
            image_rgb = _read_image(file_bytes)
        except ValueError as ve:
            raise HTTPException(400, str(ve))
        h, w = image_rgb.shape[:2]

        # Save original
        original_url = _save_image(image_rgb, "original")

        # Apply enhancement based on method
        method_used = method
        warnings = []

        if method in ("auto", "deep_learning"):
            # Try the best available DL model
            dl_model_name = None
            for name in ["unet_l1_ssim", "unet_default", "unet_baseline_l1"]:
                if name in _enhancement_models:
                    dl_model_name = name
                    break

            if dl_model_name:
                enhanced = _enhance_deep_learning(image_rgb, dl_model_name)
                method_used = f"deep_learning ({dl_model_name})"
            elif method == "auto":
                # Fallback to traditional
                from traditional_enhancement import enhance_traditional
                enhanced = enhance_traditional(image_rgb)
                method_used = "white_balance_clahe (auto fallback)"
                warnings.append("Deep learning model unavailable; used traditional enhancement.")
            else:
                raise HTTPException(400, "Deep learning enhancement model not loaded")

        elif method == "white_balance":
            from traditional_enhancement import enhance_white_balance_only
            enhanced = enhance_white_balance_only(image_rgb)
            method_used = "white_balance"

        elif method == "clahe":
            from traditional_enhancement import enhance_clahe_only
            enhanced = enhance_clahe_only(image_rgb)
            method_used = "clahe"

        else:
            # Default traditional pipeline
            from traditional_enhancement import enhance_traditional
            enhanced = enhance_traditional(image_rgb)
            method_used = "white_balance_clahe"

        processing_time_ms = round((time.time() - start_time) * 1000, 1)
        enhanced_url = _save_image(enhanced, "enhanced")
        uiqm = calculate_uiqm(enhanced)
        uciqe = calculate_uciqe(enhanced)

        return {
            "enhancedImageUrl": enhanced_url,
            "originalImageUrl": original_url,
            "method": method_used,
            "processingTimeMs": processing_time_ms,
            "inputDimensions": {"width": w, "height": h},
            "outputDimensions": {"width": enhanced.shape[1], "height": enhanced.shape[0]},
            "metrics": {
                "psnr": None,
                "ssim": None,
                "uiqm": uiqm,
                "uciqe": uciqe,
            },
            "warnings": warnings if warnings else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enhancement error: {e}", exc_info=True)
        raise HTTPException(500, f"Enhancement failed: {str(e)}")


@app.post("/api/analysis/detect")
async def detect_objects(
    file: UploadFile = File(...),
    confidence: float = Form(0.5),
):
    """Run object detection on an uploaded image."""
    start_time = time.time()

    if _detection_model is None:
        raise HTTPException(503, "Detection model not loaded")

    try:
        file_bytes = await file.read()
        try:
            image_rgb = _read_image(file_bytes)
        except ValueError as ve:
            raise HTTPException(400, str(ve))

        annotated, detections = _detect_objects(image_rgb, confidence)

        processing_time_ms = round((time.time() - start_time) * 1000, 1)

        annotated_url = _save_image(annotated, "detected")
        source_url = _save_image(image_rgb, "source")

        # Compute class distribution
        class_dist = {}
        for det in detections:
            cls = det["classLabel"]
            class_dist[cls] = class_dist.get(cls, 0) + 1

        avg_conf = round(float(np.mean([d["confidence"] for d in detections])), 3) if detections else None

        return {
            "annotatedImageUrl": annotated_url,
            "sourceImageUrl": source_url,
            "detections": detections,
            "totalObjects": len(detections),
            "processingTimeMs": processing_time_ms,
            "modelId": "yolo11s_marine",
            "confidenceThreshold": confidence,
            "metrics": {
                "precision": None,
                "recall": None,
                "f1Score": None,
                "mAP": None,
                "mAP50": None,
                "mAP5095": None,
                "fps": round(1000 / processing_time_ms, 1) if processing_time_ms > 0 else None,
                "inferenceMs": processing_time_ms,
                "avgConfidence": avg_conf,
            },
            "classDistribution": class_dist,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Detection error: {e}", exc_info=True)
        raise HTTPException(500, f"Detection failed: {str(e)}")


@app.post("/api/analysis/pipeline")
async def run_pipeline(
    file: UploadFile = File(...),
    method: str = Form("auto"),
    confidence: float = Form(0.5),
    enable_enhancement: bool = Form(True),
    enable_detection: bool = Form(True),
):
    """Run the full pipeline: enhance + detect, with comparison."""
    pipeline_start = time.time()

    try:
        file_bytes = await file.read()
        try:
            image_rgb = _read_image(file_bytes)
        except ValueError as ve:
            raise HTTPException(400, str(ve))
        h, w = image_rgb.shape[:2]

        result = {
            "originalImageUrl": _save_image(image_rgb, "original"),
            "inputDimensions": {"width": w, "height": h},
        }

        # --- Enhancement ---
        enhanced = None
        if enable_enhancement:
            enh_start = time.time()

            if method in _enhancement_models:
                enhanced = _enhance_deep_learning(image_rgb, method)
                method_used = f"deep_learning ({method})"
            elif method in ("auto", "deep_learning"):
                dl_model_name = None
                for name in ["unet_l1_ssim", "unet_default", "unet_baseline_l1"]:
                    if name in _enhancement_models:
                        dl_model_name = name
                        break
                if dl_model_name:
                    enhanced = _enhance_deep_learning(image_rgb, dl_model_name)
                    method_used = f"deep_learning ({dl_model_name})"
                else:
                    from traditional_enhancement import enhance_traditional
                    enhanced = enhance_traditional(image_rgb)
                    method_used = "white_balance_clahe (fallback)"
            elif method == "white_balance":
                from traditional_enhancement import enhance_white_balance_only
                enhanced = enhance_white_balance_only(image_rgb)
                method_used = "white_balance"
            elif method == "clahe":
                from traditional_enhancement import enhance_clahe_only
                enhanced = enhance_clahe_only(image_rgb)
                method_used = "clahe"
            else:
                from traditional_enhancement import enhance_traditional
                enhanced = enhance_traditional(image_rgb)
                method_used = "white_balance_clahe"

            enh_time = round((time.time() - enh_start) * 1000, 1)
            uiqm = calculate_uiqm(enhanced)
            uciqe = calculate_uciqe(enhanced)

            result["enhancementResult"] = {
                "enhancedImageUrl": _save_image(enhanced, "enhanced"),
                "originalImageUrl": result["originalImageUrl"],
                "method": method_used,
                "processingTimeMs": enh_time,
                "inputDimensions": {"width": w, "height": h},
                "outputDimensions": {"width": enhanced.shape[1], "height": enhanced.shape[0]},
                "metrics": {"psnr": None, "ssim": None, "uiqm": uiqm, "uciqe": uciqe},
            }

        # --- Detection on original ---
        if enable_detection and _detection_model is not None:
            det_start = time.time()
            annotated_orig, detections_orig = _detect_objects(image_rgb, confidence)
            det_time_orig = round((time.time() - det_start) * 1000, 1)

            class_dist_orig = {}
            for det in detections_orig:
                cls = det["classLabel"]
                class_dist_orig[cls] = class_dist_orig.get(cls, 0) + 1

            avg_conf_orig = round(float(np.mean([d["confidence"] for d in detections_orig])), 3) if detections_orig else None
            result["detectionOnOriginal"] = {
                "annotatedImageUrl": _save_image(annotated_orig, "det_original"),
                "sourceImageUrl": result["originalImageUrl"],
                "detections": detections_orig,
                "totalObjects": len(detections_orig),
                "processingTimeMs": det_time_orig,
                "modelId": "yolo11s_marine",
                "confidenceThreshold": confidence,
                "metrics": {
                    "fps": round(1000 / det_time_orig, 1) if det_time_orig > 0 else None,
                    "inferenceMs": det_time_orig,
                    "avgConfidence": avg_conf_orig,
                },
                "classDistribution": class_dist_orig,
            }

            # --- Detection on enhanced (if enhancement was applied) ---
            if enhanced is not None:
                det_start_enh = time.time()
                annotated_enh, detections_enh = _detect_objects(enhanced, confidence)
                det_time_enh = round((time.time() - det_start_enh) * 1000, 1)

                class_dist_enh = {}
                for det in detections_enh:
                    cls = det["classLabel"]
                    class_dist_enh[cls] = class_dist_enh.get(cls, 0) + 1

                avg_conf_enh = round(float(np.mean([d["confidence"] for d in detections_enh])), 3) if detections_enh else None
                result["detectionOnEnhanced"] = {
                    "annotatedImageUrl": _save_image(annotated_enh, "det_enhanced"),
                    "sourceImageUrl": result["enhancementResult"]["enhancedImageUrl"],
                    "detections": detections_enh,
                    "totalObjects": len(detections_enh),
                    "processingTimeMs": det_time_enh,
                    "modelId": "yolo11s_marine",
                    "confidenceThreshold": confidence,
                    "metrics": {
                        "fps": round(1000 / det_time_enh, 1) if det_time_enh > 0 else None,
                        "inferenceMs": det_time_enh,
                        "avgConfidence": avg_conf_enh,
                    },
                    "classDistribution": class_dist_enh,
                }

        elif enable_detection and _detection_model is None:
            result["detectionError"] = "Detection model not loaded"

        result["totalProcessingTimeMs"] = round((time.time() - pipeline_start) * 1000, 1)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        raise HTTPException(500, f"Pipeline failed: {str(e)}")



@app.post("/api/analysis/video")
async def analyze_video(
    file: UploadFile = File(...),
    mode: str = Form("full"),
    sampling: str = Form("every_10th"),
    confidence: float = Form(0.4),
    enhancement_method: str = Form("auto"),
):
    """
    Process an uploaded underwater video:
    - Mode: 'full' (enhance + detect), 'enhance' (enhancement only), 'detect' (detection only)
    - Sampling: 'every' (all frames, capped at 120), 'every_5th', 'every_10th', 'keyframes' (~1fps)
    - Returns processed video URL, metrics, detected classes distribution, and sample keyframes.
    """
    start_time = time.time()
    temp_video_path = None

    try:
        # Save uploaded video to temp file
        ext = Path(file.filename or "video.mp4").suffix or ".mp4"
        temp_video_path = UPLOADS_DIR / f"temp_{uuid.uuid4().hex[:8]}{ext}"

        with open(temp_video_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)

        # Open video with OpenCV
        cap = cv2.VideoCapture(str(temp_video_path))
        if not cap.isOpened():
            raise HTTPException(400, "Could not open uploaded video file.")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        orig_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / orig_fps if orig_fps > 0 else 0

        # Determine frame sampling step
        sampling_map = {
            "every": 1,
            "every_5th": 5,
            "every_10th": 10,
            "keyframes": max(1, int(orig_fps)),
        }
        step = sampling_map.get(sampling, 10)

        # Cap max processed frames at 120 on CPU to ensure quick responsiveness
        max_allowed_frames = 120
        if total_frames > 0 and (total_frames // step) > max_allowed_frames:
            step = max(step, total_frames // max_allowed_frames)

        # Compute output video resolution (scale down if > 960 width for speed & crisp display)
        if orig_w > 960:
            target_w = 960
            target_h = int(orig_h * (960 / orig_w))
        else:
            target_w = orig_w
            target_h = orig_h

        # Enforce even dimensions for video codecs
        target_w = target_w if target_w % 2 == 0 else target_w - 1
        target_h = target_h if target_h % 2 == 0 else target_h - 1

        # Output video writer setup
        out_filename = f"video_{uuid.uuid4().hex[:8]}.mp4"
        out_filepath = OUTPUTS_DIR / out_filename
        out_fps = max(5.0, min(orig_fps, orig_fps / step if step > 1 else orig_fps))
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(out_filepath), fourcc, out_fps, (target_w, target_h))

        processed_count = 0
        total_detections = 0
        class_distribution = {}
        sample_frames = []
        max_sample_frames = 8
        frame_idx = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % step == 0:
                resized_bgr = cv2.resize(frame, (target_w, target_h))
                current_rgb = cv2.cvtColor(resized_bgr, cv2.COLOR_BGR2RGB)

                # Step 1: Enhancement
                if mode in ("full", "enhance"):
                    if enhancement_method == "deep_learning" and "unet_default" in _enhancement_models:
                        try:
                            current_rgb = _enhance_deep_learning(current_rgb, "unet_default")
                        except Exception as e:
                            logger.warning(f"DL enhancement failed on frame {frame_idx}: {e}")
                            from traditional_enhancement import enhance_traditional
                            current_rgb = enhance_traditional(current_rgb)
                    else:
                        from traditional_enhancement import enhance_traditional
                        current_rgb = enhance_traditional(current_rgb)

                # Step 2: Detection
                frame_dets = []
                if mode in ("full", "detect") and _detection_model is not None:
                    ann_rgb, frame_dets = _detect_objects(current_rgb, confidence)
                    output_rgb = ann_rgb
                    for det in frame_dets:
                        cls = det["classLabel"]
                        class_distribution[cls] = class_distribution.get(cls, 0) + 1
                    total_detections += len(frame_dets)
                else:
                    output_rgb = current_rgb

                # Write frame to output video
                output_bgr = cv2.cvtColor(output_rgb, cv2.COLOR_RGB2BGR)
                writer.write(output_bgr)
                processed_count += 1

                # Save sample keyframes (first frame, frames with detections, or periodic frames)
                should_save_sample = False
                if len(sample_frames) == 0:
                    should_save_sample = True
                elif len(frame_dets) > 0 and len(sample_frames) < max_sample_frames:
                    should_save_sample = True
                elif processed_count % max(1, (total_frames // (step * max_sample_frames))) == 0:
                    if len(sample_frames) < max_sample_frames:
                        should_save_sample = True

                if should_save_sample and len(sample_frames) < max_sample_frames:
                    sample_img_url = _save_image(output_rgb, f"sample_{frame_idx}")
                    sample_frames.append({
                        "frameNumber": frame_idx,
                        "timestamp": round(frame_idx / orig_fps, 2),
                        "imageUrl": sample_img_url,
                        "detectionCount": len(frame_dets),
                        "detections": frame_dets[:10], # Top detections for preview
                    })

            frame_idx += 1

        cap.release()
        writer.release()

        processing_time_ms = round((time.time() - start_time) * 1000, 1)

        return {
            "videoUrl": f"/outputs/{out_filename}",
            "fileName": file.filename,
            "totalFrames": total_frames,
            "processedFrames": processed_count,
            "samplingRate": step,
            "duration": round(duration, 2),
            "fps": round(orig_fps, 2),
            "dimensions": {"width": target_w, "height": target_h},
            "processingTimeMs": processing_time_ms,
            "totalObjects": total_detections,
            "classDistribution": class_distribution,
            "sampleFrames": sample_frames,
            "mode": mode,
            "enhancementMethod": enhancement_method,
            "confidenceThreshold": confidence,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video analysis error: {e}", exc_info=True)
        raise HTTPException(500, f"Video processing failed: {str(e)}")
    finally:
        if temp_video_path and temp_video_path.exists():
            try:
                temp_video_path.unlink()
            except Exception:
                pass


@app.get("/api/evaluation/benchmark")
@app.get("/api/evaluation/benchmarks")
def get_benchmarks():
    """Return research-grade dataset-level evaluation benchmarks for enhancement and detection models."""
    return get_benchmark_metrics()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
