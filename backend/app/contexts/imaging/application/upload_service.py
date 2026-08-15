"""单文件影像上传会话用例。"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass
from datetime import datetime

from app.contexts.imaging.application.dto import (
    CompleteUpload,
    PageResult,
    ThumbnailTaskEvent,
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
    ImageFileDraft,
    ImageFileNotFoundError,
    ImageFileStatusEnum,
    ImageFileTypeEnum,
    build_storage_object_key,
    determine_image_file_type,
    normalize_storage_etag,
    validate_upload_file,
)

from .persistence_retry import run_with_persistence_retry
from .ports import ImageFileRecord, ObjectStorage, UploadRepository
from .thumbnail_scheduling_service import ThumbnailSchedulingService
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
        thumbnails: ThumbnailSchedulingService,
        configuration: UploadConfiguration,
    ) -> None:
        self._repository = repository
        self._visibility = visibility
        self._storage = storage
        self._thumbnails = thumbnails
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
        draft = ImageFileDraft(
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
            image = self._repository.create(draft)
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
        bucket = str(image.storage_bucket)
        object_key = str(image.object_key)
        expected_size = image.file_size
        expected_hash = completion.file_hash or image.file_hash
        # 外部 multipart 完成不能随数据库死锁一起重试；先结束只读事务，
        # 后续只对可回滚的数据库写回阶段执行有限重试。
        self._repository.rollback()
        try:
            completed = await self._storage.complete_multipart_upload(
                bucket=bucket,
                object_key=object_key,
                upload_id=completion.upload_id,
                parts=completion.parts,
            )
            stored = await self._storage.stat_object(
                bucket=bucket,
                object_key=object_key,
            )
            if stored.size != expected_size:
                self._mark_failed(image_file_id, owner_id)
                raise InvalidImageOperationError("对象大小校验失败")
            stored_hash = stored.metadata.get("file-hash") or stored.metadata.get(
                "File-Hash"
            )
            if expected_hash and stored_hash and expected_hash != stored_hash:
                self._mark_failed(image_file_id, owner_id)
                raise InvalidImageOperationError("对象哈希校验失败")
            source_etag = completed.etag or stored.etag
            uploaded_at = datetime.now()
            persisted_image, thumbnail_event = await run_with_persistence_retry(
                lambda: self._persist_completed_upload(
                    image_file_id=image_file_id,
                    owner_id=owner_id,
                    source_etag=source_etag,
                    uploaded_at=uploaded_at,
                ),
                rollback=self._repository.rollback,
                operation_name="complete-image-upload",
            )
        except InvalidImageOperationError:
            self._repository.rollback()
            raise
        except Exception:
            self._repository.rollback()
            raise
        await self._thumbnails.publish_after_commit(thumbnail_event)
        return self._status(persisted_image)

    def _persist_completed_upload(
        self,
        *,
        image_file_id: int,
        owner_id: int,
        source_etag: str | None,
        uploaded_at: datetime,
    ) -> tuple[ImageFileRecord, ThumbnailTaskEvent | None]:
        image = self._repository.get_active(image_file_id)
        if image is None:
            raise ImageFileNotFoundError
        if image.uploaded_by != owner_id:
            raise ImageAccessDeniedError("无权完成此文件上传")
        if image.status == ImageFileStatusEnum.UPLOADED:
            if normalize_storage_etag(image.storage_etag) != normalize_storage_etag(
                source_etag
            ):
                raise InvalidImageOperationError(
                    "影像内容版本已发生变化", status_code=409
                )
        elif image.status not in {
            ImageFileStatusEnum.UPLOADING,
            ImageFileStatusEnum.FAILED,
        }:
            raise InvalidImageOperationError("当前影像状态不允许完成上传")

        image.storage_etag = source_etag
        image.status = ImageFileStatusEnum.UPLOADED
        image.upload_progress = 100
        image.uploaded_at = uploaded_at
        thumbnail_event = self._thumbnails.prepare(image)
        self._repository.commit()
        self._repository.refresh(image)
        return image, thumbnail_event

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

    def _mark_failed(self, image_file_id: int, owner_id: int) -> None:
        image = self._repository.get_active(image_file_id)
        if image is None:
            raise ImageFileNotFoundError
        if image.uploaded_by != owner_id:
            raise ImageAccessDeniedError("无权完成此文件上传")
        image.status = ImageFileStatusEnum.FAILED
        image.upload_progress = 0
        self._repository.commit()

    @staticmethod
    def _status(image: ImageFileRecord) -> UploadStatus:
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
