#!/usr/bin/env python3
"""Unit checks for AP Cobb v2 pure calculation helpers."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _install_dependency_stubs() -> None:
    fastapi = types.ModuleType("fastapi")

    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    class FastAPI:
        def __init__(self, *args, **kwargs):
            pass

        def add_middleware(self, *args, **kwargs):
            return None

        def on_event(self, *args, **kwargs):
            return lambda fn: fn

        def get(self, *args, **kwargs):
            return lambda fn: fn

        def post(self, *args, **kwargs):
            return lambda fn: fn

    fastapi.FastAPI = FastAPI
    fastapi.File = lambda *args, **kwargs: None
    fastapi.Query = lambda *args, **kwargs: None
    fastapi.UploadFile = object
    fastapi.HTTPException = HTTPException
    sys.modules["fastapi"] = fastapi

    cors = types.ModuleType("fastapi.middleware.cors")
    cors.CORSMiddleware = object
    sys.modules["fastapi.middleware"] = types.ModuleType("fastapi.middleware")
    sys.modules["fastapi.middleware.cors"] = cors

    cv2 = types.ModuleType("cv2")
    cv2.IMREAD_COLOR = 1
    cv2.imdecode = lambda *args, **kwargs: None
    sys.modules["cv2"] = cv2

    ultralytics = types.ModuleType("ultralytics")
    ultralytics.YOLO = object
    sys.modules["ultralytics"] = ultralytics


def load_app_module():
    _install_dependency_stubs()
    sys.path.insert(0, str(ROOT))
    spec = importlib.util.spec_from_file_location("ap_app_for_test", ROOT / "app.py")
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def make_vertebra(
    top_left: tuple[float, float],
    top_right: tuple[float, float],
    bottom_left: tuple[float, float],
    bottom_right: tuple[float, float],
) -> dict:
    tl = {"x": top_left[0], "y": top_left[1]}
    tr = {"x": top_right[0], "y": top_right[1]}
    bl = {"x": bottom_left[0], "y": bottom_left[1]}
    br = {"x": bottom_right[0], "y": bottom_right[1]}
    return {
        "corners": {
            "top_left": tl,
            "top_right": tr,
            "bottom_left": bl,
            "bottom_right": br,
            "center": {
                "x": (tl["x"] + tr["x"] + bl["x"] + br["x"]) / 4,
                "y": (tl["y"] + tr["y"] + bl["y"] + br["y"]) / 4,
            },
        }
    }


class CobbV2Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = load_app_module()

    def test_find_cobb_angles_v2_returns_auto_measurement_shape(self):
        vertebrae = {
            "T1": make_vertebra((0, 100), (100, 100), (0, 140), (100, 140)),
            "L5": make_vertebra((0, 260), (100, 260), (0, 300), (100, 336.397)),
        }

        cobbs = self.app.find_cobb_angles_v2(vertebrae)

        self.assertEqual(len(cobbs), 1)
        self.assertEqual(cobbs[0]["type"], "Cobb-Auto1")
        self.assertEqual(cobbs[0]["upper_vertebra"], "T1")
        self.assertEqual(cobbs[0]["lower_vertebra"], "L5")
        self.assertIsNone(cobbs[0]["apex_vertebra"])
        self.assertEqual(len(cobbs[0]["points"]), 4)
        self.assertAlmostEqual(abs(cobbs[0]["angle"]), 20.0, places=2)

    def test_find_cobb_angles_v2_filters_short_span_candidates(self):
        vertebrae = {
            "T1": make_vertebra((0, 100), (100, 100), (0, 140), (100, 140)),
            "T2": make_vertebra((0, 180), (100, 180), (0, 220), (100, 256.397)),
        }

        self.assertEqual(self.app.find_cobb_angles_v2(vertebrae), [])


if __name__ == "__main__":
    unittest.main()
