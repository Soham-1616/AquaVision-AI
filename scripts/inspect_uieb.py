from pathlib import Path
from PIL import Image
from collections import Counter

root = Path(r"D:\Aquavision\Datasets\raw-890")
files = list(root.glob("*.png"))

sizes = []
bad = []

for f in files:
    try:
        with Image.open(f) as img:
            img.verify()

        with Image.open(f) as img:
            sizes.append(img.size)

    except Exception:
        bad.append(f.name)

print("Total files :", len(files))
print("Readable    :", len(files) - len(bad))
print("Unreadable  :", len(bad))

print("\nMost common dimensions:")
for size, count in Counter(sizes).most_common(20):
    print(f"{size}: {count}")

if bad:
    print("\nUnreadable files:")
    for name in bad:
        print(name)
