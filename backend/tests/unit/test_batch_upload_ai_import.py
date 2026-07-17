from app.api.v1.endpoints.imaging.handlers import uploads


def test_batch_upload_routes_are_registered() -> None:
    paths = {route.path for route in uploads.router.routes}

    assert "/batches/config" in paths
    assert "/batches" in paths
    assert "/batches/{batch_id}/sessions" in paths
    assert "/batches/{batch_id}/items/{item_id}/complete" in paths
    assert "/batches/{batch_id}/items/{item_id}/enqueue" in paths
    assert "/batches/{batch_id}/items" in paths
    assert "/batch/complete" not in paths


def test_build_annotation_from_ai_response_preserves_viewer_shape() -> None:
    from app.services.batch_ai_import import build_annotation_from_ai_response

    annotation = build_annotation_from_ai_response(
        image_file_id=42,
        patient_id=7,
        exam_type="正位X光片",
        ai_response={
            "imageWidth": 1200,
            "imageHeight": 1800,
            "measurements": [
                {
                    "type": "Cobb-Auto1",
                    "value": "18.50°",
                    "points": [
                        {"x": 1, "y": 2},
                        {"x": 3, "y": 4},
                        {"x": 5, "y": 6},
                        {"x": 7, "y": 8},
                    ],
                    "upper_vertebra": "T5",
                    "lower_vertebra": "L1",
                },
                {
                    "type": "T1 Tilt",
                    "value": "3.20°",
                    "points": [{"x": 9, "y": 10}, {"x": 11, "y": 12}],
                },
            ],
            "vertebrae": [{"label": "T5", "corners": [], "confidence": 0.91}],
            "cfh": {"center": {"x": 10, "y": 20}, "confidence": 0.88},
        },
    )

    assert annotation["imageWidth"] == 1200
    assert annotation["imageHeight"] == 1800
    assert annotation["pointBindings"] == {"syncGroups": []}
    assert annotation["vertebraeLayer"] == [
        {"label": "T5", "corners": [], "confidence": 0.91}
    ]
    assert annotation["cfhAnnotation"] == {
        "center": {"x": 10, "y": 20},
        "confidence": 0.88,
    }

    cobb, t1_tilt = annotation["measurements"]
    assert cobb["id"] == "ai-42-1"
    assert cobb["type"] == "cobb1"
    assert cobb["originalType"] == "Cobb-Auto1"
    assert cobb["upperVertebra"] == "T5"
    assert cobb["lowerVertebra"] == "L1"
    assert cobb["value"] == "18.50°"

    assert t1_tilt["id"] == "ai-42-2"
    assert t1_tilt["type"] == "t1-tilt"
    assert t1_tilt["originalType"] == "T1 Tilt"
    assert t1_tilt["value"] == "3.20°"
