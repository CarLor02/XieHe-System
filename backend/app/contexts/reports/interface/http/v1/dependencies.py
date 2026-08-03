"""FastAPI dependencies for report use cases."""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.contexts.reports.application import (
    ReportGenerationApplicationService,
    ReportManagementApplicationService,
)
from app.contexts.reports.infrastructure.persistence import (
    SqlAlchemyReportPatientReader,
    SqlAlchemyReportRepository,
    SqlAlchemyReportTransaction,
)
from app.shared.database import get_db


def get_report_generation_service() -> ReportGenerationApplicationService:
    return ReportGenerationApplicationService()


def get_report_management_service(
    db: Session = Depends(get_db),
) -> ReportManagementApplicationService:
    return ReportManagementApplicationService(
        SqlAlchemyReportRepository(db),
        SqlAlchemyReportPatientReader(db),
        SqlAlchemyReportTransaction(db),
    )
