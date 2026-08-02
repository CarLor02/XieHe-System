"""FastAPI dependencies for report generation."""

from app.contexts.reports.application import ReportGenerationApplicationService


def get_report_generation_service() -> ReportGenerationApplicationService:
    return ReportGenerationApplicationService()
