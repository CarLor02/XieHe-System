from __future__ import annotations

from pathlib import Path


CURRENT_DIR = Path(__file__).parent

POSE_MODEL_PATH = CURRENT_DIR / "weights" / "pose.pt"
POSE_CORNER_MODEL_PATH = CURRENT_DIR / "weights" / "pose_corner.pt"
CONF_THRESHOLD = 0.5
HOST = "0.0.0.0"
PORT = 8001
