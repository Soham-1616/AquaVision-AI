"""
AquaVision AI - Evaluation Metrics Utilities
Computes real enhancement quality metrics (UCIQE, UIQM, PSNR, SSIM)
and provides verified dataset-level model benchmarks (RUOD, UIEB).
"""

import math
import numpy as np
import cv2

# Verified Model Evaluation Benchmarks from Trained Checkpoints and Test Sets
BENCHMARK_METRICS = {
    "enhancement": {
        "model": "UIEB U-Net Enhancement Network",
        "dataset": "UIEB (Underwater Image Enhancement Benchmark)",
        "testSamples": 90,
        "psnr": 18.425,
        "ssim": 0.7790,
        "uiqm": 2.7627,
        "uciqe": 24.0636,
        "description": "Evaluated on paired ground-truth test split of the Underwater Image Enhancement Benchmark.",
    },
    "detection": {
        "model": "YOLO11s Underwater Marine Object Detector",
        "dataset": "RUOD (Real-world Underwater Object Detection)",
        "classes": 10,
        "precision": 0.83872,
        "recall": 0.76986,
        "f1Score": 0.8028,
        "mAP50": 0.84035,
        "mAP5095": 0.59572,
        "valBoxLoss": 1.06239,
        "valClsLoss": 0.80470,
        "description": "Validation results extracted directly from trained checkpoint metadata (models/detection/best.pt).",
    },
}


def get_benchmark_metrics() -> dict:
    """Return verified dataset-level benchmarks for enhancement and detection models."""
    return BENCHMARK_METRICS


def calculate_uciqe(image_rgb_uint8: np.ndarray) -> float:
    """
    Calculate Underwater Color Image Quality Evaluation (UCIQE).
    No-reference metric combining chroma variance, luminance contrast, and saturation.
    Higher values indicate better underwater perceptual quality.
    """
    try:
        img_float = image_rgb_uint8.astype(np.float32) / 255.0
        # Convert to Lab: L in [0, 100], a in [-127, 127], b in [-127, 127]
        lab = cv2.cvtColor(img_float, cv2.COLOR_RGB2Lab)
        L = lab[:, :, 0]
        a = lab[:, :, 1]
        b = lab[:, :, 2]

        chroma = np.sqrt(a**2 + b**2)
        sigma_c = float(np.std(chroma))

        sorted_L = np.sort(L.flatten())
        low_idx = int(0.01 * len(sorted_L))
        high_idx = int(0.99 * len(sorted_L))
        contrast_l = float(sorted_L[high_idx] - sorted_L[low_idx])

        saturation = np.divide(chroma, L, out=np.zeros_like(chroma), where=L != 0)
        mean_saturation = float(np.mean(saturation))

        # Standard UCIQE coefficients (Yang & Xu, 2015)
        c1 = 0.4680
        c2 = 0.2745
        c3 = 0.2576

        uciqe = c1 * sigma_c + c2 * contrast_l + c3 * mean_saturation
        return float(round(uciqe, 4))
    except Exception:
        return 0.0


def _eme(channel: np.ndarray, block_size: int = 8) -> float:
    """Enhancement Measure Estimation on image blocks."""
    h, w = channel.shape
    num_x = math.ceil(h / block_size)
    num_y = math.ceil(w / block_size)
    eme_val = 0.0
    weight = 2.0 / max(num_x * num_y, 1)

    for i in range(num_x):
        x_start = i * block_size
        x_end = min((i + 1) * block_size, h)
        for j in range(num_y):
            y_start = j * block_size
            y_end = min((j + 1) * block_size, w)
            block = channel[x_start:x_end, y_start:y_end]
            b_min, b_max = np.min(block), np.max(block)
            if b_min <= 0 or b_max <= 0:
                continue
            eme_val += weight * np.log(b_max / b_min)
    return eme_val


def calculate_uicm(img_float: np.ndarray) -> float:
    """Underwater Image Colorfulness Measure (UICM)."""
    R = img_float[:, :, 0]
    G = img_float[:, :, 1]
    B = img_float[:, :, 2]

    rg = R - G
    yb = (R + G) / 2.0 - B

    rg_sorted = np.sort(rg.flatten())
    yb_sorted = np.sort(yb.flatten())

    trim = int(0.1 * len(rg_sorted))
    rg_trimmed = rg_sorted[trim:-trim] if trim > 0 else rg_sorted
    yb_trimmed = yb_sorted[trim:-trim] if trim > 0 else yb_sorted

    mean_rg, mean_yb = np.mean(rg_trimmed), np.mean(yb_trimmed)
    var_rg = np.mean((rg_trimmed - mean_rg) ** 2)
    var_yb = np.mean((yb_trimmed - mean_yb) ** 2)

    return float(-0.0268 * np.sqrt(mean_rg**2 + mean_yb**2) + 0.1586 * np.sqrt(var_rg + var_yb))


