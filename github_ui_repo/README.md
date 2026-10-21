# 🌊 AquaVision AI — Frontend

> **Intelligent Underwater Image Enhancement & Real-Time Marine Object Detection System**  
> *Final-Year Computer Science & Engineering Capstone Research Project*

[![React](https://img.shields.io/badge/React-19.3.1-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%2F%206.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3.4-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Passed%20(23%2F23)-green.svg?logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-Academic%20Research-orange.svg)]()

---

## 📌 Project Overview

**AquaVision AI** is a dual-stage computer vision platform designed specifically for the extreme optical challenges of underwater environments (light attenuation, severe color casting, low contrast, suspended particulate backscatter, and turbidity).

This repository contains the **production-quality React + TypeScript frontend** application for the AquaVision AI platform. It provides an intuitive, high-performance interface for researchers, marine biologists, and oceanographic operators to inspect enhancements, run marine fauna detection, benchmark model evaluation metrics, and manage analysis logs.

---

## 🚀 Key Features

- **⚡ Split-View Enhancement Comparison:** Interactive split-screen slider, side-by-side mode, and toggle view for comparing original underwater inputs against enhanced outputs.
- **🎯 Real-Time Object Detection Canvas:** Dynamic canvas overlay rendering bounding boxes normalized to the natural aspect ratio of images, with interactive confidence threshold sliders and class filtering.
- **📊 Scientific Evaluation Metrics:** In-depth benchmark analytics powered by Recharts (PSNR, SSIM, UIQM, UCIQE, Precision-Recall curves, mAP@0.5, mAP@0.5:0.95, and inference latency).
- **📹 Video Analysis Pipeline:** Video upload validation, playback controls, and simulated frame-by-frame marine analysis streams.
- **🗃️ Session History & Detailed Audit:** Persistent session tracking with search, category filtering, sorting, and drill-down inspection pages.
- **⚙️ Configurable Backend Connectivity:** Seamless switching between autonomous **Demo Mode** (for offline demonstration and UI testing) and **Connected Mode** (wired to a Python FastAPI/Flask inference server).
- **🛡️ Strict Research Integrity:** Honest separation of demonstration data and real inference metrics; no synthetic or misleading metrics presented as ground truth.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Framework** | React 19.3.1 |
| **Language** | TypeScript (Strict Mode) |
| **Build Tool & Dev Server** | Vite 8.3.4 |
| **Styling** | Tailwind CSS v4 & Custom Design System CSS |
| **Routing** | React Router v7 |
| **State Management** | Zustand 5 |
| **Charts & Visualization** | Recharts 3 |
| **Forms & Validation** | React Hook Form + Zod |
| **Icons** | Lucide React |
| **Testing** | Vitest 5 + Testing Library |

---

## 📋 Prerequisites

Before running the application, make sure you have:

- **Node.js**: `v18.0.0` or higher (Node.js `v20+` recommended)
- **npm**: `v9.0.0` or higher (or `pnpm` / `yarn`)
- **Git** installed on your system

---

## ⚡ Quick Start & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/pruthvi025/Underwater_Image_Inhancement_Object_detection_system.git
cd Underwater_Image_Inhancement_Object_detection_system
```

*(If running from the frontend workspace folder, simply open terminal in the directory).*

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your web browser. The application supports Hot Module Replacement (HMR).

### 4. Run TypeScript Check

```bash
npx tsc --noEmit
```

### 5. Run Test Suite

```bash
npx vitest run
```

### 6. Create Production Build

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## 🧭 Application Routes

| Path | Screen Name | Functionality |
|---|---|---|
| `/` | **Dashboard** | Overview of pipeline status, system stats, quick launch cards, and recent sessions. |
| `/enhancement` | **Enhancement Lab** | Upload underwater photos, select enhancement algorithm (Deep Learning, White Balance, CLAHE), interactive before/after slider. |
| `/detection` | **Detection Studio** | Marine fauna detection canvas, bounding-box overlays, confidence thresholds, class filtering. |
| `/video` | **Video Analysis** | Video processing interface with validation, video preview player, and frame telemetry. |
| `/evaluation` | **Evaluation & Benchmarks** | Academic comparison charts, ablation studies, and metric formulas (PSNR, SSIM, UIQM, UCIQE, mAP). |
| `/history` | **Analysis History** | Filterable and searchable historical log of all processing sessions. |
| `/history/:id` | **Session Details** | Deep dive into a specific session's inputs, outputs, runtime, and model metadata. |
| `/settings` | **System Settings** | Configure backend API base URL, test connection, toggle Demo Mode, manage defaults. |
| `/about` | **About & Research** | Project documentation, architecture pipeline diagram, problem statement, and references. |

---

## 🔌 Python AI Backend Integration

The frontend is designed with an API abstraction layer (`src/services/api/api-client.ts`) and a mock adapter (`src/services/adapters/mock-adapter.ts`).

### Expected Backend API Endpoints (FastAPI / Flask)

| Endpoint | Method | Format | Description |
|---|---|---|---|
| `/api/health` | `GET` | JSON | Checks server connectivity and GPU/model readiness. |
| `/api/capabilities` | `GET` | JSON | Returns list of available enhancement models, detection models, and marine classes. |
| `/api/analysis/enhance` | `POST` | `multipart/form-data` | Accepts image file + parameters, returns enhanced image URL and quality metrics. |
| `/api/analysis/detect` | `POST` | `multipart/form-data` | Accepts image file + confidence threshold, returns bounding box coordinates and labels. |
| `/api/analysis/pipeline` | `POST` | `multipart/form-data` | Runs combined dual-stage pipeline (enhancement → detection). |
| `/api/analysis/video` | `POST` | `multipart/form-data` | Submits video for batch/stream inference. |

### Connecting to Your Local Backend

1. Start your Python inference server (e.g. running on `http://localhost:8000`).
2. In the frontend app, navigate to **Settings** (`/settings`).
3. Set **Backend API Base URL** to `http://localhost:8000`.
4. Click **Test Connection**.
5. Once verified, disable **Demo Mode** to route all enhancement and detection requests directly to your live AI models.

---

## 📁 Project Directory Structure

```text
Frontend/
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── README.md
├── src/
│   ├── app/
│   │   └── App.tsx                 # Core application router and layout
│   ├── assets/                     # Static media and icons
│   ├── components/                 # Reusable modular UI components
│   │   ├── detection/              # Bounding box canvas overlay
│   │   ├── feedback/               # MetricCard, StatusStates, EmptyState
│   │   ├── image-viewer/           # Interactive split-slider comparison
│   │   ├── layout/                 # AppShell, Header, Sidebar
│   │   └── upload/                 # Drag-and-drop FileUpload
│   ├── features/                   # Page-level route views
│   │   ├── about/AboutPage.tsx
│   │   ├── dashboard/DashboardPage.tsx
│   │   ├── detection/DetectionPage.tsx
│   │   ├── enhancement/EnhancementPage.tsx
│   │   ├── evaluation/EvaluationPage.tsx
│   │   ├── history/
│   │   │   ├── HistoryPage.tsx
│   │   │   └── HistoryDetailPage.tsx
│   │   ├── settings/SettingsPage.tsx
│   │   └── video-analysis/VideoAnalysisPage.tsx
│   ├── lib/
│   │   └── store.ts                # Zustand global state store
│   ├── services/                   # Service & communication layer
│   │   ├── adapters/               # Mock demo adapter with unit tests
│   │   └── api/                    # Typed API client for Python backend
│   ├── types/
│   │   └── index.ts                # TypeScript domain models and interfaces
│   ├── utils/                      # Helper functions, formatters, and validators
│   ├── index.css                   # Tailwind v4 styles and custom theme tokens
│   └── main.tsx                    # React DOM root entry point
```

---

## 🧪 Testing

The project uses **Vitest** for unit and integration testing.

```bash
# Run tests once
npm test

# Run tests in watch mode
npx vitest

# Run tests with coverage
npx vitest run --coverage
```

Current test suites validate:
- Unique analysis ID generation and time formatting
- File size computation and MIME type validation
- Image metric formatting and fallback handling
- Color hashing consistency for marine object classes
- Mock adapter deterministic bounding box calculations and class filtering

---

## 🤝 Contributing & Academic License

This project was developed as a final-year Computer Science and Engineering research capstone project on underwater computer vision and machine learning.

For academic questions, references, or collaborations, please open an issue or pull request on GitHub:  
[https://github.com/pruthvi025/Underwater_Image_Inhancement_Object_detection_system.git](https://github.com/pruthvi025/Underwater_Image_Inhancement_Object_detection_system.git)
