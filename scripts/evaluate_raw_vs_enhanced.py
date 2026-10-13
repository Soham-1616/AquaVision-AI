
import argparse
from pathlib import Path
import random
import shutil
import time

import cv2
import yaml
from ultralytics import YOLO

from aquavision.enhancement.traditional import enhance_image


PROJECT = Path(__file__).resolve().parents[1]
DATASET = Path("D:/Aquavision/Datasets")
IMAGES = DATASET / "RUOD_pic" / "test"
LABELS = DATASET / "RUOD_YOLO" / "labels" / "test"
OUT = PROJECT / "outputs" / "evaluation_pilot"

SAMPLE_SIZE = 200
SEED = 42
IMAGE_SIZE = 640
BATCH_SIZE = 4

CLASS_NAMES = [
    "holothurian", "echinus", "scallop", "starfish", "fish",
    "corals", "diver", "cuttlefish", "turtle", "jellyfish",
]



def write_dataset_yaml(root: Path) -> Path:
    config = {
        "path": root.as_posix(),
        "train": "images/test",
        "val": "images/test",
        "names": {i: name for i, name in enumerate(CLASS_NAMES)},
    }
    yaml_path = root / "data.yaml"
    yaml_path.write_text(
        yaml.safe_dump(config, sort_keys=False),
        encoding="utf-8",
    )
    return yaml_path


def prepare_sample(image_paths):
    raw_root = OUT / "raw"
    enhanced_root = OUT / "enhanced"

    for root in (raw_root, enhanced_root):
        (root / "images" / "test").mkdir(parents=True, exist_ok=True)
        (root / "labels" / "test").mkdir(parents=True, exist_ok=True)

    enhancement_times = []

    for index, source in enumerate(image_paths, start=1):
        label = LABELS / f"{source.stem}.txt"
        if not label.exists():
            raise FileNotFoundError(f"Missing label: {label}")

        raw_dest = raw_root / "images" / "test" / source.name
        enhanced_dest = enhanced_root / "images" / "test" / source.name

        shutil.copy2(source, raw_dest)
        shutil.copy2(label, raw_root / "labels" / "test" / label.name)
        shutil.copy2(label, enhanced_root / "labels" / "test" / label.name)

        bgr = cv2.imread(str(source))
        if bgr is None:
            raise ValueError(f"Could not read image: {source}")

        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        start = time.perf_counter()
        enhanced_rgb = enhance_image(rgb)
        enhancement_times.append(time.perf_counter() - start)

        enhanced_bgr = cv2.cvtColor(enhanced_rgb, cv2.COLOR_RGB2BGR)
        if not cv2.imwrite(str(enhanced_dest), enhanced_bgr):
            raise IOError(f"Could not save enhanced image: {enhanced_dest}")

        if index % 50 == 0:
            print(f"Prepared {index}/{len(image_paths)} images")

    return raw_root, enhanced_root, enhancement_times


def evaluate(model, yaml_path, run_name):
    print(f"\nEvaluating {run_name} images...")
    metrics = model.val(
        data=str(yaml_path),
        imgsz=IMAGE_SIZE,
        batch=BATCH_SIZE,
        device="cpu",
        workers=0,
        plots=False,
        verbose=False,
        project=str(OUT / "runs"),
        name=run_name,
        exist_ok=True,
    )

    box = metrics.box
    print(f"{run_name} results:")
    print(f"  Precision:  {box.mp:.4f}")
    print(f"  Recall:     {box.mr:.4f}")
    print(f"  mAP@50:     {box.map50:.4f}")
    print(f"  mAP@50-95:  {box.map:.4f}")
    print(f"  Speed (ms/image): {metrics.speed}")
    return metrics


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Compare raw RUOD images against images enhanced "
            "using traditional Gray-World white balance + CLAHE."
        )
    )
    parser.add_argument(
        "--model",
        type=Path,
        required=True,
        help="Path to the trained YOLO checkpoint, e.g. best.pt",
    )
    args = parser.parse_args()
    model_path = args.model.expanduser().resolve()

    if not model_path.is_file():
        raise FileNotFoundError(f"Model not found: {model_path}")
    if not IMAGES.is_dir() or not LABELS.is_dir():
        raise FileNotFoundError("RUOD image or label directory not found.")

    all_images = sorted(
        p for p in IMAGES.iterdir()
        if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    paired = [p for p in all_images if (LABELS / f"{p.stem}.txt").exists()]

    if len(paired) < SAMPLE_SIZE:
        raise ValueError(
            f"Need {SAMPLE_SIZE} paired images; found {len(paired)}."
        )

    random.seed(SEED)
    sample = sorted(random.sample(paired, SAMPLE_SIZE))
    print(f"Using {len(sample)} paired images; random seed = {SEED}")
    print("This is a pilot validation comparison, not an independent test.")

    raw_root, enhanced_root, enhancement_times = prepare_sample(sample)
    raw_yaml = write_dataset_yaml(raw_root)
    enhanced_yaml = write_dataset_yaml(enhanced_root)

    print(
        f"\nEnhancement time: total {sum(enhancement_times):.2f}s; "
        f"average {1000 * sum(enhancement_times) / len(enhancement_times):.2f} ms/image"
    )

    model = YOLO(str(model_path))
    raw_metrics = evaluate(model, raw_yaml, "raw")
    enhanced_metrics = evaluate(model, enhanced_yaml, "enhanced")

    print("\n=== PILOT COMPARISON ===")
    print(f"Raw mAP@50:      {raw_metrics.box.map50:.4f}")
    print(f"Enhanced mAP@50: {enhanced_metrics.box.map50:.4f}")
    print(f"Raw mAP@50-95:      {raw_metrics.box.map:.4f}")
    print(f"Enhanced mAP@50-95: {enhanced_metrics.box.map:.4f}")
    print(f"\nArtifacts saved under: {OUT}")


if __name__ == "__main__":
    main()