import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from measurement_pipeline import (
    LatMeasurementMetric,
    build_measurement_excel_row,
    derive_measurements_from_detection,
)
from models import CFHDetection, Point, VertebraDetection


def make_vertebra(label, points):
    return VertebraDetection(
        label=label,
        confidence=0.9,
        bbox=[0, 0, 0, 0],
        keypoints=[Point(x=x, y=y) for x, y in points],
    )


class LatMeasurementPipelineTests(unittest.TestCase):
    def test_lat_pipeline_derives_s1_and_cfh_dependent_measurements(self):
        vertebrae = [
            make_vertebra("T1", [(0.10, 0.10), (0.30, 0.10), (0.10, 0.20), (0.30, 0.20)]),
            make_vertebra("L1", [(0.10, 0.40), (0.30, 0.40), (0.10, 0.50), (0.30, 0.50)]),
            make_vertebra("L4", [(0.10, 0.60), (0.30, 0.60), (0.10, 0.70), (0.30, 0.70)]),
            make_vertebra("S1", [(0.35, 0.90), (0.15, 0.90)]),
        ]
        cfh = CFHDetection(
            confidence=0.9,
            bbox=[0, 0, 0, 0],
            center=Point(x=0.20, y=0.80),
        )

        result = derive_measurements_from_detection(
            vertebrae,
            cfh,
            image_id="LAT1",
            image_width=1000,
            image_height=1000,
            metrics=[
                LatMeasurementMetric.T1_SLOPE,
                LatMeasurementMetric.LL_L1_S1,
                LatMeasurementMetric.PI,
                LatMeasurementMetric.PT,
                LatMeasurementMetric.SS,
            ],
        )

        by_type = {measurement["type"]: measurement for measurement in result["measurements"]}
        self.assertEqual(set(by_type), {"t1-slope", "ll-l1-s1", "pi", "pt", "ss"})
        self.assertEqual(
            by_type["ss"]["points"],
            [
                {"x": 150.0, "y": 900.0},
                {"x": 350.0, "y": 900.0},
            ],
        )
        self.assertTrue(by_type["pi"]["value"].endswith("°"))
        self.assertEqual(result["cfh"]["center"], {"x": 200.0, "y": 800.0})

    def test_lat_excel_row_uses_filename_id_and_metric_display_names(self):
        measurements = [
            {"type": "t1-slope", "value": "0.00°"},
            {"type": "pi", "value": "90.00°"},
        ]

        row = build_measurement_excel_row(
            "lat-case.jpg",
            measurements,
            [LatMeasurementMetric.T1_SLOPE, LatMeasurementMetric.PI],
        )

        self.assertEqual(
            row,
            {
                "id": "lat-case",
                "T1 Slope": "0.00°",
                "PI": "90.00°",
            },
        )


if __name__ == "__main__":
    unittest.main()
