"""SQLAlchemy read adapter for filename-driven dataset exports."""

from __future__ import annotations

from typing import cast

from sqlalchemy.orm import Session

from app.contexts.imaging.application.dto import DatasetExportCandidate
from app.contexts.imaging.domain import ImageFileStatusEnum, JsonObject
from app.contexts.patients.infrastructure.persistence.models import Patient
from app.contexts.teams.infrastructure.persistence.models import Team

from .image_file_models import ImageFile, ImageFileTeamVisibility


class SqlAlchemyDatasetExportRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def find_active_team_ids_by_exact_name(self, team_name: str) -> list[int]:
        rows = (
            self._session.query(Team.id, Team.name)
            .filter(Team.name == team_name, Team.is_active.is_(True))
            .all()
        )
        # 部署环境的 MySQL collation 可能忽略大小写；离线导出必须再次执行
        # Python 精确匹配，避免相似团队名称把数据导入错误的数据集。
        return [int(team_id) for team_id, name in rows if str(name) == team_name]

    def find_candidates(
        self,
        *,
        filenames: list[str],
        exam_type: str,
        team_id: int | None,
    ) -> list[DatasetExportCandidate]:
        if not filenames:
            return []
        requested = set(filenames)
        query = self._session.query(
            ImageFile.id,
            ImageFile.original_filename,
            ImageFile.description,
            ImageFile.storage_bucket,
            ImageFile.object_key,
            ImageFile.file_size,
            ImageFile.annotation,
            Patient.patient_id,
        ).join(Patient, ImageFile.patient_id == Patient.id)
        if team_id is not None:
            # 团队筛选使用影像的显式可见归属，不以上传者的团队成员身份推断。
            query = query.join(
                ImageFileTeamVisibility,
                ImageFileTeamVisibility.image_file_id == ImageFile.id,
            ).filter(ImageFileTeamVisibility.team_id == team_id)
        rows = (
            query.filter(
                ImageFile.original_filename.in_(filenames),
                ImageFile.description == exam_type,
                ImageFile.is_deleted.is_(False),
                Patient.is_deleted.is_(False),
                ImageFile.status.notin_(
                    [ImageFileStatusEnum.UPLOADING, ImageFileStatusEnum.DELETED]
                ),
            )
            .order_by(ImageFile.id.desc())
            .all()
        )
        # MySQL deployments commonly use a case-insensitive collation. Enforce the
        # CLI contract after the indexed IN query so only byte-for-byte names match.
        return [
            DatasetExportCandidate(
                image_file_id=int(image_file_id),
                original_filename=str(original_filename),
                description=str(description) if description is not None else None,
                storage_bucket=str(storage_bucket),
                object_key=str(object_key),
                file_size=int(file_size),
                patient_identifier=(
                    str(patient_identifier) if patient_identifier else None
                ),
                annotation=cast(JsonObject | None, annotation),
            )
            for (
                image_file_id,
                original_filename,
                description,
                storage_bucket,
                object_key,
                file_size,
                annotation,
                patient_identifier,
            ) in rows
            if str(original_filename) in requested
        ]