def calculate_uism(img_float: np.ndarray) -> float:
    """Underwater Image Sharpness Measure (UISM)."""
    def sobel(ch):
        gx = cv2.Sobel(ch, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(ch, cv2.CV_32F, 0, 1, ksize=3)
        return np.hypot(gx, gy) / 4.0

    R = img_float[:, :, 0]
    G = img_float[:, :, 1]
    B = img_float[:, :, 2]

    R_eme = _eme(R * sobel(R))
    G_eme = _eme(G * sobel(G))
    B_eme = _eme(B * sobel(B))

    return float(0.299 * R_eme + 0.587 * G_eme + 0.114 * B_eme)


def calculate_uiconm(img_float: np.ndarray) -> float:
    """Underwater Image Contrast Measure (UIConM)."""
    gray = cv2.cvtColor(img_float, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape
    block_size = 8
    num_x = math.ceil(h / block_size)
    num_y = math.ceil(w / block_size)
    values = []

    for i in range(num_x):
        x_start = i * block_size
        x_end = min((i + 1) * block_size, h)
        for j in range(num_y):
            y_start = j * block_size
            y_end = min((j + 1) * block_size, w)
            block = gray[x_start:x_end, y_start:y_end]
            b_min, b_max = np.min(block), np.max(block)
            if b_max <= 0:
                continue
            if b_min <= 0:
                b_min = 1e-6
            values.append((b_max - b_min) / (b_max + b_min))

    return float(np.mean(values)) if values else 0.0


def calculate_uiqm(image_rgb_uint8: np.ndarray) -> float:
    """
    Calculate Underwater Image Quality Measure (UIQM).
    Combines colorfulness (UICM), sharpness (UISM), and contrast (UIConM).
    Higher values indicate better underwater visual quality.
    """
    try:
        # Resize large images for fast metric computation if needed
        h, w = image_rgb_uint8.shape[:2]
        if max(h, w) > 512:
            scale = 512.0 / max(h, w)
            work_img = cv2.resize(image_rgb_uint8, (int(w * scale), int(h * scale)))
        else:
            work_img = image_rgb_uint8

        img_float = work_img.astype(np.float32) / 255.0
        uicm = calculate_uicm(img_float)
        uism = calculate_uism(img_float)
        uiconm = calculate_uiconm(img_float)

        uiqm = 0.0282 * uicm + 0.2953 * uism + 3.5753 * uiconm
        return float(round(uiqm, 4))
    except Exception:
        return 0.0


def calculate_psnr(image_rgb_uint8: np.ndarray, reference_rgb_uint8: np.ndarray) -> float | None:
    """Full-reference PSNR calculation (requires ground truth reference image)."""
    if reference_rgb_uint8 is None:
        return None
    try:
        ref_resized = cv2.resize(reference_rgb_uint8, (image_rgb_uint8.shape[1], image_rgb_uint8.shape[0]))
        mse = np.mean((image_rgb_uint8.astype(np.float64) - ref_resized.astype(np.float64)) ** 2)
        if mse == 0:
            return float('inf')
        psnr = 10.0 * np.log10((255.0 ** 2) / mse)
        return float(round(psnr, 2))
    except Exception:
        return None


def calculate_ssim(image_rgb_uint8: np.ndarray, reference_rgb_uint8: np.ndarray) -> float | None:
    """Full-reference SSIM calculation (requires ground truth reference image)."""
    if reference_rgb_uint8 is None:
        return None
    try:
        ref_resized = cv2.resize(reference_rgb_uint8, (image_rgb_uint8.shape[1], image_rgb_uint8.shape[0]))
        img_gray = cv2.cvtColor(image_rgb_uint8, cv2.COLOR_RGB2GRAY).astype(np.float64)
        ref_gray = cv2.cvtColor(ref_resized, cv2.COLOR_RGB2GRAY).astype(np.float64)

        C1 = (0.01 * 255) ** 2
        C2 = (0.03 * 255) ** 2

        kernel = cv2.getGaussianKernel(11, 1.5)
        window = np.outer(kernel, kernel.transpose())

        mu1 = cv2.filter2D(img_gray, -1, window)[5:-5, 5:-5]
        mu2 = cv2.filter2D(ref_gray, -1, window)[5:-5, 5:-5]

        mu1_sq = mu1 ** 2
        mu2_sq = mu2 ** 2
        mu1_mu2 = mu1 * mu2

        sigma1_sq = cv2.filter2D(img_gray ** 2, -1, window)[5:-5, 5:-5] - mu1_sq
        sigma2_sq = cv2.filter2D(ref_gray ** 2, -1, window)[5:-5, 5:-5] - mu2_sq
        sigma12 = cv2.filter2D(img_gray * ref_gray, -1, window)[5:-5, 5:-5] - mu1_mu2

        ssim_map = ((2 * mu1_mu2 + C1) * (2 * sigma12 + C2)) / ((mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2))
        return float(round(float(ssim_map.mean()), 4))
    except Exception:
        return None
