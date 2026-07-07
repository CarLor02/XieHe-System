#!/usr/bin/env python3
"""Unit checks for AP Cobb v2 calculation helpers."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


MODEL_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(MODEL_ROOT))

from ap.domain.measurement_pipeline import find_cobb_angles_v2


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
    def test_find_cobb_angles_v2_returns_auto_measurement_shape(self):
        vertebrae = {
            "T1": make_vertebra((0, 100), (100, 100), (0, 140), (100, 140)),
            "L5": make_vertebra((0, 260), (100, 260), (0, 300), (100, 336.397)),
        }

        cobbs = find_cobb_angles_v2(vertebrae)

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

        self.assertEqual(find_cobb_angles_v2(vertebrae), [])


if __name__ == "__main__":
    unittest.main()
