import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np


MODEL_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(MODEL_ROOT))

from ap.config import MODEL_CANDIDATE_CONF_THRESHOLD, POSE_CORNER_IMGSZ
from ap.infrastructure import yolo_inference


class FakeTensor:
    def __init__(self, values):
        self.values = np.asarray(values)

    def cpu(self):
        return self

    def numpy(self):
        return self.values


class FakeKeypoints:
    def __init__(self, values):
        self.data = FakeTensor(values)
        self._length = len(values)

    def __len__(self):
        return self._length


class FakeModel:
    def __init__(self, result):
        self.result = result
        self.calls = []

    def predict(self, image, **kwargs):
        self.calls.append((image, kwargs))
        return [self.result]


def corners(y, x=10):
    return [
        [x, y, 0.9],
        [x + 10, y, 0.9],
        [x + 10, y + 5, 0.9],
        [x, y + 5, 0.9],
    ]


class ApYoloInferenceTests(unittest.TestCase):
    def test_native_class_selection_keeps_best_supported_class_without_y_reindexing(self):
        result = SimpleNamespace(
            keypoints=FakeKeypoints(
                [
                    corners(100, 100),  # class 17 is deliberately above class 0
                    corners(300, 200),
                    corners(200, 300),
                    corners(210, 400),  # lower-confidence duplicate class 5
                    corners(400, 500),  # class 18 must not enter the standard output
                ]
            ),
            boxes=SimpleNamespace(
                cls=FakeTensor([17, 0, 5, 5, 18]),
                conf=FakeTensor([0.90, 0.80, 0.95, 0.60, 0.99]),
            ),
        )
        model = FakeModel(result)
        image = np.zeros((500, 600, 3), dtype=np.uint8)

        with patch.object(yolo_inference, "pose_corner_model", model):
            vertebrae = yolo_inference.infer_pose_corner(image)

        self.assertEqual(set(vertebrae), {"C7", "T5", "L5"})
        self.assertEqual(vertebrae["C7"]["class_id"], 0)
        self.assertEqual(vertebrae["C7"]["corners"]["top_left"]["y"], 300)
        self.assertEqual(vertebrae["T5"]["confidence"], 0.95)
        self.assertEqual(vertebrae["L5"]["class_id"], 17)
        self.assertNotIn("V18", vertebrae)
        self.assertEqual(
            model.calls[0][1],
            {
                "imgsz": POSE_CORNER_IMGSZ,
                "conf": MODEL_CANDIDATE_CONF_THRESHOLD,
                "verbose": False,
            },
        )

    def test_missing_native_class_does_not_shift_following_classes(self):
        assignments = yolo_inference._select_native_class_indices(
            np.asarray([0, 7, 8, 19]),
            np.asarray([0.8, 0.9, 0.7, 0.99]),
            confidence_threshold=0.5,
        )

        self.assertEqual(assignments, [(0, 0), (7, 1), (8, 2)])
        self.assertEqual(yolo_inference.class_id_to_vertebra_name(7), "T7")
        self.assertEqual(yolo_inference.class_id_to_vertebra_name(8), "T8")


if __name__ == "__main__":
    unittest.main()
