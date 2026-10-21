"""
AquaVision AI — Model Verification Script
Tests that all model checkpoints load correctly.
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

print("=" * 60)
print("AquaVision AI — Model Verification")
print("=" * 60)

# ------------------------------------------------------------------
# 1. Test U-Net Enhancement Model Loading
# ------------------------------------------------------------------
print("\n[1] Testing U-Net Enhancement Models...")

import torch
from unet_model import EnhancementUNet

enhancement_files = {
    "unet_default": os.path.join(MODELS_DIR, "enhancement", "best_model.pth"),
    "unet_baseline_l1": os.path.join(MODELS_DIR, "enhancement", "baseline_l1_best_model.pth"),
    "unet_l1_ssim": os.path.join(MODELS_DIR, "enhancement", "experiment_02_l1_ssim_best_model.pth"),
}

for name, path in enhancement_files.items():
    try:
        if not os.path.exists(path):
            print(f"  [{name}] SKIP — file not found: {path}")
            continue

        model = EnhancementUNet()
        checkpoint = torch.load(path, map_location="cpu", weights_only=True)

        if isinstance(checkpoint, dict):
            if "model_state_dict" in checkpoint:
                model.load_state_dict(checkpoint["model_state_dict"])
            elif "state_dict" in checkpoint:
                model.load_state_dict(checkpoint["state_dict"])
            else:
                model.load_state_dict(checkpoint)
        else:
            model.load_state_dict(checkpoint)

        model.eval()

        # Test inference with a dummy image
        dummy = torch.randn(1, 3, 256, 256)
        start = time.time()
        with torch.no_grad():
            out = model(dummy)
        elapsed = (time.time() - start) * 1000

        print(f"  [{name}] OK — output shape: {out.shape}, "
              f"range: [{out.min():.3f}, {out.max():.3f}], "
              f"time: {elapsed:.0f}ms")

    except Exception as e:
        print(f"  [{name}] FAILED — {e}")


# ------------------------------------------------------------------
# 2. Test Traditional Enhancement
# ------------------------------------------------------------------
print("\n[2] Testing Traditional Enhancement...")

try:
    import numpy as np
    from traditional_enhancement import enhance_traditional, enhance_white_balance_only, enhance_clahe_only

    dummy_img = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)

    start = time.time()
    result = enhance_traditional(dummy_img)
    elapsed = (time.time() - start) * 1000
    print(f"  [white_balance+clahe] OK — output shape: {result.shape}, time: {elapsed:.0f}ms")

    result_wb = enhance_white_balance_only(dummy_img)
    print(f"  [white_balance_only] OK — output shape: {result_wb.shape}")

    result_cl = enhance_clahe_only(dummy_img)
    print(f"  [clahe_only] OK — output shape: {result_cl.shape}")

except Exception as e:
    print(f"  [traditional] FAILED — {e}")


# ------------------------------------------------------------------
# 3. Test YOLO Detection Model Loading
# ------------------------------------------------------------------
print("\n[3] Testing YOLO Detection Model...")

try:
    from ultralytics import YOLO

    det_path = os.path.join(MODELS_DIR, "detection", "best.pt")
    fallback_path = os.path.join(MODELS_DIR, "detection", "yolo_sanity_best.pt")

    use_path = det_path if os.path.exists(det_path) else fallback_path

    if not os.path.exists(use_path):
        print(f"  [yolo] SKIP — no checkpoint found")
    else:
        model = YOLO(use_path)
        print(f"  [yolo] Loaded from: {use_path}")
        print(f"  [yolo] Model type: {model.task}")

        if hasattr(model, 'names'):
            print(f"  [yolo] Classes ({len(model.names)}): {model.names}")

        # Test inference with dummy
        dummy_img = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
        start = time.time()
        results = model(dummy_img, conf=0.1, verbose=False)
        elapsed = (time.time() - start) * 1000
        n_det = len(results[0].boxes) if results[0].boxes is not None else 0
        print(f"  [yolo] Inference OK — {n_det} detections, time: {elapsed:.0f}ms")

except Exception as e:
    print(f"  [yolo] FAILED — {e}")


print("\n" + "=" * 60)
print("Verification complete.")
print("=" * 60)
