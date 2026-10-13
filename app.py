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
MAX_HISTORY  = 20   # cap session history to limit memory usage

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


# ─── Session-state helpers ────────────────────────────────────

def _init_state() -> None:
    """Initialise session-state keys on first run."""
    if "sessions" not in st.session_state:
        st.session_state.sessions: list[dict] = []
    if "active_id" not in st.session_state:
        st.session_state.active_id = None
    if "upload_key" not in st.session_state:
        st.session_state.upload_key = 0


def _get_active() -> dict | None:
    """Return the currently active session dict, or None."""
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
    """Create a new analysis session and make it active."""
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
        "results":   None,          # populated after processing
    }
    st.session_state.sessions.insert(0, session)
    # Trim history to keep memory bounded
    if len(st.session_state.sessions) > MAX_HISTORY:
        st.session_state.sessions.pop()
    st.session_state.active_id = sid
    return session


# ─── Enhancement runner ───────────────────────────────────────

def _run_enhancement(session: dict) -> bool:
    """
    Run the enhance_image() pipeline on the session's original image.

    Stores the result dict in session["results"] on success.
    Returns True on success, False on failure (error shown via st.error).
    """
    original = session["array"]

    # Validate input
    if original is None or not isinstance(original, np.ndarray):
        st.error("No valid image data found in the current session.")
        return False

    if original.ndim != 3 or original.shape[2] != 3:
        st.error(
            f"Enhancement requires an RGB image with shape (H, W, 3). "
            f"Got shape {original.shape}."
        )
        return False

    if original.dtype != np.uint8:
        original = np.clip(original, 0, 255).astype(np.uint8)

    # Import at call time so the cached env check stays lightweight
    try:
        from aquavision.enhancement.traditional import enhance_image
    except ImportError as exc:
        st.error(f"Cannot import enhancement module: {exc}")
        return False

    # Run the enhancement pipeline with timing
    try:
        t0 = time.perf_counter()
        enhanced = enhance_image(original)
        t1 = time.perf_counter()
    except Exception as exc:
        st.error(f"Enhancement failed: {exc.__class__.__name__}: {exc}")
        return False

    # Validate output
    if not isinstance(enhanced, np.ndarray):
        st.error("Enhancement returned a non-array result.")
        return False

    if enhanced.shape != original.shape:
        st.error(
            f"Enhancement output shape {enhanced.shape} differs from "
            f"input shape {original.shape}."
        )
        return False

    if enhanced.dtype != np.uint8:
        enhanced = np.clip(enhanced, 0, 255).astype(np.uint8)

    duration_ms = (t1 - t0) * 1000

    # Store results
    session["results"] = {
        "enhanced_array": enhanced,
        "enhanced_pil":   PILImage.fromarray(enhanced, mode="RGB"),
        "duration_ms":    duration_ms,
        "method":         "Gray-World White Balance + CLAHE",
        "timestamp":      datetime.now().strftime("%I:%M:%S %p"),
    }
    return True


# ═════════════════════════════════════════════════════════════
#  SIDEBAR — branding, new-analysis button, history, status
# ═════════════════════════════════════════════════════════════

def _render_sidebar(env: dict) -> None:
    with st.sidebar:
        # ── Brand ──
        st.markdown(
            '<p class="aq-brand">AquaVision AI</p>',
            unsafe_allow_html=True,
        )
        st.caption("Underwater enhancement · Marine detection")

        st.markdown('<div style="height:0.3rem"></div>', unsafe_allow_html=True)

        # ── New Analysis ──
        if st.button("＋  New Analysis", use_container_width=True, type="primary"):
            st.session_state.active_id = None
            st.session_state.upload_key += 1
            st.rerun()

        st.divider()

        # ── History ──
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
                # Show timestamp and processing indicator
                status = "  ✓" if s.get("results") else ""
                st.markdown(
                    f'<p class="hist-time">{s["date"]}  ·  {s["time"]}{status}</p>',
                    unsafe_allow_html=True,
                )
        else:
            st.caption("No analyses yet.")

        # ── System status ──
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
#  CENTRAL WORKSPACE — empty / upload state
# ═════════════════════════════════════════════════════════════

def _render_upload() -> None:
    """Show the centered upload zone when no image is active."""
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
                arr     = np.asarray(pil_img)
                _create_session(uploaded.name, pil_img, arr, uploaded.size)
                st.rerun()
            except Exception as exc:
                st.error(f"Cannot read file as an image: {exc}")


