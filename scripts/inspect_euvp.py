from pathlib import Path
from PIL import Image
import numpy as np


ROOT = Path(r"D:\Aquavision\Datasets\EUVP\Paired\underwater_dark")

TRAIN_A = ROOT / "trainA"
TRAIN_B = ROOT / "trainB"


files = sorted(TRAIN_A.glob("*"))[:10]

print(f"Inspecting {len(files)} image pairs...\n")

for file_a in files:
    file_b = TRAIN_B / file_a.name

    with Image.open(file_a) as img_a:
        img_a = np.array(img_a)

    with Image.open(file_b) as img_b:
        img_b = np.array(img_b)

    print(f"Pair: {file_a.name}")
    print(f"  trainA shape : {img_a.shape}")
    print(f"  trainB shape : {img_b.shape}")
    print(f"  trainA dtype : {img_a.dtype}")
    print(f"  trainB dtype : {img_b.dtype}")
    print(f"  trainA range : {img_a.min()} - {img_a.max()}")
    print(f"  trainB range : {img_b.min()} - {img_b.max()}")
    print()