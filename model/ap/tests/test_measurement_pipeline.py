import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ap.domain.measurement_pipeline import (
    ApMeasurementMetric,
    build_measurement_excel_row,
    derive_measurements_from_keypoints,
    find_cobb_angles_v2,
)


def make_vertebra(top_left, top_right, bottom_left, bottom_right):
    return {
        "corners": {
            "top_left": {"x": top_left[0], "y": top_left[1]},
            "top_right": {"x": top_right[0], "y": top_right[1]},
            "bottom_left": {"x": bottom_left[0], "y": bottom_left[1]},
            "bottom_right": {"x": bottom_right[0], "y": bottom_right[1]},
        },
        "confidence": 0.9,
    }


class ApMeasurementPipelineTests(unittest.TestCase):
    def test_ap_pipeline_derives_frontend_equivalent_measurements(self):
        pose = {
            "CR": {"x": 10, "y": 100, "confidence": 0.9},
            "CL": {"x": 110, "y": 100, "confidence": 0.9},
            "SR": {"x": 20, "y": 300, "confidence": 0.9},
            "SL": {"x": 120, "y": 300, "confidence": 0.9},
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
