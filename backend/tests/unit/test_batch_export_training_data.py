from __future__ import annotations

import importlib.util
import io
import json
import sys
from pathlib import Path
from types import ModuleType

import pytest
from PIL import Image


def load_export_module() -> ModuleType:
    script = Path(__file__).parents[2] / "scripts" / "batch_export_training_data.py"
    spec = importlib.util.spec_from_file_location("batch_export_training_data", script)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize(
    ("orientation", "expected_size"),
    [(6, (2, 4)), (8, (2, 4))],
)
def test_normalize_image_applies_exif_and_writes_real_png(
    orientation: int, expected_size: tuple[int, int]
) -> None:
    module = load_export_module()
    source = Image.new("RGB", (4, 2), "white")
    exif = Image.Exif()
    exif[274] = orientation
    encoded = io.BytesIO()
    source.save(encoded, format="JPEG", exif=exif)

    output, width, height = module.normalize_image_for_training_export(
        encoded.getvalue()
    )

    assert output.startswith(b"\x89PNG\r\n\x1a\n")
    assert (width, height) == expected_size
    with Image.open(io.BytesIO(output)) as normalized:
        assert normalized.format == "PNG"
        assert normalized.size == expected_size
        assert normalized.getexif().get(274) is None


class FakeClient:
    def __init__(self, image_bytes: bytes) -> None:
        self.image_bytes = image_bytes

    def download_bytes(self, _url: str) -> bytes:
        return self.image_bytes


def test_export_uses_oriented_dimensions_for_label(tmp_path: Path) -> None:
    module = load_export_module()
    source = Image.new("RGB", (4, 2), "white")
    exif = Image.Exif()
    exif[274] = 6
    encoded = io.BytesIO()
    source.save(encoded, format="JPEG", exif=exif)
    stats = module.ExportStats()
    annotation = {
        "imageWidth": 2,
        "imageHeight": 4,
        "vertebraeLayer": [
            {"label": "CR", "source": "manual", "corners": [{"x": 1, "y": 2}]}
        ],
    }

    module.export_one_image(
        FakeClient(encoded.getvalue()),
        {"id": 7, "original_filename": "oriented.jpg"},
        annotation,
        "https://example.test/image",
        None,
        tmp_path,
        stats,
    )

    exported_image = tmp_path / "7_oriented.png"
    exported_label = tmp_path / "7_oriented_label.json"
    assert exported_image.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
    payload = json.loads(exported_label.read_text(encoding="utf-8"))
    assert (payload["imageWidth"], payload["imageHeight"]) == (2, 4)
    assert payload["vertebrae"][0]["point"] == {"x": 0.5, "y": 0.5}
    assert stats.exported_with_label == 1
    assert stats.failed == []


def test_export_rejects_label_when_oriented_dimensions_disagree(
    tmp_path: Path,
) -> None:
    module = load_export_module()
    source = Image.new("RGB", (4, 2), "white")
    encoded = io.BytesIO()
    source.save(encoded, format="JPEG")
    stats = module.ExportStats()
    annotation = {
        "imageWidth": 2,
        "imageHeight": 4,
        "vertebraeLayer": [
            {"label": "CR", "source": "manual", "corners": [{"x": 1, "y": 2}]}
        ],
    }

    module.export_one_image(
        FakeClient(encoded.getvalue()),
        {"id": 8, "original_filename": "mismatch.jpg"},
        annotation,
        "https://example.test/image",
        None,
        tmp_path,
        stats,
    )

    assert (tmp_path / "8_mismatch.png").exists()
    assert not (tmp_path / "8_mismatch_label.json").exists()
    assert stats.exported_image_only == 1
    assert stats.skipped_dimension_mismatch == 1
    assert len(stats.failed) == 1
    assert "已跳过 label" in stats.failed[0]
