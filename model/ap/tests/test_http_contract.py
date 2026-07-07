import sys
import unittest
from pathlib import Path


MODEL_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(MODEL_ROOT))


class ApHttpContractTests(unittest.TestCase):
    def test_ap_http_app_exposes_only_production_measurement_routes(self):
        from ap.interfaces.http.app import app

        routes = {
            route.path
            for route in app.routes
            if getattr(route, "include_in_schema", True)
        }

        self.assertIn("/health", routes)
        self.assertIn("/api/measurement", routes)
        self.assertNotIn("/predict", routes)
        self.assertNotIn("/detect_keypoints", routes)
        self.assertNotIn("/detect_keypoints_object", routes)


if __name__ == "__main__":
    unittest.main()
