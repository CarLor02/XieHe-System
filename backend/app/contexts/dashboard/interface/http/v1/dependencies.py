"""Dashboard HTTP v1 依赖装配。"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.contexts.dashboard.application import DashboardQueryService
from app.contexts.dashboard.infrastructure import (
    DemoDashboardSupplementProvider,
    ImagingApplicationDashboardReader,
    SqlAlchemyPatientDashboardReader,
    SqlAlchemyReportDashboardReader,
)
from app.contexts.imaging.application import (
    ImageVisibilityApplicationService,
    ImagingQueryService,
)
from app.contexts.imaging.infrastructure.persistence.repositories import (
    SqlAlchemyAnnotationHistoryRepository,
    SqlAlchemyImageQueryRepository,
    SqlAlchemyImageStatisticsRepository,
    SqlAlchemyImageVisibilityRepository,
)
from app.shared.database import get_db


def build_dashboard_query_service(db: Session) -> DashboardQueryService:
    imaging_service = ImagingQueryService(
        SqlAlchemyImageQueryRepository(db),
        SqlAlchemyAnnotationHistoryRepository(db),
        SqlAlchemyImageStatisticsRepository(db),
        ImageVisibilityApplicationService(SqlAlchemyImageVisibilityRepository(db)),
    )
    return DashboardQueryService(
        SqlAlchemyPatientDashboardReader(db),
        ImagingApplicationDashboardReader(imaging_service),
        SqlAlchemyReportDashboardReader(db),
        DemoDashboardSupplementProvider(),
    )


def get_dashboard_query_service(
    db: Session = Depends(get_db),
) -> DashboardQueryService:
    return build_dashboard_query_service(db)
