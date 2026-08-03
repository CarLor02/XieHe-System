"""Public report-generation domain API."""

from .management import (
    ReportManagementError,
    ReportNotDeletable,
    ReportNotEditable,
    ReportNotFound,
    ReportPatientNotFound,
    ensure_report_deletable,
    ensure_report_editable,
    generate_report_number,
    normalize_report_priority,
    report_priority_to_api,
)
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
    "ReportManagementError",
    "ReportNotDeletable",
    "ReportNotEditable",
    "ReportNotFound",
    "ReportPatientNotFound",
    "ensure_report_deletable",
    "ensure_report_editable",
    "generate_report_number",
    "normalize_report_priority",
    "report_priority_to_api",
    "extract_measurement_data",
    "generate_report_text",
    "render_template",
]
