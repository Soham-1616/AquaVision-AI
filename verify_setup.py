#!/usr/bin/env python3
"""
AquaVision AI - Environment verification script (Phase 1).

Checks that the core scientific-Python and deep-learning stack is installed
and reports GPU / CUDA availability. It does NOT download any model weights
or datasets - it only imports packages and prints versions.

Usage:
    python verify_setup.py
Exit code:
    0 if all core packages import successfully, 1 otherwise.
"""

from __future__ import annotations

import importlib
import platform
import sys

# (import_name, human_label, pip_package_hint, is_core)
CHECKS = [
    ("numpy",       "NumPy",              "numpy",          True),
    ("cv2",         "OpenCV",             "opencv-python",  True),
    ("PIL",         "Pillow",             "pillow",         True),
    ("skimage",     "scikit-image",       "scikit-image",   True),
    ("pandas",      "pandas",             "pandas",         True),
    ("matplotlib",  "Matplotlib",         "matplotlib",     True),
    ("yaml",        "PyYAML",             "pyyaml",         True),
    ("torch",       "PyTorch",            "torch",          True),
    ("torchvision", "TorchVision",        "torchvision",    True),
    ("ultralytics", "Ultralytics (YOLO)", "ultralytics",    True),
    ("tqdm",        "tqdm",               "tqdm",           False),
]


def _version(mod) -> str:
    for attr in ("__version__", "version", "VERSION"):
        value = getattr(mod, attr, None)
        if isinstance(value, str):
            return value
    return "unknown"


def check_package(import_name: str, pip_hint: str):
    """Return (ok, version, hint). Never raises."""
    try:
        module = importlib.import_module(import_name)
        return True, _version(module), ""
    except Exception as exc:  # ImportError, or a broken/partial install
        return False, "", f"pip install {pip_hint}  ({exc.__class__.__name__})"


def check_gpu():
    """Report CUDA/GPU status via torch. Returns None if torch is unavailable."""
    try:
        import torch
    except Exception:
        return None

    info = {
        "torch": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "cuda_version": getattr(torch.version, "cuda", None),
        "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "devices": [],
        "cudnn": None,
    }
    if torch.cuda.is_available():
        info["devices"] = [torch.cuda.get_device_name(i)
                           for i in range(torch.cuda.device_count())]
        try:
            info["cudnn"] = torch.backends.cudnn.version()
        except Exception:
            info["cudnn"] = None
    return info


def main() -> int:
    print("=" * 62)
    print(" AquaVision AI - Environment Verification")
    print("=" * 62)
    print(f"Python   : {platform.python_version()}  ({sys.executable})")
    print(f"Platform : {platform.platform()}")
    print("-" * 62)

    results = []
    for import_name, label, pip_hint, is_core in CHECKS:
        ok, version, hint = check_package(import_name, pip_hint)
        results.append((label, ok, is_core))
        if ok:
            print(f"[ OK ] {label:<20} {version}")
        else:
            tag = "FAIL" if is_core else "warn"
            print(f"[{tag}] {label:<20} not importable -> {hint}")
    print("-" * 62)

    gpu = check_gpu()
    if gpu is None:
        print("GPU      : cannot check (PyTorch not importable)")
    elif gpu["cuda_available"]:
        print(f"GPU      : CUDA available - {gpu['device_count']} device(s)")
        for i, name in enumerate(gpu["devices"]):
            print(f"           [{i}] {name}")
        print(f"           torch CUDA build: {gpu['cuda_version']}   cuDNN: {gpu['cudnn']}")
    else:
        print("GPU      : CUDA NOT available - PyTorch will run on CPU")
        print(f"           (torch {gpu['torch']} is a CPU build, or no NVIDIA GPU/driver found)")
    print("=" * 62)

    core_failed = [label for label, ok, is_core in results if is_core and not ok]
    if core_failed:
        print(f"RESULT   : {len(core_failed)} core package(s) missing: {', '.join(core_failed)}")
        print("           Install them (see README.md), then re-run this script.")
        return 1

    print("RESULT   : All core packages import successfully.")
    if not (gpu and gpu["cuda_available"]):
        print("NOTE     : Running on CPU is fine for setup and small tests, but model")
        print("           training will be slow. Consider a CUDA GPU or Google Colab.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
