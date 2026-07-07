import sys
import unittest
from pathlib import Path


MODEL_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(MODEL_ROOT))


class LatHttpContractTests(unittest.TestCase):
    def test_lat_http_app_exposes_only_production_measurement_routes(self):
        from lat.interfaces.http.app import app

        routes = {
            route.path
            for route in app.routes
            if getattr(route, "include_in_schema", True)
        }

        self.assertIn("/health", routes)
        self.assertIn("/api/measurement", routes)
        self.assertNotIn("/api/detect", routes)
        self.assertNotIn("/api/detect_object", routes)
        self.assertNotIn("/api/keypoints", routes)
        self.assertNotIn("/api/detect_and_keypoints", routes)
        self.assertNotIn("/api/detect_and_keypoints_object", routes)
        self.assertNotIn("/api/calculate_metrics", routes)


if __name__ == "__main__":
    unittest.main()
