"""影像 context 的接口层依赖装配。"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.contexts.imaging.application import (
    AnnotationApplicationService,
    ImageVisibilityApplicationService,
    ImagingQueryService,
)
from app.contexts.imaging.infrastructure import (
    SqlAlchemyAnnotationRepository,
    SqlAlchemyImageQueryRepository,
    SqlAlchemyImageVisibilityRepository,
)
from app.core.database.session import get_db


def get_annotation_service(
    db: Session = Depends(get_db),
) -> AnnotationApplicationService:
    visibility = ImageVisibilityApplicationService(
        SqlAlchemyImageVisibilityRepository(db)
    )
    return AnnotationApplicationService(SqlAlchemyAnnotationRepository(db), visibility)


def build_image_visibility_service(
    db: Session,
) -> ImageVisibilityApplicationService:
    """供尚未迁出旧 router 的接口复用同一个应用边界。"""

    return ImageVisibilityApplicationService(SqlAlchemyImageVisibilityRepository(db))


def get_imaging_query_service(
    db: Session = Depends(get_db),
) -> ImagingQueryService:
    return build_imaging_query_service(db)


def build_imaging_query_service(db: Session) -> ImagingQueryService:
    """为仍在旧路由包中的组合接口提供 context 查询服务。"""

    return ImagingQueryService(
        SqlAlchemyImageQueryRepository(db),
        build_image_visibility_service(db),
    )
