"""影像 context 的接口层依赖装配。"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.contexts.imaging.application import (
    AnnotationApplicationService,
    ImagingQueryService,
)
from app.contexts.imaging.infrastructure import (
    SqlAlchemyAnnotationRepository,
    SqlAlchemyImageQueryRepository,
)
from app.core.database.session import get_db


def get_annotation_service(
    db: Session = Depends(get_db),
) -> AnnotationApplicationService:
    return AnnotationApplicationService(SqlAlchemyAnnotationRepository(db))


def get_imaging_query_service(
    db: Session = Depends(get_db),
) -> ImagingQueryService:
    return ImagingQueryService(SqlAlchemyImageQueryRepository(db))