# ═════════════════════════════════════════════════════════════
#  CENTRAL WORKSPACE — image loaded
# ═════════════════════════════════════════════════════════════

def _render_workspace(session: dict) -> None:
    """Render the workspace: original preview, comparison, or results."""

    results   = session.get("results")
    compare   = session["settings"].get("compare", True)
    pil_orig  = session["pil"]
    w, h      = pil_orig.size
    kb        = session["file_size"] / 1024
    size_str  = f"{kb:.0f} KB" if kb < 1024 else f"{kb / 1024:.1f} MB"

    # ── If enhancement results exist and comparison is on ──
    if results and compare:
        col_orig, col_enh = st.columns(2, gap="medium")
        with col_orig:
            st.markdown(
                '<p class="comparison-label">Original</p>',
                unsafe_allow_html=True,
            )
            st.image(pil_orig, use_container_width=True)
        with col_enh:
            st.markdown(
                '<p class="comparison-label">Enhanced</p>',
                unsafe_allow_html=True,
            )
            st.image(results["enhanced_pil"], use_container_width=True)

    elif results and not compare:
        # Show only the enhanced image
        st.markdown(
            '<p class="comparison-label">Enhanced</p>',
            unsafe_allow_html=True,
        )
        st.image(results["enhanced_pil"], use_container_width=True)

    else:
        # No results yet — show original only
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

    # ── Processing information ──
    if results:
        st.markdown(
            '<p class="ws-label">Processing Information</p>',
            unsafe_allow_html=True,
        )

        enh_pil = results["enhanced_pil"]
        ew, eh  = enh_pil.size

        info_items = [
            ("Method",            results["method"]),
            ("Processing time",   f'{results["duration_ms"]:.1f} ms'),
            ("Original size",     f"{w} × {h} px"),
            ("Enhanced size",     f"{ew} × {eh} px"),
            ("Output dtype",      "uint8"),
            ("Processed at",      results["timestamp"]),
        ]

        rows = "".join(
            f"<tr><td>{k}</td><td>{v}</td></tr>" for k, v in info_items
        )
        st.markdown(
            f'<table class="proc-table"><tbody>{rows}</tbody></table>',
            unsafe_allow_html=True,
        )

        # ── Download button ──
        st.markdown('<div style="height:0.4rem"></div>', unsafe_allow_html=True)
        _render_download(session)

    else:
        # No results — prompt user
        st.markdown(
            '<p class="ws-label">Results</p>',
            unsafe_allow_html=True,
        )
        st.caption(
            "Select processing options in the right panel and click "
            "Process Image to run enhancement."
        )


def _render_download(session: dict) -> None:
    """Provide a download button for the enhanced image."""
    results = session.get("results")
    if results is None:
        return

    enhanced_pil = results["enhanced_pil"]
    stem = Path(session["filename"]).stem
    download_name = f"{stem}_enhanced.png"

    # Encode to PNG in memory
    buf = io.BytesIO()
    enhanced_pil.save(buf, format="PNG")
    buf.seek(0)

    st.download_button(
        label="Download Enhanced Image",
        data=buf,
        file_name=download_name,
        mime="image/png",
        use_container_width=True,
    )


# ═════════════════════════════════════════════════════════════
#  RIGHT PANEL — processing settings
# ═════════════════════════════════════════════════════════════

def _render_settings(session: dict, env: dict) -> None:
    """Render the right-hand processing-options panel."""

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
    has_results = session.get("results") is not None

    if enhance_on and env["enhance_ok"]:
        can_process = True
    else:
        can_process = False

    # If enhancement is disabled, show note instead of disabled button
    if not enhance_on:
        st.caption("Enable enhancement to process the image.")
    elif not env["enhance_ok"]:
        st.caption("Enhancement module unavailable.")

    clicked = st.button(
        "Process Image",
        type="primary",
        use_container_width=True,
        disabled=not can_process,
    )

    if clicked:
        with st.spinner("Running enhancement..."):
            success = _run_enhancement(session)
        if success:
            st.rerun()

    # Status note
    if has_results:
        st.markdown(
            f'<p class="settings-note">'
            f'Processed · {session["results"]["duration_ms"]:.0f} ms</p>',
            unsafe_allow_html=True,
        )
    elif not enhance_on:
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
