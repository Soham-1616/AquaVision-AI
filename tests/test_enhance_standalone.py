"""
AquaVision AI — Standalone Enhancement Function Test

Verifies that the existing enhance_image() function works correctly
by creating a synthetic test image and processing it.

This script does NOT modify the enhancement implementation.
It only calls the existing function and reports the results.

Usage:
    python tests/test_enhance_standalone.py
"""

from __future__ import annotations

import sys
import time

import numpy as np


def main() -> int:
    print("=" * 60)
    print(" AquaVision AI — Enhancement Function Test")
    print("=" * 60)

    # ------------------------------------------------------------------
    # Step 1: Import the enhancement function
    # ------------------------------------------------------------------
    print("\n[1] Importing enhance_image()...")
    try:
        from aquavision.enhancement.traditional import (
            enhance_image,
            white_balance,
            apply_clahe,
        )
        print("    OK — all three functions imported successfully.")
    except ImportError as exc:
        print(f"    FAIL — ImportError: {exc}")
        print("    Make sure you have run: pip install -e .")
        return 1

    # ------------------------------------------------------------------
    # Step 2: Create a synthetic underwater-style test image
    # ------------------------------------------------------------------
    print("\n[2] Creating synthetic test image (256×256 RGB)...")

    rng = np.random.RandomState(42)
    # Simulate a blue-green colour cast typical of underwater images
    test_image = rng.randint(0, 256, size=(256, 256, 3), dtype=np.uint8)
    # Reduce the red channel and boost blue to simulate underwater
    test_image[:, :, 0] = (test_image[:, :, 0] * 0.4).astype(np.uint8)  # R
    test_image[:, :, 2] = np.clip(
        test_image[:, :, 2] * 1.3, 0, 255
    ).astype(np.uint8)  # B

    print(f"    Shape : {test_image.shape}")
    print(f"    Dtype : {test_image.dtype}")
    print(f"    Range : [{test_image.min()}, {test_image.max()}]")
    print(f"    Mean per channel (R, G, B): "
          f"{test_image[:,:,0].mean():.1f}, "
          f"{test_image[:,:,1].mean():.1f}, "
          f"{test_image[:,:,2].mean():.1f}")

    # ------------------------------------------------------------------
    # Step 3: Run white_balance()
    # ------------------------------------------------------------------
    print("\n[3] Testing white_balance()...")
    try:
        start = time.perf_counter()
        balanced = white_balance(test_image)
        wb_time = time.perf_counter() - start
        print(f"    OK — output shape: {balanced.shape}, "
              f"dtype: {balanced.dtype}, "
              f"time: {wb_time*1000:.2f} ms")
        print(f"    Mean per channel (R, G, B): "
              f"{balanced[:,:,0].mean():.1f}, "
              f"{balanced[:,:,1].mean():.1f}, "
              f"{balanced[:,:,2].mean():.1f}")
    except Exception as exc:
        print(f"    FAIL — {exc.__class__.__name__}: {exc}")
        return 1

    # ------------------------------------------------------------------
    # Step 4: Run apply_clahe()
    # ------------------------------------------------------------------
    print("\n[4] Testing apply_clahe()...")
    try:
        start = time.perf_counter()
        clahe_result = apply_clahe(balanced)
        clahe_time = time.perf_counter() - start
        print(f"    OK — output shape: {clahe_result.shape}, "
              f"dtype: {clahe_result.dtype}, "
              f"time: {clahe_time*1000:.2f} ms")
    except Exception as exc:
        print(f"    FAIL — {exc.__class__.__name__}: {exc}")
        return 1

    # ------------------------------------------------------------------
    # Step 5: Run the combined enhance_image()
    # ------------------------------------------------------------------
    print("\n[5] Testing enhance_image() (combined pipeline)...")
    try:
        start = time.perf_counter()
        enhanced = enhance_image(test_image)
        total_time = time.perf_counter() - start
        print(f"    OK — output shape: {enhanced.shape}, "
              f"dtype: {enhanced.dtype}, "
              f"time: {total_time*1000:.2f} ms")
        print(f"    Mean per channel (R, G, B): "
              f"{enhanced[:,:,0].mean():.1f}, "
              f"{enhanced[:,:,1].mean():.1f}, "
              f"{enhanced[:,:,2].mean():.1f}")
    except Exception as exc:
        print(f"    FAIL — {exc.__class__.__name__}: {exc}")
        return 1

    # ------------------------------------------------------------------
    # Step 6: Validate output properties
    # ------------------------------------------------------------------
    print("\n[6] Validating output properties...")

    checks_passed = True

    if enhanced.shape != test_image.shape:
        print(f"    FAIL — shape mismatch: "
              f"input {test_image.shape} vs output {enhanced.shape}")
        checks_passed = False
    else:
        print(f"    OK — shape preserved: {enhanced.shape}")

    if enhanced.dtype != np.uint8:
        print(f"    FAIL — expected uint8, got {enhanced.dtype}")
        checks_passed = False
    else:
        print(f"    OK — dtype preserved: {enhanced.dtype}")

    if enhanced.min() < 0 or enhanced.max() > 255:
        print(f"    FAIL — values out of [0, 255] range")
        checks_passed = False
    else:
        print(f"    OK — values in valid range: "
              f"[{enhanced.min()}, {enhanced.max()}]")

    if not np.array_equal(enhanced, test_image):
        print("    OK — output differs from input (enhancement applied)")
    else:
        print("    WARNING — output is identical to input")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    if checks_passed:
        print("RESULT: All enhancement function tests passed.")
        return 0
    else:
        print("RESULT: Some checks failed. See details above.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
