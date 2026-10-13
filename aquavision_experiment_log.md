# AquaVision AI — Experiment Log

## 1. Project Information

* **Project:** AquaVision AI: Intelligent Underwater Image Enhancement and Real-Time Marine Object Detection System
* **Experiment:** Baseline Marine Object Detection
* **Detection Model:** YOLOv8n
* **Dataset:** RUOD
* **Enhancement Method:** Gray-World White Balance + CLAHE (traditional enhancement baseline)

## 2. Training Configuration

| Parameter            | Value                   |
| -------------------- | ----------------------- |
| Training images      | 9,800                   |
| Validation images    | 4,200                   |
| Image size           | 640 × 640               |
| Batch size           | 16                      |
| Configured epochs    | 50                      |
| Training device      | NVIDIA Tesla T4         |
| Dataset classes      | 10                      |
| Initial training run | `ruod_yolov8n_baseline` |

**Dataset split note:** The current configuration uses the RUOD test split for validation. A separate, independent final evaluation must be planned before reporting final test performance.

## 3. Dataset Preparation

* Total images: 14,000
* Training labels: 9,800
* Validation labels: 4,200
* One invalid bounding-box annotation was excluded from the working dataset.
* The original annotation and exclusion log were preserved in Google Drive.

## 4. Training Status

* Detection model: YOLOv8n
* Training run: `ruod_yolov8n_baseline`
* Configured epochs: 50
* Completed training: 50 epochs, as recorded in the saved training results
* Best checkpoint (`best.pt`): Present in Google Drive; successfully loaded with Ultralytics 8.4.174
* Last checkpoint (`last.pt`): Previously recorded as saved; independent loading verification not performed in the current session
* Training results (`results.csv`): Present in Google Drive
* Training configuration (`args.yaml`): Present in Google Drive
* Class mapping: All 10 RUOD class names loaded successfully

The checkpoint loaded successfully, and standalone inference was verified on RUOD test image `000001.jpg`. The detector produced 8 detections: 2 holothurians, 4 echinuses, and 2 starfish. CPU inference time was 158.9 ms for this single image, excluding preprocessing and postprocessing.


## 5. Detection Evaluation

*Baseline metrics below were recorded from the saved training/validation results. A separate 200-image pilot comparison was subsequently conducted and is documented in Section 7. Independent final-test evaluation remains outstanding.*

| Metric                       | Result  |
| ---------------------------- | ------- |
| Precision                    | 0.8424  |
| Recall                       | 0.7736  |
| F1-score                     | Pending |
| mAP@50                       | 0.8420  |
| mAP@50–95                    | 0.5989  |
| Inference speed (FPS)        | Pending |
| Inference latency (ms/image) | Pending |

## 6. Image Enhancement Evaluation

*To be completed after running the enhancement evaluation.*

| Metric | Raw images | Enhanced images |
| ------ | ---------- | --------------- |
| PSNR   | Pending    | Pending         |
| SSIM   | Pending    | Pending         |
| UIQM   | Pending    | Pending         |
| UCIQE  | Pending    | Pending         |

## 7. Raw vs. Enhanced Detection Comparison

Experiment type: 200-image pilot comparison on the RUOD test split. This is not an independent final test.

Detector: YOLOv8n, using the same trained checkpoint for both conditions.

Enhancement method: Traditional Gray-World white balance + CLAHE. This experiment does not evaluate the separately trained enhancement model developed by the team leader.

| Detection metric                   | Raw images → YOLO | Gray-World + CLAHE → YOLO |
| ---------------------------------- | ----------------: | ------------------------: |
| Precision                          |            0.8546 |                    0.8700 |
| Recall                             |            0.7613 |                    0.6820 |
| mAP@50                             |            0.8541 |                    0.7863 |
| mAP@50–95                          |            0.6083 |                    0.5320 |
| Detector inference time (ms/image) |             40.38 |                     39.65 |


Enhancement timing: 15.81 seconds total for 200 images, averaging 79.03 ms/image in this run.

Observed result: Traditional Gray-World + CLAHE increased precision but reduced recall, mAP@50, and mAP@50–95 on this pilot sample. The results do not support a claim that this enhancement method improves detection.

Limitations: The comparison uses 200 images sampled from the RUOD test split and should be treated as a pilot, not an independent final evaluation. Results may vary with the sample, confidence settings, and computing environment. The measured detector inference time does not include the full enhancement-to-detection pipeline latency. The team's trained enhancement model has not been evaluated in this experiment.

## 8. Findings and Conclusion

Detection: The trained YOLOv8n checkpoint loaded successfully and produced detections on a real RUOD image.
Traditional enhancement: On the 200-image pilot, Gray-World + CLAHE increased precision from 0.8546 to 0.8700, while recall decreased from 0.7613 to 0.6820.
Detection performance: mAP@50 decreased from 0.8541 to 0.7863, and mAP@50–95 decreased from 0.6083 to 0.5320.
Interpretation: Traditional enhancement did not improve detection on this pilot sample. The effect of the team's trained enhancement model remains untested.
Limitations and future improvements: Run a properly separated final evaluation, measure end-to-end pipeline latency, and compare raw images against the team's trained enhancement output using the same detector and evaluation images.

**Reporting rule:** Record only measured results. Do not assume enhancement improves detection; report improvements, declines, or negligible differences as observed.
