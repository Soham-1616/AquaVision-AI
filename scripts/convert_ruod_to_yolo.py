import argparse
import json
from pathlib import Path


CATEGORY_NAMES = {
    1: "holothurian",
    2: "echinus",
    3: "scallop",
    4: "starfish",
    5: "fish",
    6: "corals",
    7: "diver",
    8: "cuttlefish",
    9: "turtle",
    10: "jellyfish",
}


def convert_bbox(bbox, image_width, image_height):
    """Convert COCO [x, y, width, height] to normalized YOLO format."""

    x, y, width, height = bbox

    x_center = x + width / 2
    y_center = y + height / 2

    return (
        x_center / image_width,
        y_center / image_height,
        width / image_width,
        height / image_height,
    )


def convert_split(annotation_file, output_dir, split, limit=None):
    """Convert one RUOD COCO split into YOLO label files."""

    with annotation_file.open("r", encoding="utf-8") as file:
        coco = json.load(file)

    images = {
        image["id"]: image
        for image in coco["images"]
    }

    annotations_by_image = {}

    for annotation in coco["annotations"]:
        annotations_by_image.setdefault(
            annotation["image_id"], []
        ).append(annotation)

    label_dir = output_dir / "labels" / split
    label_dir.mkdir(parents=True, exist_ok=True)

    processed = 0

    for image_id, image in images.items():
        if limit is not None and processed >= limit:
            break

        image_width = image["width"]
        image_height = image["height"]

        label_file = label_dir / f"{Path(image['file_name']).stem}.txt"

        lines = []

        for annotation in annotations_by_image.get(image_id, []):
            category_id = annotation["category_id"]

            if category_id not in CATEGORY_NAMES:
                raise ValueError(
                    f"Unknown category ID: {category_id}"
                )

            class_id = category_id - 1

            x_center, y_center, width, height = convert_bbox(
                annotation["bbox"],
                image_width,
                image_height,
            )

            lines.append(
                f"{class_id} "
                f"{x_center:.6f} "
                f"{y_center:.6f} "
                f"{width:.6f} "
                f"{height:.6f}"
            )

        label_file.write_text(
            "\n".join(lines),
            encoding="utf-8",
        )

        processed += 1

    print(f"{split}: converted {processed} images")
    print(f"Labels: {label_dir}")


def create_data_yaml(output_dir):
    """Create the Ultralytics dataset configuration."""

    yaml_content = """path: D:/Aquavision/Datasets/RUOD_YOLO
train: images/train
val: images/test

names:
  0: holothurian
  1: echinus
  2: scallop
  3: starfish
  4: fish
  5: corals
  6: diver
  7: cuttlefish
  8: turtle
  9: jellyfish
"""

    (output_dir / "data.yaml").write_text(
        yaml_content,
        encoding="utf-8",
    )


def main():
    parser = argparse.ArgumentParser(
        description="Convert RUOD COCO annotations to YOLO format."
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of images to convert per split.",
    )

    args = parser.parse_args()

    dataset_root = Path("D:/Aquavision/Datasets")

    train_annotations = (
        dataset_root
        / "RUOD_ANN"
        / "instances_train.json"
    )

    test_annotations = (
        dataset_root
        / "RUOD_ANN"
        / "instances_test.json"
    )

    output_dir = dataset_root / "RUOD_YOLO"

    output_dir.mkdir(parents=True, exist_ok=True)

    convert_split(
        train_annotations,
        output_dir,
        "train",
        args.limit,
    )

    convert_split(
        test_annotations,
        output_dir,
        "test",
        args.limit,
    )

    create_data_yaml(output_dir)

    print(f"\nDataset configuration: {output_dir / 'data.yaml'}")


if __name__ == "__main__":
    main()