from __future__ import annotations

from typing import Any


def maybe_lr_flip(image: Any, enabled: bool) -> Any:
    """Return a left-right flipped image when requested."""
    if not enabled:
        return image
    return image[:, ::-1].copy()
