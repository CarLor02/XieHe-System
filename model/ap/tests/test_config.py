import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


MODEL_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(MODEL_ROOT))

from ap.config import _boolean_env


class ApConfigTests(unittest.TestCase):
    def test_boolean_env_accepts_explicit_true_and_false(self):
        with patch.dict(os.environ, {"TEST_AP_BOOLEAN": "true"}):
            self.assertTrue(_boolean_env("TEST_AP_BOOLEAN", False))
        with patch.dict(os.environ, {"TEST_AP_BOOLEAN": "false"}):
            self.assertFalse(_boolean_env("TEST_AP_BOOLEAN", True))

    def test_boolean_env_rejects_invalid_value(self):
        with patch.dict(os.environ, {"TEST_AP_BOOLEAN": "flase"}):
            with self.assertRaisesRegex(ValueError, "must be a boolean"):
                _boolean_env("TEST_AP_BOOLEAN", True)


if __name__ == "__main__":
    unittest.main()
