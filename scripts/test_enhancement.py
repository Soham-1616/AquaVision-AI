import argparse
from pathlib import Path

from PIL import Image

from aquavision.preprocessing.image import load_image, to_numpy
from aquavision.enhancement.traditional import enhance_image


parser = argparse.ArgumentParser(
    description="Run the traditional AquaVision enhancement pipeline."
)
parser.add_argument("input", type=Path, help="Path to an input underwater image.")
parser.add_argument(
    "--output",
    type=Path,
    default=Path("outputs/test_enhancement.jpg"),
    help="Path for the enhanced output image.",
)

args = parser.parse_args()

image = load_image(args.input)
image_array = to_numpy(image)

enhanced = enhance_image(image_array)

args.output.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(enhanced).save(args.output)

print(f"Input shape: {image_array.shape}")
print(f"Enhanced shape: {enhanced.shape}")
print(f"Saved: {args.output}")