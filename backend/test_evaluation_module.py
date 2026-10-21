"""
AquaVision AI — Evaluation Module Verification Test Suite
Tests:
1. Benchmark endpoint returns exact verified metrics (RUOD & UIEB).
2. Enhancement returns genuine UIQM and UCIQE scores.
3. PSNR & SSIM properly require paired reference image.
4. Pipeline returns genuine metrics for both enhancement and detection.
"""

import sys
import json
import urllib.request
import requests
import numpy as np
import cv2
from evaluation_metrics import (
    calculate_uciqe,
    calculate_uiqm,
    calculate_psnr,
    calculate_ssim,
    get_benchmark_metrics,
)

BASE_URL = "http://localhost:8000"

def test_evaluation():
    print("======================================================================")
    print("AQUAVISION AI — EVALUATION MODULE VERIFICATION")
    print("======================================================================")

    # 1. Test calculation functions directly
    print("\n--- Test 1: Direct Metric Calculations ---")
    img1 = np.random.randint(50, 200, (256, 256, 3), dtype=np.uint8)
    img2 = np.clip(img1.astype(np.int16) + 15, 0, 255).astype(np.uint8)

    uciqe = calculate_uciqe(img1)
    uiqm = calculate_uiqm(img1)
    assert uciqe > 0, f"Expected UCIQE > 0, got {uciqe}"
    assert uiqm > 0, f"Expected UIQM > 0, got {uiqm}"
    print(f"[PASS] calculate_uciqe returned: {uciqe:.4f}")
    print(f"[PASS] calculate_uiqm returned: {uiqm:.4f}")

    psnr_ref = calculate_psnr(img1, img2)
    ssim_ref = calculate_ssim(img1, img2)
    psnr_none = calculate_psnr(img1, None)
    ssim_none = calculate_ssim(img1, None)
    assert psnr_ref is not None and psnr_ref > 0, f"Expected positive PSNR with ref, got {psnr_ref}"
    assert ssim_ref is not None and 0 <= ssim_ref <= 1, f"Expected SSIM in [0,1], got {ssim_ref}"
    assert psnr_none is None, "Expected PSNR to be None without ref"
    assert ssim_none is None, "Expected SSIM to be None without ref"
    print(f"[PASS] PSNR with reference: {psnr_ref} dB, without reference: {psnr_none}")
    print(f"[PASS] SSIM with reference: {ssim_ref}, without reference: {ssim_none}")

    # 2. Test benchmark metrics data
    print("\n--- Test 2: Model Benchmark Specifications ---")
    bench = get_benchmark_metrics()
    assert "enhancement" in bench and "detection" in bench
    enh_bench = bench["enhancement"]
    det_bench = bench["detection"]

    assert enh_bench["psnr"] == 18.425
    assert enh_bench["ssim"] == 0.7790
    assert enh_bench["uiqm"] == 2.7627
    assert enh_bench["uciqe"] == 24.0636
    print(f"[PASS] Enhancement UIEB Benchmark: PSNR={enh_bench['psnr']} dB, SSIM={enh_bench['ssim']}, UIQM={enh_bench['uiqm']}, UCIQE={enh_bench['uciqe']}")

    assert det_bench["precision"] == 0.83872
    assert det_bench["recall"] == 0.76986
    assert det_bench["f1Score"] == 0.8028
    assert det_bench["mAP50"] == 0.84035
    assert det_bench["mAP5095"] == 0.59572
    print(f"[PASS] Detection RUOD Benchmark: Precision={det_bench['precision']}, Recall={det_bench['recall']}, F1={det_bench['f1Score']}, mAP50={det_bench['mAP50']}, mAP5095={det_bench['mAP5095']}")

    # 3. Test GET /api/evaluation/benchmark
    print("\n--- Test 3: GET /api/evaluation/benchmark Endpoint ---")
    res = requests.get(f"{BASE_URL}/api/evaluation/benchmark", timeout=5)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    api_bench = res.json()
    assert api_bench["enhancement"]["dataset"] == "UIEB (Underwater Image Enhancement Benchmark)"
    assert api_bench["detection"]["dataset"] == "RUOD (Real-world Underwater Object Detection)"
    print(f"[PASS] /api/evaluation/benchmark HTTP 200 OK — returned valid benchmark payloads")

    # 4. Test POST /api/analysis/enhance returns genuine UIQM and UCIQE
    print("\n--- Test 4: POST /api/analysis/enhance Metrics Integration ---")
    _, img_encoded = cv2.imencode('.png', img1)
    files = {'file': ('sample.png', img_encoded.tobytes(), 'image/png')}
    data = {'method': 'clahe'}

    r_enh = requests.post(f"{BASE_URL}/api/analysis/enhance", files=files, data=data, timeout=10)
    assert r_enh.status_code == 200, f"Enhance failed: {r_enh.status_code}"
    enh_resp = r_enh.json()
    metrics = enh_resp.get("metrics", {})
    assert metrics.get("uiqm") is not None and metrics["uiqm"] > 0, f"Expected positive float uiqm, got {metrics.get('uiqm')}"
    assert metrics.get("uciqe") is not None and metrics["uciqe"] > 0, f"Expected positive float uciqe, got {metrics.get('uciqe')}"
    assert metrics.get("psnr") is None, "Expected PSNR to be None without reference image"
    assert metrics.get("ssim") is None, "Expected SSIM to be None without reference image"
    print(f"[PASS] Enhance returned computed UIQM={metrics['uiqm']} and UCIQE={metrics['uciqe']} (PSNR & SSIM correctly None)")

    # 5. Test POST /api/analysis/pipeline Metrics Integration
    print("\n--- Test 5: POST /api/analysis/pipeline Metrics Integration ---")
    files = {'file': ('sample.png', img_encoded.tobytes(), 'image/png')}
    data = {'enable_enhancement': 'true', 'enable_detection': 'true', 'enhancement_method': 'clahe', 'confidence': '0.3'}
    r_pipe = requests.post(f"{BASE_URL}/api/analysis/pipeline", files=files, data=data, timeout=10)
    assert r_pipe.status_code == 200, f"Pipeline failed: {r_pipe.status_code}"
    pipe_resp = r_pipe.json()
    enh_res = pipe_resp.get("enhancementResult", {})
    det_res = pipe_resp.get("detectionOnOriginal", {})
    assert enh_res.get("metrics", {}).get("uiqm") is not None, "Pipeline enhancement UIQM missing"
    assert enh_res.get("metrics", {}).get("uciqe") is not None, "Pipeline enhancement UCIQE missing"
    assert "avgConfidence" in det_res.get("metrics", {}), "Pipeline detection avgConfidence missing"
    print(f"[PASS] Pipeline returned enhancement UIQM={enh_res['metrics']['uiqm']}, UCIQE={enh_res['metrics']['uciqe']}")
    print(f"[PASS] Pipeline returned detection metrics: {det_res['metrics']}")

    print("\n======================================================================")
    print("ALL EVALUATION MODULE TESTS PASSED PERFECTLY!")
    print("======================================================================")

if __name__ == "__main__":
    test_evaluation()
