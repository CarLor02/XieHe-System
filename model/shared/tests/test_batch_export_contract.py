import sys
import unittest
from pathlib import Path


MODEL_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(MODEL_ROOT))


class BatchExportContractTests(unittest.TestCase):
    def test_batch_export_helpers_are_shared(self):
        from shared.application.batch_export import IMAGE_EXTENSIONS, iter_images

        self.assertIn(".png", IMAGE_EXTENSIONS)
        self.assertEqual(iter_images(Path("/tmp/path-that-does-not-exist"), recursive=False), [])

    def test_model_scripts_do_not_import_from_root_app_module(self):
        ap_script = MODEL_ROOT / "ap" / "scripts" / "export_ai_measurements.py"
        lat_script = MODEL_ROOT / "lat" / "scripts" / "export_ai_measurements.py"

        self.assertNotIn("from app import", ap_script.read_text(encoding="utf-8"))
        self.assertNotIn("from app import", lat_script.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
