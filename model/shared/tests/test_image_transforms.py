import sys
import unittest
from pathlib import Path

import numpy as np

MODEL_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(MODEL_ROOT))

from shared.image_transforms import maybe_lr_flip


class ImageTransformsTests(unittest.TestCase):
    def test_lr_flip_reverses_image_columns_when_enabled(self):
        image = np.arange(12).reshape((2, 3, 2))

        flipped = maybe_lr_flip(image, enabled=True)

        np.testing.assert_array_equal(flipped, image[:, ::-1, :])
        self.assertFalse(np.shares_memory(flipped, image))

    def test_lr_flip_returns_original_image_when_disabled(self):
        image = np.arange(12).reshape((2, 3, 2))

        self.assertIs(maybe_lr_flip(image, enabled=False), image)


if __name__ == "__main__":
    unittest.main()
