# 🌊 AquaVision AI 2.0

> **Intelligent Underwater Image Enhancement and Marine Object Detection System**  
> *B.Tech Final-Year Capstone Project*

AquaVision AI is a deep-learning-based computer vision application designed to restore degraded underwater imagery and detect marine organisms in real time. The system combines custom **U-Net image enhancement architectures** with a fine-tuned **YOLO11s marine object detector**, delivered through a modern **FastAPI backend** and a high-performance **React + TypeScript frontend**.

---

## 📌 System Architecture

```text
                                  ┌───────────────────────────────┐
                                  │   Underwater Image / Video    │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │      Input Acquisition Layer     │
                                 │   (Validation & Preprocessing)  │
                                 └───────────────┬─────────────────┘
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         │                                                 │
                         ▼                                                 ▼
        ┌─────────────────────────────────┐               ┌─────────────────────────────────┐
        │     Image Enhancement Module    │               │     Marine Object Detection     │
        │  • U-Net (L1 + SSIM Loss)       │               │  • YOLO11s (RUOD Fine-Tuned)    │
        │  • Traditional (WB + CLAHE)     │               │  • 10 Marine Biological Classes │
        └────────────────┬────────────────┘               └────────────────┬────────────────┘
                         │                                                 │
                         └────────────────────────┬────────────────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │    Comparative Visualizer     │
                                  │  • Side-by-side detection     │
                                  │  • Before/After quality slider│
                                  │  • Frame-by-frame video player│
                                  └───────────────────────────────┘
```

---

## 🚀 Key Modules & Capabilities

### 1. 🎛️ Unified Image Processing Workspace
- **Single Upload Pipeline**: Upload an image once and run both enhancement and detection simultaneously.
- **Side-by-Side Comparative Analysis**:
  - **Panel A**: Original image with predicted bounding boxes, species labels, and confidence scores.
  - **Panel B**: Enhanced image with predicted bounding boxes and scores to observe the direct effect of enhancement on detection.
  - **Raw Enhancement Slider**: Interactive comparison between raw and enhanced underwater imagery.
- **Configurable Stages**:
  - Independent toggles for Enhancement and Detection.
  - Selectable enhancement methods: Auto, White Balance + CLAHE (Traditional), U-Net (L1 + SSIM Loss), U-Net Baseline (L1 Loss), U-Net Deep Enhancement.
  - Adjustable detection confidence threshold (15% – 85%).
- **Direct Downloads**: Export the enhanced image or annotated detection images with a single click.

### 2. 🎥 Video Analysis Workspace
- Frame-by-frame processing for underwater video recordings (MP4, WebM, AVI, MOV).
- Configurable temporal sampling rates:
  - **Key frames** (~1 fps — fast overview)
  - **Every 10th frame** (balanced resolution)
  - **Every 5th frame** (detailed tracking)
  - **Every frame** (exhaustive inspection)
- Dual video player: Seamless toggle between original footage and the processed annotated video.
- Key analyzed frames gallery with detection bounding boxes and per-frame species inspection.
- Aggregate marine species census and direct MP4 export.

### 3. 📊 Research Evaluation & Benchmarks
- Full research evaluation suite for model performance.
- Evaluation metrics:
  - **Enhancement**: PSNR, SSIM, UIQM (Underwater Image Quality Measure), UCIQE (Underwater Color Image Quality Evaluation).
  - **Detection**: Precision, Recall, F1-Score, mAP@50, mAP@50:95.

### 4. 📈 Clean Dashboard & History
- Real-time session metrics: Analysis Sessions, Images Analyzed, Objects Detected, Average Processing Time.
- Navigation shortcuts for quick access to Image Processing, Video Analysis, and Evaluation.
- Searchable and filterable history logs of all analysis sessions.

---

## 🐠 Detected Marine Organisms (RUOD Dataset)

The fine-tuned YOLO11s detector recognizes 10 distinct underwater marine classes:
1. **Holothurian** (Sea Cucumber)
2. **Echinus** (Sea Urchin)
3. **Scallop**
4. **Starfish**
5. **Fish**
6. **Corals**
7. **Diver**
8. **Cuttlefish**
9. **Turtle**
10. **Jellyfish**

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, TailwindCSS 4, Zustand, Lucide Icons, Recharts |
| **Backend** | Python 3.13, FastAPI, Uvicorn, OpenCV |
| **Deep Learning** | PyTorch, Torchvision, Ultralytics YOLO11, Custom U-Net Architecture |
| **Image Processing** | OpenCV Headless, PIL, NumPy, Gray-World White Balance, CLAHE |

---

## ⚡ Quick Start

### Prerequisites
- Python 3.10+ (tested with Python 3.13)
- Node.js 18+ and npm

### 1. One-Click Launcher (Windows)
Double-click `start_aquavision.bat` in the project root to start both backend and frontend servers simultaneously.

### 2. Manual Startup

#### Backend
```powershell
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows
pip install -r requirements.txt
python main.py
```
*Backend runs on `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).*

#### Frontend
```powershell
cd github_ui_repo
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 📁 Repository Structure

```text
AquaVision-AI/
├── backend/
│   ├── main.py                     # FastAPI application & REST endpoints
│   ├── unet_model.py               # Custom EnhancementUNet architecture
│   ├── traditional_enhancement.py  # White Balance & CLAHE algorithms
│   ├── test_models.py              # Verification suite for models
│   ├── requirements.txt            # Python dependencies
│   ├── uploads/                    # Temporary upload buffer (.gitkeep)
│   └── outputs/                    # Processed images and videos (.gitkeep)
├── github_ui_repo/                 # React frontend application
│   ├── src/
│   │   ├── app/App.tsx             # Application router & code splitting
│   │   ├── components/             # Reusable UI components
│   │   ├── features/
│   │   │   ├── dashboard/          # Cleaned DashboardPage
│   │   │   ├── image-processing/   # Unified ImageProcessingPage
│   │   │   ├── video-analysis/     # Frame-by-frame VideoAnalysisPage
│   │   │   ├── evaluation/         # Research EvaluationPage
│   │   │   └── history/            # Session History & Details
│   │   ├── lib/store.ts            # Zustand global state & persistence
│   │   └── types/index.ts          # TypeScript type definitions
│   ├── package.json
│   └── vite.config.ts              # Vite config with backend proxy
├── start_aquavision.bat            # One-click Windows startup script
├── .gitignore                      # Git ignore rules
└── README.md                       # Documentation
```

---

## 📜 License & Academic Integrity
Developed as a B.Tech final-year research and capstone project. Free for educational and research purposes.
