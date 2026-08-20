from __future__ import annotations

import json
from pathlib import Path
from typing import cast

from app.contexts.imaging.domain import JsonObject
from app.contexts.imaging.domain.exports import (
    build_labelme_document,
    count_annotation_keypoints,
    extract_measurement_values,
)


def _golden_fixture() -> dict[str, object]:
    repository_root = Path(__file__).resolve().parents[5]
    fixture_path = (
        repository_root
        / "packages/xiehe-imaging-core/src/exports/domain/fixtures/labelme-golden.json"
    )
    return cast(dict[str, object], json.loads(fixture_path.read_text(encoding="utf-8")))


def test_labelme_document_matches_shared_golden_fixture() -> None:
    fixture = _golden_fixture()
    fixture_input = cast(dict[str, object], fixture["input"])
    target_size = cast(dict[str, object], fixture_input["targetSize"])

    payload = build_labelme_document(
        image_path=cast(str, fixture_input["imagePath"]),
        annotation=cast(JsonObject, fixture_input["annotation"]),
        target_width=cast(int, target_size["width"]),
        target_height=cast(int, target_size["height"]),
    )

    assert payload == fixture["expected"]
    assert (
        count_annotation_keypoints(cast(JsonObject, fixture_input["annotation"])) == 12
    )


def test_labelme_document_supports_empty_annotation() -> None:
    payload = build_labelme_document(
        image_path="empty.png",
        annotation=None,
        target_width=640,
        target_height=960,
    )

    assert payload["shapes"] == []
    assert payload["imagePath"] == "empty.png"
    assert payload["imageWidth"] == 640
    assert payload["imageHeight"] == 960


def test_measurement_extraction_uses_last_alias_value_and_keeps_signs() -> None:
    extracted = extract_measurement_values(
        {
            "measurements": [
                {"type": "T1 Slope", "value": "12.00°"},
                {"type": "t1-slope", "value": "42.35°"},
                {"type": "C2-C7 CL", "value": "-8.25°"},
                {"type": "PI", "value": 0},
                {"type": "t12-l1", "value": "3.50°"},
                {"type": "SS", "value": "not-a-number"},
            ]
        }
    )

    assert extracted.values == {
        "T1 slope": 42.35,
        "C2-7": -8.25,
        "T12-L1": 3.5,
        "PI": 0.0,
    }
    assert extracted.duplicate_columns == ("T1 slope",)
    assert extracted.invalid_columns == ("SS",)


def test_t12_l1_is_not_inferred_from_other_measurements() -> None:
    extracted = extract_measurement_values(
        {"measurements": [{"type": "T10-L2", "value": "20.00°"}]}
    )

    assert extracted.values == {"T10-L2": 20.0}
    assert "T12-L1" not in extracted.values
