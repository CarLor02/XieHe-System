import unittest
import sys
from pathlib import Path
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ap.domain.measurement_pipeline import (
    ApMeasurementMetric,
    build_measurement_excel_row,
    derive_measurements_from_keypoints,
    find_cobb_angles_v2,
)
from ap.infrastructure.yolo_inference import estimate_pose_from_vertebrae
from ap.application.measurement_service import measure_image


def make_vertebra(top_left, top_right, bottom_left, bottom_right):
    top_mid = ((top_left[0] + top_right[0]) / 2, (top_left[1] + top_right[1]) / 2)
    bottom_mid = (
        (bottom_left[0] + bottom_right[0]) / 2,
        (bottom_left[1] + bottom_right[1]) / 2,
    )
    return {
        "corners": {
            "top_left": {"x": top_left[0], "y": top_left[1]},
            "top_right": {"x": top_right[0], "y": top_right[1]},
            "bottom_left": {"x": bottom_left[0], "y": bottom_left[1]},
            "bottom_right": {"x": bottom_right[0], "y": bottom_right[1]},
            "top_mid": {"x": top_mid[0], "y": top_mid[1]},
            "bottom_mid": {"x": bottom_mid[0], "y": bottom_mid[1]},
            "center": {
                "x": (top_mid[0] + bottom_mid[0]) / 2,
                "y": (top_mid[1] + bottom_mid[1]) / 2,
            },
        },
        "confidence": 0.9,
    }


class ApMeasurementPipelineTests(unittest.TestCase):
    def test_ap_pipeline_derives_frontend_equivalent_measurements(self):
        pose = {
            "CR": {"x": 110, "y": 100, "confidence": 0.9},
            "CL": {"x": 10, "y": 100, "confidence": 0.9},
            "SR": {"x": 120, "y": 300, "confidence": 0.9},
            "SL": {"x": 20, "y": 300, "confidence": 0.9},
        }
        vertebrae = {
            "C7": make_vertebra((40, 50), (90, 68.199), (40, 80), (90, 98.199)),
            "T1": make_vertebra((40, 100), (90, 100), (40, 130), (90, 130)),
            "L5": make_vertebra((40, 260), (90, 260), (40, 300), (90, 318.199)),
        }

        result = derive_measurements_from_keypoints(
            pose,
            vertebrae,
            image_id="IMG1",
            image_width=160,
            image_height=360,
            metrics=[
                ApMeasurementMetric.COBB1,
                ApMeasurementMetric.T1_TILT,
                ApMeasurementMetric.CA,
                ApMeasurementMetric.TS,
            ],
        )

        by_type = {measurement["type"]: measurement for measurement in result["measurements"]}
        self.assertEqual(set(by_type), {"Cobb-Auto1", "t1-tilt", "ca", "ts"})
        self.assertEqual(by_type["Cobb-Auto1"]["upper_vertebra"], "T1")
        self.assertEqual(by_type["Cobb-Auto1"]["lower_vertebra"], "L5")
        self.assertTrue(by_type["Cobb-Auto1"]["value"].endswith("°"))
        self.assertEqual(
            by_type["t1-tilt"]["points"],
            [
                {"x": 40, "y": 100},
                {"x": 90, "y": 100},
            ],
        )
        self.assertEqual(len(result["vertebrae"]), 7)
        self.assertIn("CL", {annotation["label"] for annotation in result["vertebrae"]})

        pose_annotations = {
            annotation["label"]: annotation["corners"][0]
            for annotation in result["vertebrae"]
            if annotation["label"] in {"CR", "CL", "SR", "SL"}
        }
        self.assertEqual(pose_annotations["CL"]["x"], 10)
        self.assertEqual(pose_annotations["CR"]["x"], 110)
        self.assertEqual(pose_annotations["SL"]["x"], 20)
        self.assertEqual(pose_annotations["SR"]["x"], 120)

    def test_fallback_pose_uses_normalized_domain_convention(self):
        vertebrae = {
            "T1": make_vertebra((40, 100), (60, 100), (40, 120), (60, 120)),
            "L3": make_vertebra((40, 200), (60, 200), (40, 220), (60, 220)),
            "L5": make_vertebra((40, 260), (60, 260), (40, 300), (60, 300)),
        }

        pose = estimate_pose_from_vertebrae(vertebrae)

        self.assertLess(pose["CL"]["x"], pose["CR"]["x"])
        self.assertLess(pose["IL"]["x"], pose["IR"]["x"])
        self.assertLess(pose["SL"]["x"], pose["SR"]["x"])

    def test_measure_image_does_not_silently_estimate_pose_after_pose_rejection(self):
        vertebrae = {
            "T1": make_vertebra((40, 100), (60, 100), (40, 120), (60, 120)),
            "L3": make_vertebra((40, 200), (60, 200), (40, 220), (60, 220)),
            "L5": make_vertebra((40, 260), (60, 260), (40, 300), (60, 300)),
        }

        with patch("ap.application.measurement_service.infer_pose", return_value={}):
            with patch(
                "ap.application.measurement_service.infer_pose_corner",
                return_value=vertebrae,
            ):
                result = measure_image(
                    np.zeros((360, 160, 3), dtype=np.uint8),
                    image_id="IMG1",
                )

        self.assertEqual(result["raw_keypoints"]["pose_keypoints"], {})
        self.assertFalse({"CR", "CL", "IR", "IL", "SR", "SL"} & {
            item["label"] for item in result["vertebrae"]
        })
        self.assertFalse({"ca", "pelvic", "sacral", "ts"} & {
            item["type"] for item in result["measurements"]
        })

    def test_ap_excel_row_uses_filename_id_and_metric_display_names(self):
        measurements = [
            {"type": "Cobb-Auto1", "value": "20.00°"},
            {"type": "t1-tilt", "value": "0.00°"},
        ]

        row = build_measurement_excel_row(
            "case001.png",
            measurements,
            [ApMeasurementMetric.COBB1, ApMeasurementMetric.T1_TILT],
        )

        self.assertEqual(
            row,
            {
                "id": "case001",
                "Cobb1": "20.00°",
                "T1 Tilt": "0.00°",
            },
        )

    def test_find_cobb_angles_v2_returns_frontend_ai_measurement_shape(self):
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


if __name__ == "__main__":
    unittest.main()
