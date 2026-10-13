"""
AquaVision AI — Main Application Entry Point

Intelligent Underwater Image Enhancement and Marine Object Detection System

Launch:
    streamlit run app.py
"""

from __future__ import annotations

import importlib
import platform
from pathlib import Path

import streamlit as st

# ---------------------------------------------------------------------------
# Page config — must be the first Streamlit call
# ---------------------------------------------------------------------------

st.set_page_config(
    page_title="AquaVision AI",
    page_icon="◈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent
MODEL_PATH   = PROJECT_ROOT / "models" / "best.pt"
CSS_PATH     = PROJECT_ROOT / "assets" / "style.css"

# ---------------------------------------------------------------------------
# CSS injection — called once per page render
# ---------------------------------------------------------------------------

def _inject_css() -> None:
    """Inject custom stylesheet. Falls back gracefully if file is missing."""
    if CSS_PATH.is_file():
        st.markdown(
            f"<style>{CSS_PATH.read_text(encoding='utf-8')}</style>",
            unsafe_allow_html=True,
        )


# ---------------------------------------------------------------------------
# Environment check — cached for the session
# ---------------------------------------------------------------------------

@st.cache_data(show_spinner=False)
def _check_env() -> dict:
    """
    Probe package availability and the model checkpoint.
    Runs once per Streamlit session (cached).
    """
    r: dict = {}

    # aquavision package
    try:
        import aquavision
        r["aquavision_ok"]  = True
        r["aquavision_loc"] = str(Path(aquavision.__file__).resolve().parent)
    except ImportError as exc:
        r["aquavision_ok"]  = False
        r["aquavision_err"] = str(exc)

    # enhance_image function
    try:
        from aquavision.enhancement.traditional import enhance_image  # noqa: F401
        r["enhance_ok"] = True
    except ImportError as exc:
        r["enhance_ok"]  = False
        r["enhance_err"] = str(exc)

    # preprocessing
    try:
        from aquavision.preprocessing.image import load_image  # noqa: F401
        r["preprocess_ok"] = True
    except ImportError as exc:
        r["preprocess_ok"]  = False
        r["preprocess_err"] = str(exc)

    # core third-party packages
    for mod_name, label in {
        "cv2": "OpenCV", "numpy": "NumPy",
        "PIL": "Pillow", "torch": "PyTorch",
        "ultralytics": "Ultralytics",
    }.items():
        try:
            mod = importlib.import_module(mod_name)
            r[f"pkg_{label}"] = getattr(mod, "__version__", "installed")
        except ImportError:
            r[f"pkg_{label}"] = None

    # model checkpoint
    r["model_present"] = MODEL_PATH.is_file()
    r["model_path"]    = str(MODEL_PATH)
    if r["model_present"]:
        r["model_size_mb"] = MODEL_PATH.stat().st_size / (1024 * 1024)

    return r


# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------

# Map label → page key so matching never depends on emoji
_PAGES = {
    "Overview":         "overview",
    "Image Analysis":   "image_analysis",
    "Enhancement":      "enhancement",
    "Object Detection": "detection",
    "About Project":    "about",
}

def _sidebar(env: dict) -> str:
    """Render sidebar; return the selected page key."""
    with st.sidebar:
        # Wordmark
        st.markdown(
            '<p class="aq-wordmark">Aqua<span>Vision</span> AI</p>'
            '<p class="aq-tagline">Underwater Enhancement · Marine Detection</p>',
            unsafe_allow_html=True,
        )

        st.markdown('<div style="height:0.6rem"></div>', unsafe_allow_html=True)

        # --- WORKSPACE section ---
        st.markdown(
            '<p class="nav-section-label">Workspace</p>',
            unsafe_allow_html=True,
        )
        workspace_pages = ["Overview", "Image Analysis", "Enhancement", "Object Detection"]
        selected = st.radio(
            "workspace_nav",
            options=workspace_pages,
            label_visibility="collapsed",
        )

        # --- INFORMATION section ---
        st.markdown(
            '<p class="nav-section-label">Information</p>',
            unsafe_allow_html=True,
        )
        info_pages = ["About Project"]
        selected_info = st.radio(
            "info_nav",
            options=info_pages,
            label_visibility="collapsed",
        )

        # Determine which group was most recently changed.
        # Streamlit re-runs on every widget change, so we track the last
        # touch via session_state.
        if "last_nav_group" not in st.session_state:
            st.session_state["last_nav_group"] = "workspace"

        # Use a sentinel to detect radio changes
        ws_key   = f"ws_{selected}"
        info_key = f"info_{selected_info}"

        if st.session_state.get("_prev_ws") != ws_key:
            st.session_state["last_nav_group"] = "workspace"
            st.session_state["_prev_ws"]       = ws_key

        if st.session_state.get("_prev_info") != info_key:
            st.session_state["last_nav_group"] = "info"
            st.session_state["_prev_info"]     = info_key

        active_page = (
            selected if st.session_state["last_nav_group"] == "workspace"
            else selected_info
        )

        # --- System status ---
        st.markdown('<div style="height:1rem"></div>', unsafe_allow_html=True)
        st.markdown(
            '<p class="nav-section-label">System</p>',
            unsafe_allow_html=True,
        )

        if env.get("enhance_ok"):
            dot, label = "sb-dot-ok", "Enhancement  Ready"
        else:
            dot, label = "sb-dot-err", "Enhancement  Error"

        st.markdown(
            f'<div class="sb-status-row"><div class="{dot}"></div>{label}</div>',
            unsafe_allow_html=True,
        )

        if env.get("model_present"):
            dot2, label2 = "sb-dot-ok",   "Detection     Ready"
        else:
            dot2, label2 = "sb-dot-warn", "Detection     Unavailable"

        st.markdown(
            f'<div class="sb-status-row"><div class="{dot2}"></div>{label2}</div>',
            unsafe_allow_html=True,
        )

        # Version footer
        st.markdown(
            f'<p class="sb-version">Python {platform.python_version()} · v0.1.0</p>',
            unsafe_allow_html=True,
        )

    return _PAGES.get(active_page, "overview")


# ---------------------------------------------------------------------------
# Page: Overview
# ---------------------------------------------------------------------------

def page_overview(env: dict) -> None:
    st.markdown(
        '<p class="pg-title">AquaVision AI</p>'
        '<p class="pg-subtitle">'
        'Intelligent Underwater Image Enhancement and Marine Object Detection'
        '</p>',
        unsafe_allow_html=True,
    )

    st.divider()

    # Problem
    st.markdown("#### The Problem")
    st.markdown(
        "Underwater images suffer from systematic degradation: dominant **blue-green "
        "colour casts** caused by differential light absorption, reduced contrast from "
        "suspended particle scattering, and localised haze. These effects degrade the "
        "performance of object detectors trained on clear-water or terrestrial imagery."
    )

    # Pipeline strip
    st.markdown(
        '<p class="section-label">Processing Pipeline</p>',
        unsafe_allow_html=True,
    )
    st.markdown(
        """
        <div class="pipeline-strip">
            <div class="pipe-step">Image Input</div>
            <div class="pipe-arrow">→</div>
            <div class="pipe-step">Gray-World White Balance</div>
            <div class="pipe-arrow">→</div>
            <div class="pipe-step">CLAHE Contrast Enhancement</div>
            <div class="pipe-arrow">→</div>
            <div class="pipe-step">YOLOv8n Detection</div>
            <div class="pipe-arrow">→</div>
            <div class="pipe-step">Comparison & Evaluation</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Two stages
    col_a, col_b = st.columns(2, gap="large")

    with col_a:
        st.markdown("**Stage 1 — Image Enhancement**")
        st.markdown(
            '<div class="callout callout-teal">'
            'A two-step algorithmic pipeline corrects the dominant degradation '
            'patterns in underwater imagery. <strong>Gray-World white balancing</strong> '
            'removes colour casts by normalising per-channel means to a common target. '
            '<strong>CLAHE</strong> then improves local contrast on the luminance '
            'channel without amplifying noise.'
            '</div>',
            unsafe_allow_html=True,
        )

    with col_b:
        st.markdown("**Stage 2 — Marine Object Detection**")
        st.markdown(
            '<div class="callout callout-teal">'
            'A <strong>YOLOv8n</strong> model fine-tuned on the RUOD dataset detects '
            'ten categories of marine organism. Detection is run on both the original '
            'and enhanced image under identical settings, enabling a controlled '
            'comparison of detection outcomes.'
            '</div>',
            unsafe_allow_html=True,
        )

    # System status
    st.markdown(
        '<p class="section-label">System Availability</p>',
        unsafe_allow_html=True,
    )

    c1, c2 = st.columns(2)
    with c1:
        if env.get("enhance_ok"):
            st.markdown(
                '<span class="badge-ok">● Enhancement module ready</span>',
                unsafe_allow_html=True,
            )
        else:
            st.markdown(
                '<span class="badge-err">● Enhancement import failed</span>',
                unsafe_allow_html=True,
            )
    with c2:
        if env.get("model_present"):
            sz = env.get("model_size_mb", 0)
            st.markdown(
                f'<span class="badge-ok">● YOLO checkpoint present ({sz:.0f} MB)</span>',
                unsafe_allow_html=True,
            )
        else:
            st.markdown(
                '<span class="badge-warn">● YOLO checkpoint not found — '
                'see models/README.md</span>',
                unsafe_allow_html=True,
            )

    st.markdown('<div style="height:0.8rem"></div>', unsafe_allow_html=True)
    st.info(
        "Upload an underwater image using **Image Analysis** in the sidebar to begin.",
        icon="→",
    )


# ---------------------------------------------------------------------------
# Page: Image Analysis
# ---------------------------------------------------------------------------

def page_image_analysis() -> None:
    st.markdown(
        '<p class="pg-title">Image Analysis</p>'
        '<p class="pg-subtitle">'
        'Upload an underwater image to begin the enhancement and detection pipeline.'
        '</p>',
        unsafe_allow_html=True,
    )

    st.divider()

    uploaded = st.file_uploader(
        "Select an image file (JPG, JPEG, PNG)",
        type=["jpg", "jpeg", "png"],
        help="The image is held in memory for the current session only.",
    )

    if uploaded is None:
        st.markdown(
            '<div class="upload-empty">'
            'No image selected. Use the file picker above to upload an underwater image.<br>'
            'A preview and image details will appear here.'
            '</div>',
            unsafe_allow_html=True,
        )
        return

    # Validate and open
    try:
        from PIL import Image as PILImage
        import numpy as np

        pil_image   = PILImage.open(uploaded).convert("RGB")
        image_array = np.asarray(pil_image)

    except Exception as exc:
        st.error(
            f"Cannot read the uploaded file as an image.\n\n"
            f"Error: `{exc}`\n\n"
            "Please upload a valid JPG, JPEG, or PNG file."
        )
        return

    # Persist for later pages
    st.session_state["uploaded_image"]    = image_array
    st.session_state["uploaded_filename"] = uploaded.name
    st.session_state["uploaded_pil"]      = pil_image

    st.markdown('<div style="height:0.5rem"></div>', unsafe_allow_html=True)

    col_img, col_info = st.columns([3, 2], gap="large")

    with col_img:
        st.markdown(
            '<p class="section-label">Preview</p>',
            unsafe_allow_html=True,
        )
        st.image(pil_image, use_container_width=True)

    with col_info:
        st.markdown(
            '<p class="section-label">File Information</p>',
            unsafe_allow_html=True,
        )

        w, h     = pil_image.size
        kb       = uploaded.size / 1024
        size_str = f"{kb:.1f} KB" if kb < 1024 else f"{kb/1024:.2f} MB"
        ch       = image_array.shape[2] if image_array.ndim == 3 else 1
        asp      = f"{w/h:.2f}" if h else "N/A"

        rows = [
            ("Filename",     uploaded.name),
            ("Dimensions",   f"{w} × {h} px"),
            ("File size",    size_str),
            ("Colour mode",  "RGB"),
            ("Channels",     str(ch)),
            ("Aspect ratio", asp),
            ("Array dtype",  str(image_array.dtype)),
        ]
        td = "".join(
            f"<tr><td>{k}</td><td>{v}</td></tr>" for k, v in rows
        )
        st.markdown(
            f'<table class="info-table"><tbody>{td}</tbody></table>',
            unsafe_allow_html=True,
        )

        st.markdown('<div style="height:0.8rem"></div>', unsafe_allow_html=True)
        st.success("Image loaded. Select Enhancement or Object Detection from the sidebar.")

    st.divider()
    st.caption(
        "Enhancement and object detection will be integrated in the next phases. "
        "The uploaded image is available to those pages for the duration of this session."
    )


# ---------------------------------------------------------------------------
# Page: Enhancement
# ---------------------------------------------------------------------------

def page_enhancement(env: dict) -> None:
    st.markdown(
        '<p class="pg-title">Image Enhancement</p>'
        '<p class="pg-subtitle">'
        'Gray-World white balancing followed by CLAHE contrast enhancement.'
        '</p>',
        unsafe_allow_html=True,
    )

    st.divider()

    # Module availability
    if env.get("enhance_ok"):
        st.markdown(
            '<span class="badge-ok">● enhance_image() imported and ready</span>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            f'<span class="badge-err">● Import failed — '
            f'{env.get("enhance_err", "unknown")}</span>',
            unsafe_allow_html=True,
        )
        st.caption("Run `pip install -e .` from the project root to resolve this.")

    # Pipeline explanation
    st.markdown(
        '<p class="section-label">Pipeline</p>',
        unsafe_allow_html=True,
    )

    col_a, col_b = st.columns(2, gap="large")

    with col_a:
        st.markdown("**Step 1 — Gray-World White Balance**")
        st.markdown(
            '<div class="callout">'
            'Assumes that the average colour of a natural scene is achromatic. '
            'Computes the mean intensity of each channel (R, G, B) and scales '
            'each channel so all three means match a common global target.<br><br>'
            'Implemented in <code>white_balance(image)</code>. '
            'Input: RGB uint8 array. Output: RGB uint8 array, same shape.'
            '</div>',
            unsafe_allow_html=True,
        )

    with col_b:
        st.markdown("**Step 2 — CLAHE Contrast Enhancement**")
        st.markdown(
            '<div class="callout">'
            'Converts the image to LAB colour space and applies Contrast Limited '
            'Adaptive Histogram Equalisation to the luminance (L) channel only. '
            'Improves local contrast without amplifying noise or introducing '
            'colour artefacts.<br><br>'
            'Implemented in <code>apply_clahe(image)</code>. '
            'Default clip limit: 2.0. Tile grid: 8 × 8.'
            '</div>',
            unsafe_allow_html=True,
        )

    st.markdown(
        '<p class="section-label">Combined Function</p>',
        unsafe_allow_html=True,
    )
    st.code(
        "from aquavision.enhancement.traditional import enhance_image\n"
        "\n"
        "# image: RGB uint8 NumPy array with shape (H, W, 3)\n"
        "enhanced = enhance_image(image)  # returns RGB uint8 array, same shape",
        language="python",
    )

    st.markdown('<div style="height:0.4rem"></div>', unsafe_allow_html=True)
    st.caption(
        "Enhancement execution (before/after comparison, quality metrics, and "
        "processing time) will be integrated in Phase 4."
    )


# ---------------------------------------------------------------------------
# Page: Object Detection
# ---------------------------------------------------------------------------

def page_detection(env: dict) -> None:
    st.markdown(
        '<p class="pg-title">Marine Object Detection</p>'
        '<p class="pg-subtitle">'
        'YOLOv8n detection on original and enhanced underwater images.'
        '</p>',
        unsafe_allow_html=True,
    )

    st.divider()

    # Model status — top priority
    if env.get("model_present"):
        sz = env.get("model_size_mb", 0)
        st.markdown(
            f'<span class="badge-ok">● Checkpoint found at models/best.pt ({sz:.0f} MB)</span>',
            unsafe_allow_html=True,
        )
        st.caption("Detection execution will be connected in Phase 5.")
    else:
        st.markdown(
            '<div class="warn-box">'
            '<strong>Model checkpoint not found.</strong><br>'
            'Place the trained weights file at <code>models/best.pt</code> to enable detection. '
            'See <code>models/README.md</code> for the download link. '
            'Enhancement features are unaffected.'
            '</div>',
            unsafe_allow_html=True,
        )

    # Model specification
    st.markdown(
        '<p class="section-label">Model Specification</p>',
        unsafe_allow_html=True,
    )

    col_a, col_b = st.columns(2, gap="large")

    with col_a:
        rows = [
            ("Architecture",  "YOLOv8n (nano)"),
            ("Training data", "RUOD dataset"),
            ("Dataset split", "9,800 train / 4,200 val"),
            ("Epochs",        "50"),
            ("Hardware",      "NVIDIA Tesla T4"),
            ("Input size",    "640 × 640 px"),
            ("Classes",       "10"),
        ]
        td = "".join(
            f"<tr><td>{k}</td><td>{v}</td></tr>" for k, v in rows
        )
        st.markdown(
            f'<table class="spec-table"><tbody>{td}</tbody></table>',
            unsafe_allow_html=True,
        )

    with col_b:
        st.markdown("**Detectable categories (RUOD)**")
        classes = [
            "Holothurian", "Echinus", "Scallop", "Starfish", "Fish",
            "Corals", "Diver", "Cuttlefish", "Turtle", "Jellyfish",
        ]
        tags = "".join(
            f'<span class="class-tag">{c}</span>' for c in classes
        )
        st.markdown(
            f'<div class="class-list">{tags}</div>',
            unsafe_allow_html=True,
        )

    # Comparison methodology
    st.markdown(
        '<p class="section-label">Comparison Methodology</p>',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<div class="callout callout-teal">'
        'Detection is run on <strong>both</strong> the original and the enhanced image '
        'using <strong>identical model settings</strong> (same confidence threshold, '
        'same NMS parameters, same input resolution). Any observed difference in '
        'detection outcomes — bounding box count, class distribution, confidence scores '
        '— is therefore attributable to the enhancement step, not to model variation.<br><br>'
        'Results are presented without claiming that enhancement improves detection '
        'unless the evaluation data supports that conclusion.'
        '</div>',
        unsafe_allow_html=True,
    )

    st.caption(
        "Inference execution, bounding box visualisation, and detection statistics "
        "will be integrated in Phase 5."
    )


# ---------------------------------------------------------------------------
# Page: About Project
# ---------------------------------------------------------------------------

def page_about() -> None:
    st.markdown(
        '<p class="pg-title">About AquaVision AI</p>'
        '<p class="pg-subtitle">'
        'B.Tech Final Year Project — Computer Vision Research'
        '</p>',
        unsafe_allow_html=True,
    )

    st.divider()

    st.markdown("#### Objective")
    st.markdown(
        "AquaVision AI investigates whether a traditional, non-learned image enhancement "
        "pipeline can measurably improve the performance of a fine-tuned marine object "
        "detector. The system applies Gray-World white balancing followed by CLAHE to "
        "underwater images, then compares YOLO detection outcomes on the original and "
        "enhanced versions using standard detection metrics."
    )

    st.markdown(
        '<p class="section-label">Underwater Image Degradation</p>',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<div class="callout">'
        '<strong>Colour cast.</strong> Water absorbs red and orange wavelengths rapidly. '
        'Images appear blue or green depending on depth and water composition.<br><br>'
        '<strong>Scattering.</strong> Suspended particles diffuse light, reducing '
        'contrast and edge sharpness.<br><br>'
        '<strong>Haze.</strong> Backscattered light from particles reduces visibility '
        'and introduces veiling luminance.<br><br>'
        '<strong>Non-uniform illumination.</strong> Artificial light sources create '
        'bright centres and dark peripheries simultaneously.'
        '</div>',
        unsafe_allow_html=True,
    )

    col_a, col_b = st.columns(2, gap="large")

    with col_a:
        st.markdown("#### Image Enhancement")
        st.markdown(
            "The enhancement stage applies two sequential operations from "
            "`src/aquavision/enhancement/traditional.py`."
            "\n\n"
            "**Gray-World white balance** corrects colour casts by assuming "
            "the scene average is achromatic and scaling each channel to a "
            "common mean."
            "\n\n"
            "**CLAHE** improves local contrast on the luminance channel of the "
            "LAB colour space. The clip limit and tile grid size are configurable. "
            "No trained network is used at this stage."
        )

    with col_b:
        st.markdown("#### Marine Object Detection")
        st.markdown(
            "A **YOLOv8n** model fine-tuned on the RUOD (Real-world Underwater Object "
            "Detection) dataset localises marine organisms in both original and enhanced "
            "images. The model outputs bounding boxes, class labels, and confidence scores."
            "\n\n"
            "Running identical inference on both image conditions allows a direct "
            "comparison of detection precision, recall, object count, and confidence "
            "distributions."
        )

    st.markdown(
        '<p class="section-label">Workflow</p>',
        unsafe_allow_html=True,
    )
    steps = [
        ("1", "Upload an underwater image (JPG / JPEG / PNG)."),
        ("2", "Apply Gray-World white balance to remove the colour cast."),
        ("3", "Apply CLAHE to improve local contrast."),
        ("4", "Run YOLOv8n on the original image."),
        ("5", "Run YOLOv8n on the enhanced image with identical settings."),
        ("6", "Compare bounding boxes, class labels, confidence, and count."),
        ("7", "Review processing times and image quality metrics."),
    ]
    for num, desc in steps:
        st.markdown(
            f'<div class="callout"><strong>{num}.</strong> {desc}</div>',
            unsafe_allow_html=True,
        )

    st.markdown(
        '<p class="section-label">Technology Stack</p>',
        unsafe_allow_html=True,
    )
    tech = [
        "Python 3.12+", "Streamlit", "OpenCV", "NumPy", "Pillow",
        "PyTorch", "Ultralytics YOLOv8", "scikit-image", "pandas", "Matplotlib",
    ]
    tags = "".join(f'<span class="tech-tag">{t}</span>' for t in tech)
    st.markdown(
        f'<div class="tech-row">{tags}</div>',
        unsafe_allow_html=True,
    )

    st.markdown('<div style="height:1rem"></div>', unsafe_allow_html=True)

    st.markdown(
        '<p class="section-label">Research Note</p>',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<div class="callout callout-warn">'
        'A 200-image pilot comparison on the RUOD test split found that '
        'Gray-World + CLAHE <strong>increased precision</strong> but '
        '<strong>reduced recall, mAP@0.5, and mAP@0.5:0.95</strong> relative '
        'to unenhanced images. These are preliminary results from a single pilot '
        'sample and must not be interpreted as the final evaluation outcome. '
        'Full results are documented in <code>aquavision_experiment_log.md</code>.'
        '</div>',
        unsafe_allow_html=True,
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    _inject_css()
    env  = _check_env()
    page = _sidebar(env)

    if   page == "overview":        page_overview(env)
    elif page == "image_analysis":  page_image_analysis()
    elif page == "enhancement":     page_enhancement(env)
    elif page == "detection":       page_detection(env)
    elif page == "about":           page_about()
    else:                           page_overview(env)


if __name__ == "__main__":
    main()
