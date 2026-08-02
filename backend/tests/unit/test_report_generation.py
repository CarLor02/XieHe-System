from __future__ import annotations

from datetime import datetime

from app.api.v1.api import api_router
from app.contexts.reports.application import ReportGenerationApplicationService
from app.contexts.reports.domain import (
    ReportMeasurement,
    extract_measurement_data,
    render_template,
)


def measurement(measurement_type: str, value: str) -> ReportMeasurement:
    return ReportMeasurement(type=measurement_type, value=value)


def test_extracts_existing_ap_report_measurement_mapping() -> None:
    data = extract_measurement_data(
        [
            measurement("Cobb", "32.5°"),
            measurement("Nash-Moe", "2"),
            measurement("T1 Tilt", "7.5°"),
            measurement("CA", "12°"),
            measurement("Pelvic", "3°"),
            measurement("TS", "-15mm"),
            measurement("C7 shift", "8mm"),
            measurement("AVT", "11mm"),
        ],
        "正位X光片",
    )

    assert data == {
        "Cobb_Angle": 32.5,
        "Nash_Moe_Grade": 2.0,
        "T1_Tilt": 7.5,
        "CA_Value": 12.0,
        "Pelvic_Obliquity": 3.0,
        "Trunk_Shift": 15.0,
        "C7_Shift": 8.0,
        "AVT_Value": 11.0,
        "Severity_Level": "中度侧弯",
        "Direction": "左",
        "Summary_Text": "中度侧弯，Cobb角32.5°",
    }


def test_extracts_existing_lateral_report_measurement_mapping() -> None:
    data = extract_measurement_data(
        [
            measurement("SVA", "55mm"),
            measurement("C2-C7 Cobb", "18°"),
            measurement("TK", "42°"),
            measurement("LL", "48°"),
            measurement("PI", "50°"),
            measurement("PT", "20°"),
            measurement("SS", "28°"),
            measurement("TPA", "15°"),
        ],
        "侧位X光片",
    )

    assert data == {
        "SVA_Value": 55.0,
        "CL_Value": 18.0,
        "TK_Value": 42.0,
        "LL_Value": 48.0,
        "PI_Value": 50.0,
        "PT_Value": 20.0,
        "SS_Value": 28.0,
        "TPA_Value": 15.0,
        "PT_Plus_SS": 48.0,
        "Gap": 2.0,
    }


def test_renders_existing_template_conditions_and_variables() -> None:
    rendered = render_template(
        "{{IF Cobb_Angle >= 10}}侧弯 {{Cobb_Angle}}{{END IF}}\n\n\n完成",
        {"Cobb_Angle": 12.5},
    )

    assert rendered == "侧弯 12.5\n\n完成"


def test_public_api_mounts_report_context_without_placeholder_users() -> None:
    paths = {route.path for route in api_router.routes}

    assert "/report-generation/generate" in paths
    assert "/reports/" in paths
    assert not any(path == "/users" or path.startswith("/users/") for path in paths)


def test_application_service_uses_injected_generation_time() -> None:
    service = ReportGenerationApplicationService(
        now=lambda: datetime(2026, 8, 2, 12, 30, 45)
    )

    result = service.generate(
        exam_type="正位X光片",
        measurements=[measurement("Cobb", "12°")],
    )

    assert result.generated_at == "2026-08-02 12:30:45"
    assert "报告生成时间：2026-08-02 12:30:45" in result.report
