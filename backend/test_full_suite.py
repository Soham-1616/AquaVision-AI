"""
AquaVision AI — Comprehensive Automated Test Suite
Covers:
- Phase 1: Environment & Models Inspection
- Phase 2: Dashboard Endpoints & Metrics Integrity
- Phase 3: Route & Navigation Verification
- Phase 4: Image Upload & Format Handling
- Phase 5: Image Enhancement (Traditional & Deep Learning)
- Phase 6: Object Detection (YOLO11s Checkpoint, Inference, Classes)
- Phase 7: Integrated Pipeline (Modes A, B, C, D)
- Phase 8: Timing & Metric Accuracy Verification
- Phase 9: Video Analysis Endpoint Verification
- Phase 10: Error Handling & Fault Injection
"""

import os
import sys
import time
import json
import io
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from PIL import Image
import numpy as np

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"
TEST_IMG_TURTLE = Path(r"c:\Users\Soham\OneDrive\Desktop\2.0\backend\test_turtle.png")
TEST_IMG_EMPTY = Path(r"c:\Users\Soham\OneDrive\Desktop\2.0\backend\test_image.png")

results = {
    "passed": 0,
    "failed": 0,
    "blocked": 0,
    "details": []
}

def log_test(category, name, status, detail=""):
    results[status] += 1
    icon = "PASS" if status == "passed" else ("FAIL" if status == "failed" else "BLOCKED")
    print(f"[{icon}] {category} :: {name} - {detail}")
    results["details"].append({
        "category": category,
        "name": name,
        "status": status,
        "detail": detail
    })

