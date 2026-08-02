"""单文件影像上传会话用例。"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass
from datetime import datetime

from app.contexts.imaging.application.dto import (
    CompleteUpload,
    PageResult,
    UploadFileSpec,
    UploadRecord,
    UploadSession,
    UploadStatus,
)
from app.contexts.imaging.application.errors import (
    AuthenticationRequiredError,
    ImageAccessDeniedError,
    InvalidImageOperationError,
)
from app.contexts.imaging.domain import (
    ImageAccessActor,
    ImageFileNotFoundError,
    build_storage_object_key,
    determine_image_file_type,
    validate_upload_file,
)
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum

from .ports import ObjectStorage, UploadRepository
from .visibility_service import ImageVisibilityApplicationService


@dataclass(frozen=True, slots=True)
class UploadConfiguration:
    bucket: str
    part_size: int
    expires_in: int


class ImageUploadService:
    def __init__(
        self,
        repository: UploadRepository,
        visibility: ImageVisibilityApplicationService,
        storage: ObjectStorage,
        configuration: UploadConfiguration,
    ) -> None:
        self._repository = repository
        self._visibility = visibility
        self._storage = storage
        self._configuration = configuration

    async def create_session(
        self,
        spec: UploadFileSpec,
        actor: ImageAccessActor,
    ) -> UploadSession:
        owner_id = self._owner_id(actor)
        try:
            validate_upload_file(spec.filename, spec.mime_type)
        except ValueError as exc:
            raise InvalidImageOperationError(str(exc)) from exc
        team_ids = self._visibility.validate_assignable_team_ids(actor, spec.team_ids)
        file_uuid = str(uuid.uuid4())
        object_key = build_storage_object_key(file_uuid, spec.filename)
        image = ImageFile(
            file_uuid=file_uuid,
            original_filename=spec.filename,
            file_type=ImageFileTypeEnum(determine_image_file_type(spec.filename)),
            mime_type=spec.mime_type,
            storage_bucket=self._configuration.bucket,
            object_key=object_key,
            file_size=spec.size,
            file_hash=spec.file_hash,
            uploaded_by=owner_id,
            patient_id=spec.patient_id,
            study_date=datetime.now(),
            description=spec.description,
            status=ImageFileStatusEnum.UPLOADING,
            upload_progress=0,
        )
        try:
            await self._storage.ensure_bucket(self._configuration.bucket)
            multipart = await self._storage.create_multipart_upload(
                bucket=self._configuration.bucket,
                object_key=object_key,
                content_type=spec.mime_type,
                metadata={
                    "image-file-id": "pending",
                    "file-uuid": file_uuid,
                    "original-filename": spec.filename,
                    "file-hash": spec.file_hash or "",
                },
                part_count=max(1, math.ceil(spec.size / self._configuration.part_size)),
                expires_in=self._configuration.expires_in,
            )
            self._repository.add(image)
            self._repository.flush()
            self._visibility.replace_team_visibility(image, team_ids)
            self._repository.commit()
            self._repository.refresh(image)
        except Exception:
            self._repository.rollback()
            raise
        return UploadSession(
            image_file_id=image.id,
            file_uuid=str(image.file_uuid),
            storage_bucket=str(image.storage_bucket),
            object_key=str(image.object_key),
            upload_id=multipart.upload_id,
            part_size=self._configuration.part_size,
            expires_in=self._configuration.expires_in,
            parts=multipart.parts,
        )

    async def complete_session(
        self,
        image_file_id: int,
        completion: CompleteUpload,
        actor: ImageAccessActor,
    ) -> UploadStatus:
        owner_id = self._owner_id(actor)
        image = self._repository.get_active(image_file_id)
        if image is None:
            raise ImageFileNotFoundError
        if image.uploaded_by != owner_id:
            raise ImageAccessDeniedError("无权完成此文件上传")
        if image.status not in {
            ImageFileStatusEnum.UPLOADING,
            ImageFileStatusEnum.FAILED,
        }:
            raise InvalidImageOperationError("当前影像状态不允许完成上传")
        try:
            completed = await self._storage.complete_multipart_upload(
                bucket=str(image.storage_bucket),
                object_key=str(image.object_key),
                upload_id=completion.upload_id,
                parts=completion.parts,
            )
            stored = await self._storage.stat_object(
                bucket=str(image.storage_bucket),
                object_key=str(image.object_key),
            )
            if stored.size != image.file_size:
                self._mark_failed(image)
                raise InvalidImageOperationError("对象大小校验失败")
            expected_hash = completion.file_hash or image.file_hash
            stored_hash = stored.metadata.get("file-hash") or stored.metadata.get(
                "File-Hash"
            )
            if expected_hash and stored_hash and expected_hash != stored_hash:
                self._mark_failed(image)
                raise InvalidImageOperationError("对象哈希校验失败")
            image.storage_etag = completed.etag or stored.etag
            image.status = ImageFileStatusEnum.UPLOADED
            image.upload_progress = 100
            image.uploaded_at = datetime.now()
            self._repository.commit()
            self._repository.refresh(image)
        except InvalidImageOperationError:
            raise
        except Exception:
            self._repository.rollback()
            raise
        return self._status(image)

    def get_status(
        self,
        image_file_id: int,
        actor: ImageAccessActor,
    ) -> UploadStatus:
        owner_id = self._owner_id(actor)
        image = self._repository.get_active(image_file_id)
        if image is None:
            raise ImageFileNotFoundError
        if image.uploaded_by != owner_id:
            raise ImageAccessDeniedError("无权查看此上传记录")
        return self._status(image)

    def list_records(
        self,
        *,
        actor: ImageAccessActor,
        page: int,
        page_size: int,
        patient_id: int | None,
    ) -> PageResult[UploadRecord]:
        return self._repository.list_records(
            owner_id=self._owner_id(actor),
            page=page,
            page_size=page_size,
            patient_id=patient_id,
        )

    def _mark_failed(self, image: ImageFile) -> None:
        image.status = ImageFileStatusEnum.FAILED
        image.upload_progress = 0
        self._repository.commit()

    @staticmethod
    def _status(image: ImageFile) -> UploadStatus:
        return UploadStatus(
            image_file_id=image.id,
            file_uuid=str(image.file_uuid),
            status=image.status.value,
            upload_progress=int(image.upload_progress or 0),
        )

    @staticmethod
    def _owner_id(actor: ImageAccessActor) -> int:
        if actor.user_id is None:
            raise AuthenticationRequiredError("当前用户ID无效")
        return actor.user_id
