from datetime import datetime

from app.contexts.imaging.domain import (
    AnnotationItemKind,
    canonicalize_annotation,
    diff_annotation_items,
    extract_annotation_items,
    has_annotation_content,
    snapshots_equal,
)


def test_canonicalize_preserves_extensions_and_ignores_save_time_for_equality() -> None:
    first = canonicalize_annotation(
        {"custom": {"enabled": True}},
        saved_at=datetime(2026, 8, 2, 10, 0),
    )
    second = canonicalize_annotation(
        {"custom": {"enabled": True}},
        saved_at=datetime(2026, 8, 2, 10, 1),
    )

    assert first["custom"] == {"enabled": True}
    assert snapshots_equal(first, second)


def test_has_annotation_content_distinguishes_explicit_empty_snapshot() -> None:
    assert not has_annotation_content(
        {
            "measurements": [],
            "vertebraeLayer": [],
            "pointBindings": {"syncGroups": []},
        }
    )
    assert has_annotation_content(
        {"vertebraeLayer": [{"label": "T1-1", "corners": [{"x": 1, "y": 2}]}]}
    )


def test_extract_items_supports_grouped_and_independent_keypoints() -> None:
    items = extract_annotation_items(
        {
            "vertebraeLayer": [
                {
                    "label": "T1",
                    "corners": [
                        {"x": 1, "y": 1},
                        {"x": 2, "y": 1},
                        {"x": 2, "y": 2},
                        {"x": 1, "y": 2},
                    ],
                },
                {
                    "label": "L1-1",
                    "corners": [{"x": 3, "y": 3}],
                },
            ]
        }
    )

    assert (AnnotationItemKind.KEYPOINT, "T1-1") in items
    assert (AnnotationItemKind.KEYPOINT, "T1-4") in items
    assert (AnnotationItemKind.KEYPOINT, "L1-1") in items


def test_diff_reports_visible_item_create_update_and_delete() -> None:
    previous = {
        "measurements": [{"id": "m1", "type": "ca", "value": "1°"}],
        "vertebraeLayer": [{"label": "T1-1", "corners": [{"x": 1, "y": 1}]}],
    }
    current = {
        "measurements": [{"id": "m1", "type": "ca", "value": "2°"}],
        "vertebraeLayer": [{"label": "T1-2", "corners": [{"x": 2, "y": 1}]}],
    }

    changes = {
        (change.kind, change.item_id): change.action
        for change in diff_annotation_items(previous, current)
    }

    assert changes[(AnnotationItemKind.MEASUREMENT, "m1")] == "UPDATED"
    assert changes[(AnnotationItemKind.KEYPOINT, "T1-1")] == "DELETED"
    assert changes[(AnnotationItemKind.KEYPOINT, "T1-2")] == "CREATED"


def test_overlong_item_ids_use_a_stable_bounded_audit_identity() -> None:
    long_id = "measurement-" + "x" * 200

    first = extract_annotation_items({"measurements": [{"id": long_id}]})
    second = extract_annotation_items({"measurements": [{"id": long_id}]})
    [(kind, item_id)] = first

    assert kind == AnnotationItemKind.MEASUREMENT
    assert item_id.startswith("sha256:")
    assert len(item_id) <= 128
    assert first.keys() == second.keys()
