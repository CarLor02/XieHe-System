"""SQLAlchemy 影像统计查询。"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Query, Session

from app.contexts.imaging.application.dto import (
    DashboardImageCounts,
    ImageStatistics,
    RecentImage,
)
from app.contexts.imaging.domain import ImageAccessScope, ImageFileStatusEnum

from .access_scope import apply_image_access_scope
from .image_file_models import ImageFile


class SqlAlchemyImageStatisticsRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _visible_image_query(self, scope: ImageAccessScope) -> Query[Any]:
        query = self._session.query(ImageFile).filter(ImageFile.is_deleted.is_(False))
        return apply_image_access_scope(query, scope)

    def get_image_stats(self, scope: ImageAccessScope) -> ImageStatistics:
        query = self._visible_image_query(scope)
        total_files, total_size = query.with_entities(
            func.count(ImageFile.id),
            func.coalesce(func.sum(ImageFile.file_size), 0),
        ).one()
        by_type = {
            str(file_type.value): count
            for file_type, count in query.with_entities(
                ImageFile.file_type,
                func.count(ImageFile.id),
            )
            .group_by(ImageFile.file_type)
            .all()
        }
        by_status = {
            str(file_status.value): count
            for file_status, count in query.with_entities(
                ImageFile.status,
                func.count(ImageFile.id),
            )
            .group_by(ImageFile.status)
            .all()
        }
        return ImageStatistics(
            total_files=int(total_files),
            total_size=int(total_size),
            by_type=by_type,
            by_status=by_status,
        )

    def get_dashboard_counts(
        self,
        *,
        scope: ImageAccessScope,
        today_start: datetime,
        week_start: datetime,
    ) -> DashboardImageCounts:
        query = self._visible_image_query(scope)
        return DashboardImageCounts(
            total=query.count(),
            today=query.filter(ImageFile.created_at >= today_start).count(),
            week=query.filter(ImageFile.created_at >= week_start).count(),
            pending=query.filter(
                ImageFile.status.in_(
                    [ImageFileStatusEnum.UPLOADED, ImageFileStatusEnum.PROCESSING]
                )
            ).count(),
            processed=query.filter(
                ImageFile.status == ImageFileStatusEnum.PROCESSED
            ).count(),
        )

    def list_recent_images(
        self,
        *,
        scope: ImageAccessScope,
        limit: int,
    ) -> list[RecentImage]:
        images = (
            self._visible_image_query(scope)
            .order_by(ImageFile.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            RecentImage(
                id=image.id,
                original_filename=str(image.original_filename),
                created_at=image.created_at,
                status=image.status.value,
            )
            for image in images
        ]
