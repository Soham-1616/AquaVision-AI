"""
AquaVision AI — Single-Workspace Application

Underwater image enhancement and marine object detection.

Launch:
    streamlit run app.py
"""

from __future__ import annotations

import io
import platform
import time
import uuid
from datetime import datetime
from pathlib import Path

import numpy as np
import streamlit as st
from PIL import Image as PILImage

# ─── Page configuration (must be first st call) ──────────────

st.set_page_config(
    page_title="AquaVision AI",
    page_icon="◈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Constants ────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent
MODEL_PATH   = PROJECT_ROOT / "models" / "best.pt"
CSS_PATH     = PROJECT_ROOT / "assets" / "style.css"
MAX_HISTORY  = 20

# Inference settings — identical for original and enhanced images
YOLO_IMGSZ = 640
YOLO_CONF  = 0.25
YOLO_IOU   = 0.45

# ─── CSS ──────────────────────────────────────────────────────

if CSS_PATH.is_file():
    st.markdown(
        f"<style>{CSS_PATH.read_text(encoding='utf-8')}</style>",
        unsafe_allow_html=True,
    )

# ─── Environment probe (cached per session) ──────────────────

@st.cache_data(show_spinner=False)
def _check_env() -> dict:
    """Check enhancement availability and model checkpoint."""
    r: dict = {}
    try:
        from aquavision.enhancement.traditional import enhance_image  # noqa: F401
        r["enhance_ok"] = True
    except ImportError as exc:
        r["enhance_ok"]  = False
        r["enhance_err"] = str(exc)

    r["model_present"] = MODEL_PATH.is_file()
    return r


# ─── YOLO model cache (loaded once, reused across reruns) ─────

@st.cache_resource(show_spinner=False)
def _load_yolo():
    """Load the YOLO model once per session. Returns (model, error_str)."""
    try:
        from aquavision.detection.detector import load_model
        model = load_model(MODEL_PATH)
        return model, None
    except Exception as exc:
        return None, str(exc)


# ─── Session-state helpers ────────────────────────────────────

def _init_state() -> None:
    if "sessions" not in st.session_state:
        st.session_state.sessions: list[dict] = []
    if "active_id" not in st.session_state:
        st.session_state.active_id = None
    if "upload_key" not in st.session_state:
        st.session_state.upload_key = 0


def _get_active() -> dict | None:
    for s in st.session_state.sessions:
        if s["id"] == st.session_state.active_id:
            return s
    return None


def _create_session(
    filename: str,
    pil_img: PILImage.Image,
    arr: np.ndarray,
    file_size: int,
) -> dict:
    sid = uuid.uuid4().hex[:8]
    session = {
        "id":        sid,
        "filename":  filename,
        "time":      datetime.now().strftime("%I:%M %p"),
        "date":      datetime.now().strftime("%b %d"),
        "pil":       pil_img,
        "array":     arr,
        "file_size": file_size,
        "settings":  {"enhance": True, "detect": False, "compare": True},
        "results":   None,
    }
    st.session_state.sessions.insert(0, session)
    if len(st.session_state.sessions) > MAX_HISTORY:
        st.session_state.sessions.pop()
    st.session_state.active_id = sid
    return session


# ═════════════════════════════════════════════════════════════
#  PROCESSING — enhancement + detection
# ═════════════════════════════════════════════════════════════

def _run_processing(session: dict, env: dict) -> bool:
    """
    Execute the full processing pipeline based on current settings.

    Runs enhancement and/or detection as configured.
    Stores all results in session["results"].
    Returns True on success, False on failure.
    """
    original = session["array"]
    settings = session["settings"]
    do_enhance = settings.get("enhance", False) and env["enhance_ok"]
    do_detect  = settings.get("detect", False) and env["model_present"]

    if not do_enhance and not do_detect:
        st.warning("Enable at least one processing option.")
        return False

    # ── Validate input ──
    if original is None or not isinstance(original, np.ndarray):
        st.error("No valid image data in the current session.")
        return False
    if original.ndim != 3 or original.shape[2] != 3:
        st.error(f"Expected RGB image (H, W, 3), got shape {original.shape}.")
        return False
    if original.dtype != np.uint8:
        original = np.clip(original, 0, 255).astype(np.uint8)

    results: dict = {"timestamp": datetime.now().strftime("%I:%M:%S %p")}

    # ── Enhancement ──
    enhanced = None
    if do_enhance:
        try:
            from aquavision.enhancement.traditional import enhance_image
            t0 = time.perf_counter()
            enhanced = enhance_image(original)
            t1 = time.perf_counter()
        except Exception as exc:
            st.error(f"Enhancement failed: {exc.__class__.__name__}: {exc}")
            return False

        if enhanced.dtype != np.uint8:
            enhanced = np.clip(enhanced, 0, 255).astype(np.uint8)

        results["enhanced_array"] = enhanced
        results["enhanced_pil"]   = PILImage.fromarray(enhanced, mode="RGB")
        results["enhance_ms"]     = (t1 - t0) * 1000
        results["enhance_method"] = "Gray-World White Balance + CLAHE"

    # ── Detection ──
    if do_detect:
        model, model_err = _load_yolo()
        if model is None:
            st.error(f"Cannot load YOLO model: {model_err}")
            # Enhancement still succeeded — store partial results
            if do_enhance:
                session["results"] = results
            return False

        try:
            from aquavision.detection.detector import run_detection

            # Detection on original image
            det_orig = run_detection(
                model, original,
                imgsz=YOLO_IMGSZ, conf=YOLO_CONF, iou=YOLO_IOU,
            )
            results["det_original"] = det_orig

            # Detection on enhanced image (if available)
            if enhanced is not None:
                det_enh = run_detection(
                    model, enhanced,
                    imgsz=YOLO_IMGSZ, conf=YOLO_CONF, iou=YOLO_IOU,
                )
                results["det_enhanced"] = det_enh

            # Store model class names for reference
            names = det_orig.model_class_names
            results["model_class_names"] = names

        except Exception as exc:
            st.error(f"Detection failed: {exc.__class__.__name__}: {exc}")
            # Enhancement may have succeeded — keep those results
            if do_enhance:
                session["results"] = results
            return False

    session["results"] = results
    return True


# ═════════════════════════════════════════════════════════════
#  SIDEBAR
# ═════════════════════════════════════════════════════════════

def _render_sidebar(env: dict) -> None:
    with st.sidebar:
        st.markdown(
            '<p class="aq-brand">AquaVision AI</p>',
            unsafe_allow_html=True,
        )
        st.caption("Underwater enhancement · Marine detection")
        st.markdown('<div style="height:0.3rem"></div>', unsafe_allow_html=True)

        if st.button("＋  New Analysis", use_container_width=True, type="primary"):
            st.session_state.active_id = None
            st.session_state.upload_key += 1
            st.rerun()

        st.divider()

        if st.session_state.sessions:
            st.markdown(
                '<p class="section-label">Recent</p>',
                unsafe_allow_html=True,
            )
            for s in st.session_state.sessions:
                is_active = s["id"] == st.session_state.active_id
                name = s["filename"]
                if len(name) > 28:
                    name = name[:25] + "…"
                label = f"▸  {name}" if is_active else name
                if st.button(label, key=f"h_{s['id']}", use_container_width=True):
                    st.session_state.active_id = s["id"]
                    st.rerun()
                status = "  ✓" if s.get("results") else ""
                st.markdown(
                    f'<p class="hist-time">{s["date"]}  ·  {s["time"]}{status}</p>',
                    unsafe_allow_html=True,
                )
        else:
            st.caption("No analyses yet.")

        st.divider()
        st.markdown(
            '<p class="section-label">System</p>',
            unsafe_allow_html=True,
        )

        enh_dot = "dot-ok" if env["enhance_ok"] else "dot-err"
        enh_lbl = "Enhancement" if env["enhance_ok"] else "Enhancement  (error)"
        st.markdown(
            f'<div class="status-row"><span class="{enh_dot}"></span>{enh_lbl}</div>',
            unsafe_allow_html=True,
        )

        det_dot = "dot-ok" if env["model_present"] else "dot-warn"
        det_lbl = "Detection" if env["model_present"] else "Detection  (unavailable)"
        st.markdown(
            f'<div class="status-row"><span class="{det_dot}"></span>{det_lbl}</div>',
            unsafe_allow_html=True,
        )

        st.markdown(
            f'<p style="font-size:0.68rem;color:#3E4047;margin-top:0.7rem">'
            f'Python {platform.python_version()} · v0.1.0</p>',
            unsafe_allow_html=True,
        )


# ═════════════════════════════════════════════════════════════
#  UPLOAD ZONE (empty state)
# ═════════════════════════════════════════════════════════════

def _render_upload() -> None:
    _, col_center, _ = st.columns([1, 2, 1])
    with col_center:
        st.markdown(
            '<div class="upload-header">'
            '<p class="upload-title">AquaVision AI</p>'
            '<p class="upload-subtitle">'
            'Underwater image enhancement and marine object detection'
            '</p>'
            '</div>',
            unsafe_allow_html=True,
        )
        uploaded = st.file_uploader(
            "Upload an underwater image to begin",
            type=["jpg", "jpeg", "png"],
            key=f"uploader_{st.session_state.upload_key}",
        )
        st.markdown(
            '<p class="upload-hint">'
            'Designed for underwater imagery  ·  JPG, JPEG, PNG'
            '</p>',
            unsafe_allow_html=True,
        )
        if uploaded is not None:
            try:
                pil_img = PILImage.open(uploaded).convert("RGB")
                arr = np.asarray(pil_img)
                _create_session(uploaded.name, pil_img, arr, uploaded.size)
                st.rerun()
            except Exception as exc:
                st.error(f"Cannot read file as an image: {exc}")


# ═════════════════════════════════════════════════════════════
#  WORKSPACE (image loaded)
# ═════════════════════════════════════════════════════════════

def _render_workspace(session: dict) -> None:
    results  = session.get("results")
    compare  = session["settings"].get("compare", True)
    pil_orig = session["pil"]
    w, h     = pil_orig.size
    kb       = session["file_size"] / 1024
    size_str = f"{kb:.0f} KB" if kb < 1024 else f"{kb / 1024:.1f} MB"

    has_enhance = results and "enhanced_pil" in results
    has_det     = results and "det_original" in results

    # ── Decide which view to show ──
    if has_det and has_enhance and compare:
        _render_detection_comparison(session, results)
    elif has_det and not has_enhance:
        _render_detection_single(session, results)
    elif has_enhance and compare:
        _render_enhance_comparison(session, results)
    elif has_enhance and not compare:
        st.markdown(
            '<p class="comparison-label">Enhanced</p>',
            unsafe_allow_html=True,
        )
        st.image(results["enhanced_pil"], use_container_width=True)
    else:
        st.image(pil_orig, use_container_width=True)

    # ── Metadata strip ──
    st.markdown(
        f'<div class="meta-strip">'
        f'<span class="meta-filename">{session["filename"]}</span>'
        f'<span>{w} × {h} px</span>'
        f'<span>RGB</span>'
        f'<span>{size_str}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )

    # ── Processing info ──
    if results:
        _render_processing_info(session, results)
    else:
        st.markdown(
            '<p class="ws-label">Results</p>',
            unsafe_allow_html=True,
        )
        st.caption(
            "Select processing options in the right panel and click "
            "Process Image."
        )


def _render_enhance_comparison(session: dict, results: dict) -> None:
    """Side-by-side: Original vs Enhanced (no detection)."""
    col_a, col_b = st.columns(2, gap="medium")
    with col_a:
        st.markdown(
            '<p class="comparison-label">Original</p>',
            unsafe_allow_html=True,
        )
        st.image(session["pil"], use_container_width=True)
    with col_b:
        st.markdown(
            '<p class="comparison-label">Enhanced</p>',
            unsafe_allow_html=True,
        )
        st.image(results["enhanced_pil"], use_container_width=True)


def _render_detection_comparison(session: dict, results: dict) -> None:
    """Tabbed view when both enhancement and detection ran."""
    tab_enh, tab_det_orig, tab_det_enh = st.tabs([
        "Enhancement",
        "Original Detection",
        "Enhanced Detection",
    ])

    with tab_enh:
        col_a, col_b = st.columns(2, gap="medium")
        with col_a:
            st.markdown(
                '<p class="comparison-label">Original</p>',
                unsafe_allow_html=True,
            )
            st.image(session["pil"], use_container_width=True)
        with col_b:
            st.markdown(
                '<p class="comparison-label">Enhanced</p>',
                unsafe_allow_html=True,
            )
            st.image(results["enhanced_pil"], use_container_width=True)

    with tab_det_orig:
        det = results["det_original"]
        st.markdown(
            '<p class="comparison-label">Original — YOLO Detection</p>',
            unsafe_allow_html=True,
        )
        if det.annotated_image is not None:
            st.image(det.annotated_image, use_container_width=True)
        else:
            st.image(session["pil"], use_container_width=True)
        _render_detection_summary(det, "Original")

    with tab_det_enh:
        det_e = results.get("det_enhanced")
        if det_e is not None:
            st.markdown(
                '<p class="comparison-label">Enhanced — YOLO Detection</p>',
                unsafe_allow_html=True,
            )
            if det_e.annotated_image is not None:
                st.image(det_e.annotated_image, use_container_width=True)
            else:
                st.image(results["enhanced_pil"], use_container_width=True)
            _render_detection_summary(det_e, "Enhanced")
        else:
            st.caption("Enhanced detection not available.")


def _render_detection_single(session: dict, results: dict) -> None:
    """Detection on original only (enhancement was disabled)."""
    det = results["det_original"]
    st.markdown(
        '<p class="comparison-label">Original — YOLO Detection</p>',
        unsafe_allow_html=True,
    )
    if det.annotated_image is not None:
        st.image(det.annotated_image, use_container_width=True)
    else:
        st.image(session["pil"], use_container_width=True)
    _render_detection_summary(det, "Original")


def _render_detection_summary(det, label: str) -> None:
    """Show compact detection stats for one image."""
    if det.count == 0:
        st.caption(f"{label}: No objects detected.")
        st.caption(f"Inference time: {det.inference_ms:.1f} ms")
        return

    # Class distribution
    from collections import Counter
    class_counts = Counter(det.class_names)
    class_str = ", ".join(
        f"{name} ({count})" for name, count in class_counts.most_common()
    )

    conf_min = float(det.confidences.min())
    conf_max = float(det.confidences.max())
    conf_mean = float(det.confidences.mean())

    rows = [
        ("Detections",       str(det.count)),
        ("Classes found",    class_str),
        ("Confidence range", f"{conf_min:.2f} – {conf_max:.2f}"),
        ("Mean confidence",  f"{conf_mean:.2f}"),
        ("Inference time",   f"{det.inference_ms:.1f} ms"),
    ]
    td = "".join(f"<tr><td>{k}</td><td>{v}</td></tr>" for k, v in rows)
    st.markdown(
        f'<table class="proc-table"><tbody>{td}</tbody></table>',
        unsafe_allow_html=True,
    )


def _render_processing_info(session: dict, results: dict) -> None:
    """Processing info table and download buttons."""
    st.markdown(
        '<p class="ws-label">Processing Information</p>',
        unsafe_allow_html=True,
    )

    w, h = session["pil"].size
    info_items: list[tuple[str, str]] = []

    # Enhancement info
    if "enhance_ms" in results:
        enh_pil = results["enhanced_pil"]
        ew, eh  = enh_pil.size
        info_items.extend([
            ("Enhancement",       results.get("enhance_method", "—")),
            ("Enhancement time",  f'{results["enhance_ms"]:.1f} ms'),
            ("Original size",     f"{w} × {h} px"),
            ("Enhanced size",     f"{ew} × {eh} px"),
        ])

    # Detection info
    if "det_original" in results:
        det_o = results["det_original"]
        info_items.extend([
            ("Detection model",        "YOLOv8n (RUOD)"),
            ("Input resolution",       f"{YOLO_IMGSZ} px"),
            ("Confidence threshold",   f"{YOLO_CONF}"),
            ("NMS IoU threshold",      f"{YOLO_IOU}"),
            ("Original detections",    str(det_o.count)),
            ("Original inference",     f"{det_o.inference_ms:.1f} ms"),
        ])

        det_e = results.get("det_enhanced")
        if det_e is not None:
            info_items.extend([
                ("Enhanced detections", str(det_e.count)),
                ("Enhanced inference",  f"{det_e.inference_ms:.1f} ms"),
            ])

    info_items.append(("Processed at", results.get("timestamp", "—")))

    rows = "".join(
        f"<tr><td>{k}</td><td>{v}</td></tr>" for k, v in info_items
    )
    st.markdown(
        f'<table class="proc-table"><tbody>{rows}</tbody></table>',
        unsafe_allow_html=True,
    )

    # ── Downloads ──
    st.markdown('<div style="height:0.4rem"></div>', unsafe_allow_html=True)
    if "enhanced_pil" in results:
        _render_download(session, results["enhanced_pil"], "enhanced")
    if "det_original" in results and results["det_original"].annotated_image is not None:
        _render_download_det(session, results["det_original"], "detection_original")
    if "det_enhanced" in results and results["det_enhanced"].annotated_image is not None:
        _render_download_det(session, results["det_enhanced"], "detection_enhanced")


def _render_download(session: dict, pil_img: PILImage.Image, suffix: str) -> None:
    stem = Path(session["filename"]).stem
    download_name = f"{stem}_{suffix}.png"
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    buf.seek(0)
    st.download_button(
        label=f"Download {suffix.replace('_', ' ').title()}",
        data=buf,
        file_name=download_name,
        mime="image/png",
        use_container_width=True,
    )


def _render_download_det(session: dict, det, suffix: str) -> None:
    stem = Path(session["filename"]).stem
    download_name = f"{stem}_{suffix}.png"
    pil_img = PILImage.fromarray(det.annotated_image, mode="RGB")
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    buf.seek(0)
    st.download_button(
        label=f"Download {suffix.replace('_', ' ').title()}",
        data=buf,
        file_name=download_name,
        mime="image/png",
        use_container_width=True,
    )


# ═════════════════════════════════════════════════════════════
#  RIGHT PANEL — settings
# ═════════════════════════════════════════════════════════════

def _render_settings(session: dict, env: dict) -> None:
    st.markdown(
        '<p class="settings-heading">Processing</p>',
        unsafe_allow_html=True,
    )
    st.divider()

    # ── Enhancement ──
    st.markdown("**Enhancement**")
    enhance_on = st.checkbox(
        "Gray-World + CLAHE",
        value=session["settings"].get("enhance", True),
        key=f"enh_{session['id']}",
    )
    session["settings"]["enhance"] = enhance_on

    if env["enhance_ok"]:
        st.markdown(
            '<p class="settings-note">White balance → contrast enhancement</p>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            '<p class="settings-warn">Module import error</p>',
            unsafe_allow_html=True,
        )

    st.markdown("")

    # ── Object Detection ──
    st.markdown("**Object Detection**")
    if env["model_present"]:
        detect_on = st.checkbox(
            "YOLOv8n (RUOD)",
            value=session["settings"].get("detect", False),
            key=f"det_{session['id']}",
        )
        session["settings"]["detect"] = detect_on
        st.markdown(
            '<p class="settings-note">10 marine classes · 640 px</p>',
            unsafe_allow_html=True,
        )
    else:
        st.checkbox(
            "YOLOv8n (RUOD)",
            value=False,
            disabled=True,
            key=f"det_{session['id']}",
        )
        st.markdown(
            '<p class="settings-warn">Checkpoint required: models/best.pt</p>',
            unsafe_allow_html=True,
        )

    st.markdown("")

    # ── Comparison ──
    st.markdown("**Comparison**")
    compare_on = st.checkbox(
        "Side-by-side view",
        value=session["settings"].get("compare", True),
        key=f"cmp_{session['id']}",
    )
    session["settings"]["compare"] = compare_on

    st.divider()

    # ── Process button ──
    can_enhance = enhance_on and env["enhance_ok"]
    can_detect  = session["settings"].get("detect", False) and env["model_present"]
    can_process = can_enhance or can_detect

    if not can_process:
        if not enhance_on and not session["settings"].get("detect", False):
            st.caption("Enable at least one processing option.")
        elif not env["enhance_ok"]:
            st.caption("Enhancement module unavailable.")

    clicked = st.button(
        "Process Image",
        type="primary",
        use_container_width=True,
        disabled=not can_process,
    )

    if clicked:
        # Clear stale results before re-processing
        session["results"] = None
        spinner_text = "Processing"
        if can_enhance and can_detect:
            spinner_text = "Enhancing and detecting..."
        elif can_enhance:
            spinner_text = "Running enhancement..."
        elif can_detect:
            spinner_text = "Running detection..."

        with st.spinner(spinner_text):
            success = _run_processing(session, env)
        if success:
            st.rerun()

    # Status note
    has_results = session.get("results") is not None
    if has_results:
        r = session["results"]
        parts = []
        if "enhance_ms" in r:
            parts.append(f"Enhanced ({r['enhance_ms']:.0f} ms)")
        if "det_original" in r:
            parts.append(f"Detected ({r['det_original'].count} obj)")
        st.markdown(
            f'<p class="settings-note">{" · ".join(parts)}</p>',
            unsafe_allow_html=True,
        )
    elif not enhance_on and not session["settings"].get("detect", False):
        st.markdown(
            '<p class="settings-note">Original image retained</p>',
            unsafe_allow_html=True,
        )


# ═════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═════════════════════════════════════════════════════════════

def main() -> None:
    env = _check_env()
    _init_state()
    _render_sidebar(env)

    active = _get_active()

    if active is None:
        _render_upload()
    else:
        col_ws, col_settings = st.columns([3, 1], gap="large")
        with col_ws:
            _render_workspace(active)
        with col_settings:
            _render_settings(active, env)


if __name__ == "__main__":
    main()
