"""
AquaVision AI — Single-Workspace Application

Underwater image enhancement and marine object detection.

Launch:
    streamlit run app.py
"""

from __future__ import annotations

import platform
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
        "results":   None,          # will hold processing output later
    }
    st.session_state.sessions.insert(0, session)
    # Trim history to keep memory bounded
    if len(st.session_state.sessions) > MAX_HISTORY:
        st.session_state.sessions.pop()
    st.session_state.active_id = sid
    return session


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
                st.markdown(
                    f'<p class="hist-time">{s["date"]}  ·  {s["time"]}</p>',
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
    """Render the image preview and metadata for an active session."""

    pil_img  = session["pil"]
    w, h     = pil_img.size
    kb       = session["file_size"] / 1024
    size_str = f"{kb:.0f} KB" if kb < 1024 else f"{kb / 1024:.1f} MB"

    # ── Image ──
    st.image(pil_img, use_container_width=True)

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

    # ── Results area (placeholder for Phase 4+) ──
    if session.get("results"):
        # Future: render comparison tabs, detection overlays, etc.
        pass
    else:
        st.markdown(
            '<p class="ws-label">Results</p>',
            unsafe_allow_html=True,
        )
        st.caption(
            "Select processing options in the right panel and click "
            "Process Image to run enhancement and detection."
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
    can_process = enhance_on or (
        env["model_present"] and session["settings"].get("detect", False)
    )
    clicked = st.button(
        "Process Image",
        type="primary",
        use_container_width=True,
        disabled=not can_process,
    )

    if clicked:
        st.toast("Processing will be integrated in Phase 4.", icon="ℹ️")

    st.markdown(
        '<p class="settings-note">Integration: next phase</p>',
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
