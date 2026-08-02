"""Public report-generation domain API."""

from .models import GeneratedReport, ReportMeasurement, UnsupportedExamType
from .report_generator import (
    extract_measurement_data,
    generate_report_text,
    render_template,
)

__all__ = [
    "GeneratedReport",
    "ReportMeasurement",
    "UnsupportedExamType",
    "extract_measurement_data",
    "generate_report_text",
    "render_template",
]