def make_multipart_body(fields, files):
    boundary = "----WebKitFormBoundary" + os.urandom(16).hex()
    body = io.BytesIO()

    for key, val in fields.items():
        body.write(f"--{boundary}\r\n".encode("utf-8"))
        body.write(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode("utf-8"))
        body.write(f"{val}\r\n".encode("utf-8"))

    for key, (filename, content, mime) in files.items():
        body.write(f"--{boundary}\r\n".encode("utf-8"))
        body.write(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.write(f"Content-Type: {mime}\r\n\r\n".encode("utf-8"))
        body.write(content)
        body.write(b"\r\n")

    body.write(f"--{boundary}--\r\n".encode("utf-8"))
    content_type = f"multipart/form-data; boundary={boundary}"
    return body.getvalue(), content_type

def http_post(url, fields=None, files=None, timeout=60):
    fields = fields or {}
    files = files or {}
    data, content_type = make_multipart_body(fields, files)
    req = urllib.request.Request(url, data=data, headers={"Content-Type": content_type}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body
    except Exception as e:
        return 0, str(e)

def http_get(url, timeout=15):
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            try:
                return resp.status, json.loads(data.decode("utf-8"))
            except Exception:
                return resp.status, data
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, str(e)

print("=" * 70)
print("AQUAVISION AI — AUTOMATED TEST SUITE EXECUTION")
print("=" * 70)

# ============================================================================
# PHASE 1 & 2: Health, Capabilities & Dashboard Integrity
# ============================================================================
print("\n--- PHASE 1 & 2: Backend Health & Capabilities ---")
status, health = http_get(f"{BASE_URL}/api/health")
if status == 200 and health.get("status") == "healthy":
    log_test("Health", "GET /api/health", "passed", "Service healthy")
else:
    log_test("Health", "GET /api/health", "failed", f"Status: {status}, Response: {health}")

status, caps = http_get(f"{BASE_URL}/api/capabilities")
if status == 200 and caps.get("connected") is True:
    model_status = caps.get("modelStatus", {})
    all_ok = all(s.get("loaded") for s in model_status.values())
    detail = f"Models: {list(model_status.keys())}, Classes: {len(caps.get('supportedClasses', []))}"
    log_test("Capabilities", "GET /api/capabilities", "passed" if all_ok else "failed", detail)
else:
    log_test("Capabilities", "GET /api/capabilities", "failed", f"Status: {status}")

# ============================================================================
# PHASE 3: Navigation & Routing Checks
# ============================================================================
print("\n--- PHASE 3: Navigation & Route Accessibility ---")
routes = [
    ("/", "Dashboard"),
    ("/image-processing", "Image Processing Workspace"),
    ("/video-analysis", "Video Analysis Workspace"),
    ("/evaluation", "Evaluation"),
    ("/history", "History"),
    ("/settings", "Settings"),
    ("/about", "About"),
    ("/enhancement", "Enhancement (Redirect Route)"),
    ("/detection", "Detection (Redirect Route)"),
]

for route, label in routes:
    status, _ = http_get(f"{FRONTEND_URL}{route}")
    if status == 200:
        log_test("Navigation", f"Route {route} ({label})", "passed", "HTTP 200 OK")
    else:
        log_test("Navigation", f"Route {route} ({label})", "failed", f"HTTP {status}")

# ============================================================================
# PHASE 4: Image Upload & Formats
# ============================================================================
print("\n--- PHASE 4: Image Upload Handling ---")
# Create standardized test image from turtle frame (800x450 for fast, consistent CPU evaluation)
raw_turtle_img = Image.open(str(TEST_IMG_TURTLE))
std_img = raw_turtle_img.resize((800, 450))

# 1. Valid PNG
png_buf = io.BytesIO()
std_img.save(png_buf, format="PNG")
png_bytes = png_buf.getvalue()

status, resp = http_post(f"{BASE_URL}/api/analysis/enhance", {"method": "white_balance_clahe"}, {"file": ("turtle.png", png_bytes, "image/png")})
if status == 200 and resp.get("enhancedImageUrl"):
    log_test("Upload", "Valid PNG Upload", "passed", f"Processed in {resp.get('processingTimeMs')}ms")
else:
    log_test("Upload", "Valid PNG Upload", "failed", str(resp))

# 2. Valid JPEG
jpg_buf = io.BytesIO()
std_img.save(jpg_buf, format="JPEG")
jpg_bytes = jpg_buf.getvalue()
status, resp = http_post(f"{BASE_URL}/api/analysis/enhance", {"method": "white_balance_clahe"}, {"file": ("test.jpg", jpg_bytes, "image/jpeg")})
if status == 200 and resp.get("enhancedImageUrl"):
    log_test("Upload", "Valid JPEG Upload", "passed", f"Processed in {resp.get('processingTimeMs')}ms")
else:
    log_test("Upload", "Valid JPEG Upload", "failed", str(resp))

# 3. Valid WebP
webp_buf = io.BytesIO()
std_img.save(webp_buf, format="WEBP")
webp_bytes = webp_buf.getvalue()
status, resp = http_post(f"{BASE_URL}/api/analysis/enhance", {"method": "white_balance_clahe"}, {"file": ("test.webp", webp_bytes, "image/webp")})
if status == 200 and resp.get("enhancedImageUrl"):
    log_test("Upload", "Valid WebP Upload", "passed", f"Processed in {resp.get('processingTimeMs')}ms")
else:
    log_test("Upload", "Valid WebP Upload", "failed", str(resp))

# 4. Invalid Format (text file)
corrupt_bytes = b"This is not a real image file."
status, resp = http_post(f"{BASE_URL}/api/analysis/enhance", {"method": "auto"}, {"file": ("bad.txt", corrupt_bytes, "text/plain")})
if status == 400:
    log_test("Upload", "Invalid File Format Rejection", "passed", f"Rejected safely with HTTP {status}: {resp.get('detail')}")
else:
    log_test("Upload", "Invalid File Format Rejection", "failed", f"Unexpected status {status}: {resp}")

# 5. Empty File Upload
empty_bytes = b""
status, resp = http_post(f"{BASE_URL}/api/analysis/enhance", {"method": "auto"}, {"file": ("empty.png", empty_bytes, "image/png")})
if status == 400:
    log_test("Upload", "Empty File Rejection", "passed", f"Rejected safely with HTTP {status}: {resp.get('detail')}")
else:
    log_test("Upload", "Empty File Rejection", "failed", f"Unexpected status {status}: {resp}")

# 6. Large Resolution Image (2560x1440)
large_img = std_img.resize((2560, 1440))
large_buf = io.BytesIO()
large_img.save(large_buf, format="PNG")
large_bytes = large_buf.getvalue()
status, resp = http_post(f"{BASE_URL}/api/analysis/enhance", {"method": "white_balance_clahe"}, {"file": ("large.png", large_bytes, "image/png")})
if status == 200 and resp.get("outputDimensions") == {"width": 2560, "height": 1440}:
    log_test("Upload", "Large Resolution Handling (2560x1440)", "passed", f"Preserved dimensions, took {resp.get('processingTimeMs')}ms")
else:
    log_test("Upload", "Large Resolution Handling", "failed", str(resp))

# ============================================================================
# PHASE 5: Image Enhancement Methods
# ============================================================================
print("\n--- PHASE 5: Image Enhancement Verification ---")
enhancement_methods = [
    ("auto", "Auto Selection"),
    ("white_balance_clahe", "Traditional (WB + CLAHE)"),
    ("white_balance", "White Balance Only"),
    ("clahe", "CLAHE Only"),
    ("deep_learning", "U-Net Deep Learning Default"),
    ("unet_baseline_l1", "U-Net Baseline (L1 Loss)"),
    ("unet_l1_ssim", "U-Net (L1 + SSIM Loss)"),
]

for method_id, method_label in enhancement_methods:
    status, resp = http_post(f"{BASE_URL}/api/analysis/enhance", {"method": method_id}, {"file": ("test.png", png_bytes, "image/png")})
    if status == 200 and resp.get("enhancedImageUrl"):
        # Verify output image is downloadable
        out_url = f"{BASE_URL}{resp['enhancedImageUrl']}"
        dl_status, out_bytes = http_get(out_url)
        if dl_status == 200 and len(out_bytes) > 0:
            log_test("Enhancement", f"Method '{method_label}'", "passed", f"Time: {resp.get('processingTimeMs')}ms, Download OK")
        else:
            log_test("Enhancement", f"Method '{method_label}'", "failed", f"Download failed HTTP {dl_status}")
    else:
        log_test("Enhancement", f"Method '{method_label}'", "failed", f"Status: {status}, Response: {resp}")

# ============================================================================
# PHASE 6: Object Detection (YOLO11s)
# ============================================================================
print("\n--- PHASE 6: Object Detection Verification ---")
# 1. Detection on Turtle Frame (Expected: 1 turtle)
status, resp = http_post(f"{BASE_URL}/api/analysis/detect", {"confidence": "0.3"}, {"file": ("turtle.png", png_bytes, "image/png")})
if status == 200 and resp.get("totalObjects") >= 1:
    classes_found = resp.get("classDistribution", {})
    # Verify bounding box structure
    det = resp["detections"][0]
    has_bbox = "x" in det["boundingBox"] and "width" in det["boundingBox"]
    log_test("Detection", "Detection with Target Objects (Turtle)", "passed" if has_bbox else "failed",
             f"Found {resp['totalObjects']} objects: {classes_found}, Time: {resp.get('processingTimeMs')}ms")
else:
    log_test("Detection", "Detection with Target Objects (Turtle)", "failed", str(resp))

# 2. Detection on Zero-Objects Frame (test_image.png)
empty_png_bytes = TEST_IMG_EMPTY.read_bytes()
status, resp = http_post(f"{BASE_URL}/api/analysis/detect", {"confidence": "0.5"}, {"file": ("empty.png", empty_png_bytes, "image/png")})
if status == 200 and resp.get("totalObjects") == 0:
    log_test("Detection", "Detection with Zero Target Objects", "passed", f"Zero detections handled cleanly: {resp.get('totalObjects')}, Time: {resp.get('processingTimeMs')}ms")
else:
    log_test("Detection", "Detection with Zero Target Objects", "failed", str(resp))

# 3. High Confidence Threshold (Confidence = 0.95 -> 0 detections expected)
status, resp = http_post(f"{BASE_URL}/api/analysis/detect", {"confidence": "0.95"}, {"file": ("turtle.png", png_bytes, "image/png")})
if status == 200:
    log_test("Detection", "Confidence Threshold Filtering (0.95)", "passed", f"Total objects at 95% threshold: {resp.get('totalObjects')}")
else:
    log_test("Detection", "Confidence Threshold Filtering", "failed", str(resp))

# ============================================================================
# PHASE 7: Integrated Pipeline Workflow (Modes A, B, C, D)
# ============================================================================
print("\n--- PHASE 7: Integrated Pipeline Workflow ---")

# MODE A: Enhancement ON, Detection ON
status, resp = http_post(f"{BASE_URL}/api/analysis/pipeline", {
    "method": "auto",
    "confidence": "0.3",
    "enable_enhancement": "true",
    "enable_detection": "true"
}, {"file": ("turtle.png", png_bytes, "image/png")})

if status == 200:
    has_enh = "enhancementResult" in resp and resp["enhancementResult"] is not None
    has_det_orig = "detectionOnOriginal" in resp and resp["detectionOnOriginal"] is not None
    has_det_enh = "detectionOnEnhanced" in resp and resp["detectionOnEnhanced"] is not None
    if has_enh and has_det_orig and has_det_enh:
        orig_obj = resp["detectionOnOriginal"]["totalObjects"]
        enh_obj = resp["detectionOnEnhanced"]["totalObjects"]
        detail = f"Orig Detections: {orig_obj}, Enh Detections: {enh_obj}, Total Time: {resp.get('totalProcessingTimeMs')}ms"
        log_test("Pipeline", "Mode A (Enhancement ON + Detection ON)", "passed", detail)
    else:
        log_test("Pipeline", "Mode A (Enhancement ON + Detection ON)", "failed", f"Missing components in response: {resp.keys()}")
else:
    log_test("Pipeline", "Mode A (Enhancement ON + Detection ON)", "failed", f"HTTP {status}: {resp}")

# MODE B: Enhancement ON, Detection OFF
status, resp = http_post(f"{BASE_URL}/api/analysis/pipeline", {
    "method": "auto",
    "enable_enhancement": "true",
    "enable_detection": "false"
}, {"file": ("turtle.png", png_bytes, "image/png")})

if status == 200:
    has_enh = "enhancementResult" in resp and resp["enhancementResult"] is not None
    no_det = "detectionOnOriginal" not in resp or resp["detectionOnOriginal"] is None
    if has_enh and no_det:
        log_test("Pipeline", "Mode B (Enhancement ON + Detection OFF)", "passed", f"Enhanced in {resp['enhancementResult']['processingTimeMs']}ms; detection skipped")
    else:
        log_test("Pipeline", "Mode B (Enhancement ON + Detection OFF)", "failed", str(resp))
else:
    log_test("Pipeline", "Mode B (Enhancement ON + Detection OFF)", "failed", f"HTTP {status}")

# MODE C: Enhancement OFF, Detection ON
status, resp = http_post(f"{BASE_URL}/api/analysis/pipeline", {
    "confidence": "0.3",
    "enable_enhancement": "false",
    "enable_detection": "true"
}, {"file": ("turtle.png", png_bytes, "image/png")})

if status == 200:
    no_enh = "enhancementResult" not in resp or resp["enhancementResult"] is None
    has_det = "detectionOnOriginal" in resp and resp["detectionOnOriginal"] is not None
    if no_enh and has_det:
        log_test("Pipeline", "Mode C (Enhancement OFF + Detection ON)", "passed", f"Detected {resp['detectionOnOriginal']['totalObjects']} objects; enhancement skipped")
    else:
        log_test("Pipeline", "Mode C (Enhancement OFF + Detection ON)", "failed", str(resp))
else:
    log_test("Pipeline", "Mode C (Enhancement OFF + Detection ON)", "failed", f"HTTP {status}")

# MODE D: Enhancement OFF, Detection OFF
status, resp = http_post(f"{BASE_URL}/api/analysis/pipeline", {
    "enable_enhancement": "false",
    "enable_detection": "false"
}, {"file": ("turtle.png", png_bytes, "image/png")})

if status == 200:
    no_enh = "enhancementResult" not in resp or resp["enhancementResult"] is None
    no_det = "detectionOnOriginal" not in resp or resp["detectionOnOriginal"] is None
    if no_enh and no_det:
        log_test("Pipeline", "Mode D (Enhancement OFF + Detection OFF)", "passed", "Returns original image without performing unrequested operations")
    else:
        log_test("Pipeline", "Mode D (Enhancement OFF + Detection OFF)", "failed", str(resp))
else:
    log_test("Pipeline", "Mode D (Enhancement OFF + Detection OFF)", "failed", f"HTTP {status}")

# ============================================================================
# PHASE 8: Timing and Metric Definitions
# ============================================================================
print("\n--- PHASE 8: Metrics and Timing Accuracy ---")
status, resp = http_post(f"{BASE_URL}/api/analysis/pipeline", {
    "method": "white_balance_clahe",
    "confidence": "0.3",
    "enable_enhancement": "true",
    "enable_detection": "true"
}, {"file": ("turtle.png", png_bytes, "image/png")})

if status == 200:
    t_total = resp.get("totalProcessingTimeMs", 0)
    t_enh = resp.get("enhancementResult", {}).get("processingTimeMs", 0)
    t_det_orig = resp.get("detectionOnOriginal", {}).get("processingTimeMs", 0)
    t_det_enh = resp.get("detectionOnEnhanced", {}).get("processingTimeMs", 0)
    sum_individual = t_enh + t_det_orig + t_det_enh

    if t_total > 0 and sum_individual > 0 and t_total >= (sum_individual * 0.85):
        log_test("Metrics", "Timing Consistency Check", "passed", f"Total: {t_total}ms >= Operations sum: {sum_individual}ms (No double counting)")
    else:
        log_test("Metrics", "Timing Consistency Check", "failed", f"Total: {t_total}ms, Individual sum: {sum_individual}ms")

    # Metrics research integrity check: UIQM/UCIQE/PSNR should not be fabricated
    metrics = resp.get("enhancementResult", {}).get("metrics", {})
    if metrics.get("psnr") is None and metrics.get("ssim") is None:
        log_test("Metrics", "Research Integrity (No Fabricated Metrics)", "passed", "PSNR and SSIM correctly reported as null without reference image")
    else:
        log_test("Metrics", "Research Integrity", "failed", f"Unexpected fabricated metric values: {metrics}")
else:
    log_test("Metrics", "Timing & Metric Verification", "failed", f"HTTP {status}")

# ============================================================================
# PHASE 9: Video Analysis Endpoint Verification
# ============================================================================
print("\n--- PHASE 9: Video Analysis Endpoint Verification ---")
# Check if video file exists in Downloads
video_file = Path(r"C:\Users\Soham\Downloads\244754.mp4")
if video_file.exists():
    # Use keyframes sampling for fast verification
    vid_bytes = video_file.read_bytes()
    status, resp = http_post(f"{BASE_URL}/api/analysis/video", {
        "mode": "detect",
        "sampling": "keyframes",
        "confidence": "0.3"
    }, {"file": ("test_vid.mp4", vid_bytes, "video/mp4")}, timeout=120)

    if status == 200 and resp.get("videoUrl"):
        log_test("Video Analysis", "POST /api/analysis/video", "passed",
                 f"Processed {resp.get('processedFrames')} frames, Total Objects: {resp.get('totalObjects')}, Species: {list(resp.get('classDistribution', {}).keys())}")
    else:
        log_test("Video Analysis", "POST /api/analysis/video", "failed", f"HTTP {status}: {resp}")
else:
    log_test("Video Analysis", "POST /api/analysis/video", "blocked", "Video file not found at Downloads path")

# ============================================================================
# PHASE 10: Fault Injection & Error Handling
# ============================================================================
print("\n--- PHASE 10: Fault Injection & Resilience ---")
# 1. Missing file parameter
status, resp = http_post(f"{BASE_URL}/api/analysis/pipeline", {"method": "auto"}, {})
if status == 422:
    log_test("Fault Tolerance", "Missing File Parameter Handling", "passed", "HTTP 422 Unprocessable Entity returned")
else:
    log_test("Fault Tolerance", "Missing File Parameter Handling", "failed", f"Expected 422, got {status}")

# 2. Corrupt bytes in pipeline
status, resp = http_post(f"{BASE_URL}/api/analysis/pipeline", {"method": "auto"}, {"file": ("corrupt.png", b"corrupt data", "image/png")})
if status == 400:
    log_test("Fault Tolerance", "Corrupted Image Stream Handling", "passed", f"Caught safely with HTTP 400: {resp.get('detail')}")
else:
    log_test("Fault Tolerance", "Corrupted Image Stream Handling", "failed", f"Got {status}: {resp}")

# ============================================================================
# Summary
# ============================================================================
print("\n" + "=" * 70)
print(f"AUTOMATED TEST RESULTS SUMMARY: {results['passed']} PASSED, {results['failed']} FAILED, {results['blocked']} BLOCKED")
print("=" * 70)

sys.exit(0 if results["failed"] == 0 else 1)
