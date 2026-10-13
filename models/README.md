# AquaVision AI — Model Checkpoint

## Required File

**Filename:** `best.pt`
**Expected location:** `models/best.pt` (this directory)

## What This File Is

A YOLOv8n checkpoint trained on the RUOD (Real-world Underwater Object Detection)
dataset for 50 epochs. The model detects 10 marine object categories:

```
holothurian, echinus, scallop, starfish, fish,
corals, diver, cuttlefish, turtle, jellyfish
```

## How to Obtain

Download `best.pt` from the team's Google Drive:

**[Download trained model](https://drive.google.com/file/d/1Dc5yFIdIWsbKuW_qDgmMveYGofvsKnqu/view?usp=drive_link)**

After downloading, place the file in this directory so that its path is:

```
models/best.pt
```

## Important Notes

- The application's enhancement features work without this file.
- Object detection features require this file to be present.
- Do not commit model checkpoints to version control.
- The `.gitignore` already excludes `*.pt` files.
