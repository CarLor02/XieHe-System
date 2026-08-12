from __future__ import annotations

import os
from pathlib import Path


CURRENT_DIR = Path(__file__).parent


def _boolean_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ValueError(f"{name} must be a boolean value, got {raw!r}")


POSE_MODEL_PATH = CURRENT_DIR / "weights" / "pose.pt"
POSE_CORNER_MODEL_PATH = CURRENT_DIR / "weights" / "pose_corner.pt"
CONF_THRESHOLD = 0.5
POSE_LEGACY_LR_SWAP = _boolean_env("POSE_LEGACY_LR_SWAP", True)
HOST = "0.0.0.0"
PORT = 8001
