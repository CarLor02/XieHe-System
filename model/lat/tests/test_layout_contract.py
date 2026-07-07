import sys
import unittest
from pathlib import Path


MODEL_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(MODEL_ROOT))


class LatLayoutContractTests(unittest.TestCase):
    def test_lat_weights_directory_matches_ap_naming(self):
        from lat.config import CFH_MODEL_PATH, CORNER_MODEL_PATH

        self.assertEqual(CORNER_MODEL_PATH, MODEL_ROOT / "lat" / "weights" / "corner_model.pt")
        self.assertEqual(CFH_MODEL_PATH, MODEL_ROOT / "lat" / "weights" / "cfh_model.pt")

    def test_legacy_root_test_scripts_are_removed(self):
        lat_root = MODEL_ROOT / "lat"

        self.assertFalse((lat_root / "test_api.py").exists())
        self.assertFalse((lat_root / "test_format.py").exists())
        self.assertFalse((lat_root / "test_output_format.py").exists())


if __name__ == "__main__":
    unittest.main()
