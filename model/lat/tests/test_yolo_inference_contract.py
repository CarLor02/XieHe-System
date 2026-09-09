import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import numpy as np

MODEL_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(MODEL_ROOT))

from lat.config import PELVIS_NAMES, VERTEBRA_NAMES
from lat.domain.detection_models import CFHDetection, Point, VertebraDetection
from lat.infrastructure.yolo_inference import InferenceService


class YoloInferenceContractTests(unittest.TestCase):
    def test_model_contracts_match_model1(self):
        spine_model = SimpleNamespace(
            task="pose",
            names=VERTEBRA_NAMES,
            model=SimpleNamespace(yaml={"kpt_shape": [4, 3]}),
        )
        pelvis_model = SimpleNamespace(
            task="pose",
            names=PELVIS_NAMES,
            model=SimpleNamespace(yaml={"kpt_shape": [3, 3]}),
        )

        InferenceService._validate_model_contract(
            spine_model, list(VERTEBRA_NAMES.values()), 4, "Corner"
        )
        InferenceService._validate_model_contract(
            pelvis_model, list(PELVIS_NAMES.values()), 3, "CFH"
        )

        self.assertEqual(VERTEBRA_NAMES[0], "C2")
        self.assertEqual(VERTEBRA_NAMES[14], "T13")
        self.assertEqual(VERTEBRA_NAMES[19], "L5")

    def test_invalid_model_contract_is_rejected(self):
        old_corner_model = SimpleNamespace(
            task="pose",
            names={0: "C7"},
            model=SimpleNamespace(yaml={"kpt_shape": [4, 3]}),
        )

        with self.assertRaisesRegex(ValueError, "Corner模型契约不匹配"):
            InferenceService._validate_model_contract(
                old_corner_model, list(VERTEBRA_NAMES.values()), 4, "Corner"
            )

    def test_detect_exposes_pelvis_s1_points_as_s1_detection(self):
        service = InferenceService.__new__(InferenceService)
        vertebra = VertebraDetection(
            label="C2",
            confidence=0.9,
            bbox=[0.2, 0.2, 0.1, 0.1],
            keypoints=[
                Point(x=0.1, y=0.1),
                Point(x=0.2, y=0.1),
                Point(x=0.1, y=0.2),
                Point(x=0.2, y=0.2),
            ],
        )
        pelvis = CFHDetection(
            confidence=0.8,
            bbox=[0.5, 0.8, 0.3, 0.2],
            center=Point(x=0.5, y=0.85),
            s1_left=Point(x=0.4, y=0.7),
            s1_right=Point(x=0.6, y=0.7),
        )
        service._detect_vertebrae = Mock(return_value=[vertebra])
        service._detect_cfh = Mock(return_value=pelvis)

        result = service.detect(np.zeros((100, 200, 3), dtype=np.uint8))

        self.assertEqual([item.label for item in result.vertebrae], ["C2", "S1"])
        self.assertEqual(
            result.vertebrae[1].keypoints, [pelvis.s1_left, pelvis.s1_right]
        )
        self.assertEqual(result.cfh.center, pelvis.center)


if __name__ == "__main__":
    unittest.main()
