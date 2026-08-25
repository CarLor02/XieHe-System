from __future__ import annotations

from pathlib import Path


CURRENT_DIR = Path(__file__).parent

POSE_MODEL_PATH = CURRENT_DIR / "weights" / "pose.pt"
POSE_CORNER_MODEL_PATH = CURRENT_DIR / "weights" / "pose_corner.pt"
POSE_IMGSZ = 800
POSE_CORNER_IMGSZ = 800
MODEL_CANDIDATE_CONF_THRESHOLD = 0.25
CONF_THRESHOLD = 0.5
POSE_CORNER_STANDARD_CLASS_COUNT = 18
HOST = "0.0.0.0"
PORT = 8001
