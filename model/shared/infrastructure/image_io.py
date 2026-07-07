from __future__ import annotations

import cv2
import numpy as np


def decode_image_bytes(contents: bytes):
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Cannot decode image")
    return image
