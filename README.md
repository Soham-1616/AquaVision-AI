# 🌊 AquaVision AI

### Intelligent Underwater Image Enhancement and Real-Time Marine Object Detection System

AquaVision AI is a deep-learning-based underwater computer vision system designed to improve the quality of degraded underwater images and subsequently detect marine objects from the enhanced images.

The system follows a two-stage pipeline:

**Underwater Image → Enhancement → Marine Object Detection → Annotated Result**

Underwater images often suffer from color distortion, haze, light scattering, low contrast, uneven illumination, and loss of fine details. These problems can make it difficult for computer vision models to accurately identify objects.

AquaVision AI addresses this problem by first enhancing the underwater image and then passing the enhanced image to a lightweight YOLO-based object detection model.

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Problem Statement](#-problem-statement)
- [Objectives](#-objectives)
- [Research Gap](#-research-gap)
- [Proposed Solution](#-proposed-solution)
- [System Architecture](#-system-architecture)
- [Project Workflow](#-project-workflow)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Dataset](#-dataset)
- [Image Enhancement](#-image-enhancement)
- [Marine Object Detection](#-marine-object-detection)
- [Evaluation Metrics](#-evaluation-metrics)
- [Raw vs Enhanced Comparison](#-raw-vs-enhanced-comparison)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Usage](#-usage)
- [Training](#-training)
- [Evaluation](#-evaluation)
- [Streamlit Application](#-streamlit-application)
- [Expected Output](#-expected-output)
- [Limitations](#-limitations)
- [Future Scope](#-future-scope)
- [Project Status](#-project-status)
- [Team](#-team)
- [Acknowledgements](#-acknowledgements)
- [License](#-license)

---

# 🌊 About the Project

Underwater images captured by cameras often have poor visual quality because light behaves differently underwater.

Common underwater image degradation includes:

- Blue/green color cast
- Color distortion
- Light absorption
- Light scattering
- Haze
- Low contrast
- Uneven illumination
- Loss of fine details
- Reduced visibility

These degradations can negatively affect computer vision tasks such as object detection.

AquaVision AI uses a sequential deep-learning pipeline to address this problem.

### Basic Pipeline

```text
                 Underwater Image
                        │
                        ▼
                 Preprocessing
                        │
                        ▼
             Image Enhancement Model
                        │
                        ▼
                Enhanced Image
                        │
                        ▼
              YOLO Object Detector
                        │
                        ▼
              Detection Results
                        │
                        ▼
              Annotated Output
