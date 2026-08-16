"""Durable multipart upload session orchestration shared by all image uploads."""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass
from datetime import timedelta

from app.contexts.imaging.domain import (
    ImageAccessActor,
    ImageFileDraft,
    ImageFileStatusEnum,
    ImageFileTypeEnum,
    ImageUploadSessionStatus,
    ImageUploadSourceType,
    build_storage_object_key,
    determine_image_file_type,
    normalize_storage_etag,
    validate_upload_file,
)

from .dto import (
    CompleteUpload,
    ImageUploadSessionDraft,
    PresignedPart,
    StoredObject,
    UploadFileSpec,
    UploadSession,
    UploadStatus,
)
from .errors import (
    AuthenticationRequiredError,
    ImageUploadSessionNotFoundError,
    InvalidImageOperationError,
    ObjectStorageObjectNotFoundError,
    PatientNotFoundError,
)
from .ports import ImageUploadSessionRecord, ObjectStorage, UploadSessionRepository
from .thumbnail_scheduling_service import ThumbnailSchedulingService
from .visibility_service import ImageVisibilityApplicationService


@dataclass(frozen=True, slots=True)
class UploadSessionConfiguration:
    bucket: str
    part_size: int
    expires_in: int
    completion_lease_seconds: int


class ImageUploadSessionService:
    def __init__(
        self,
        repository: UploadSessionRepository,
        visibility: ImageVisibilityApplicationService,
        storage: ObjectStorage,
        thumbnails: ThumbnailSchedulingService,
        configuration: UploadSessionConfiguration,
    ) -> None:
        self._repository = repository
        self._visibility = visibility
        self._storage = storage
        self._thumbnails = thumbnails
        self.configuration = configuration

    async def create(
        self,
        spec: UploadFileSpec,
        actor: ImageAccessActor,
        *,
        source_type: ImageUploadSourceType = ImageUploadSourceType.SINGLE,
        batch_item_id: int | None = None,
        validated_team_ids: list[int] | None = None,
    ) -> UploadSession:
        owner_id = self._owner_id(actor)
        try:
            validate_upload_file(spec.filename, spec.mime_type)
        except ValueError as exc:
            raise InvalidImageOperationError(str(exc)) from exc
        team_ids = (
            validated_team_ids
            if validated_team_ids is not None
            else self._visibility.validate_assignable_team_ids(actor, spec.team_ids)
        )
        if source_type == ImageUploadSourceType.BATCH_IMPORT and batch_item_id is None:
            raise InvalidImageOperationError("批量上传会话缺少导入项")
        if spec.patient_id is not None and not self._repository.patient_exists(
            spec.patient_id
        ):
            raise PatientNotFoundError("患者不存在")

        session_id = uuid.uuid4().hex
        file_uuid = str(uuid.uuid4())
        object_key = build_storage_object_key(file_uuid, spec.filename)
        session, previous = self._repository.create_replacing_active(
            ImageUploadSessionDraft(
                session_id=session_id,
                source_type=source_type.value,
                batch_item_id=batch_item_id,
                file_uuid=file_uuid,
                original_filename=spec.filename,
                file_type=ImageFileTypeEnum(determine_image_file_type(spec.filename)),
                mime_type=spec.mime_type,
                expected_size=spec.size,
                expected_hash=spec.file_hash,
                storage_bucket=self.configuration.bucket,
                object_key=object_key,
                uploaded_by=owner_id,
                patient_id=spec.patient_id,
                description=spec.description,
                team_ids=team_ids,
            )
        )
        self._repository.commit()
        for previous_session in previous:
            if previous_session.upload_id:
                await self._abort_best_effort(
                    previous_session.storage_bucket,
                    previous_session.object_key,
                    previous_session.upload_id,
                )

        multipart = None
        try:
            await self._storage.ensure_bucket(self.configuration.bucket)
            multipart = await self._storage.create_multipart_upload(
                bucket=self.configuration.bucket,
                object_key=object_key,
                content_type=spec.mime_type,
                metadata={
                    "upload-session-id": session_id,
                    "file-uuid": file_uuid,
                    "original-filename": spec.filename,
                    "file-hash": spec.file_hash or "",
                },
                part_count=max(1, math.ceil(spec.size / self.configuration.part_size)),
                expires_in=self.configuration.expires_in,
            )
            session = self._required_session(session_id, owner_id, for_update=True)
            if session.status != ImageUploadSessionStatus.INITIALIZING.value:
                self._repository.rollback()
                raise InvalidImageOperationError(
                    "上传会话已被新的请求替代", status_code=409
                )
            session.upload_id = multipart.upload_id
            session.status = ImageUploadSessionStatus.READY.value
            session.expires_at = self._repository.now() + timedelta(
                seconds=self.configuration.expires_in
            )
            self._repository.commit()
        except Exception as exc:
            self._repository.rollback()
            try:
                failed = self._repository.get_owned(
                    session_id, owner_id, for_update=True
                )
                if (
                    failed is not None
                    and failed.status == ImageUploadSessionStatus.INITIALIZING.value
                ):
                    failed.status = ImageUploadSessionStatus.FAILED.value
                    failed.last_error = str(exc)
                    self._repository.commit()
            finally:
                if multipart is not None:
                    await self._abort_best_effort(
                        self.configuration.bucket,
                        object_key,
                        multipart.upload_id,
                    )
            raise

        return self._session_view(session, parts=multipart.parts)

    async def complete(
        self,
        session_id: str,
        completion: CompleteUpload,
        actor: ImageAccessActor,
        *,
        expected_batch_item_id: int | None = None,
    ) -> UploadStatus:
        owner_id = self._owner_id(actor)
        session = self._required_session(session_id, owner_id, for_update=True)
        self._validate_batch_owner(session, expected_batch_item_id)
        if session.status == ImageUploadSessionStatus.COMPLETED.value:
            self._repository.rollback()
            return self._status_view(session)

        now = self._repository.now()
        if (
            session.status == ImageUploadSessionStatus.COMPLETING.value
            and session.completion_lease_expires_at is not None
            and session.completion_lease_expires_at > now
        ):
            self._repository.rollback()
            raise InvalidImageOperationError(
                "上传正在确认，请稍后查询", status_code=409
            )
        if session.status not in {
            ImageUploadSessionStatus.READY.value,
            ImageUploadSessionStatus.COMPLETING.value,
        }:
            self._repository.rollback()
            raise InvalidImageOperationError("当前上传会话不允许完成", status_code=409)

        if completion.file_hash and completion.file_hash != session.expected_hash:
            self._repository.rollback()
            raise InvalidImageOperationError(
                "文件哈希必须在创建会话时声明，且完成请求必须保持一致"
            )

        session.status = ImageUploadSessionStatus.COMPLETING.value
        session.completion_lease_expires_at = now + timedelta(
            seconds=self.configuration.completion_lease_seconds
        )
        session.last_error = None
        self._repository.commit()

        try:
            stored = await self._ensure_completed_object(session, completion)
            return await self._finalize_verified_session(session_id, owner_id, stored)
        except InvalidImageOperationError as exc:
            self._mark_failed(session_id, str(exc))
            raise
        except Exception:
            # Keep COMPLETING and its lease. A retry first stats the object, so an
            # external completion that won the race is recovered without duplication.
            self._repository.rollback()
            raise

    def get_status(self, session_id: str, actor: ImageAccessActor) -> UploadStatus:
        session = self._required_session(session_id, self._owner_id(actor))
        return self._status_view(session)

    async def recover_existing(self, session_id: str) -> UploadStatus:
        """Recover a stale session whose object may already exist in storage.

        This trusted reconciliation entry point intentionally has no user actor.
        It reuses the same stat validation and final transaction as the HTTP
        completion path, including the MinIO-complete/DB-not-written race.
        """

        session = self._repository.get_by_id(session_id, for_update=True)
        if session is None:
            raise ImageUploadSessionNotFoundError("上传会话不存在")
        if session.status == ImageUploadSessionStatus.COMPLETED.value:
            self._repository.rollback()
            return self._status_view(session)
        if session.status not in {
            ImageUploadSessionStatus.INITIALIZING.value,
            ImageUploadSessionStatus.READY.value,
            ImageUploadSessionStatus.COMPLETING.value,
        }:
            self._repository.rollback()
            raise InvalidImageOperationError("当前上传会话不可恢复", status_code=409)

        session.status = ImageUploadSessionStatus.COMPLETING.value
        session.completion_lease_expires_at = self._repository.now() + timedelta(
            seconds=self.configuration.completion_lease_seconds
        )
        session.last_error = None
        owner_id = session.uploaded_by
        self._repository.commit()
        try:
            stored = await self._storage.stat_object(
                bucket=session.storage_bucket,
                object_key=session.object_key,
            )
            self.validate_stored_object(session, stored, None)
            return await self._finalize_verified_session(session_id, owner_id, stored)
        except InvalidImageOperationError as exc:
            self._mark_failed(session_id, str(exc))
            raise
        except Exception:
            self._repository.rollback()
            raise

    async def fail(
        self,
        session_id: str,
        error: str,
        actor: ImageAccessActor,
        *,
        expected_batch_item_id: int | None = None,
    ) -> UploadStatus:
        session = self._required_session(
            session_id, self._owner_id(actor), for_update=True
        )
        self._validate_batch_owner(session, expected_batch_item_id)
        if session.status == ImageUploadSessionStatus.COMPLETED.value:
            self._repository.rollback()
            return self._status_view(session)
        if session.status == ImageUploadSessionStatus.COMPLETING.value:
            # Complete may already have committed the object to MinIO. A generic
            # browser failure report must not destroy the recoverable lease state.
            self._repository.rollback()
            raise InvalidImageOperationError(
                "上传正在确认，不能标记为失败", status_code=409
            )
        session.status = ImageUploadSessionStatus.FAILED.value
        session.last_error = error
        session.completion_lease_expires_at = None
        upload_id = session.upload_id
        bucket = session.storage_bucket
        object_key = session.object_key
        self._repository.commit()
        if upload_id:
            await self._abort_best_effort(bucket, object_key, upload_id)
        return self._status_view(session)

    async def _ensure_completed_object(
        self,
        session: ImageUploadSessionRecord,
        completion: CompleteUpload,
    ) -> StoredObject:
        upload = session
        try:
            stored = await self._storage.stat_object(
                bucket=upload.storage_bucket,
                object_key=upload.object_key,
            )
        except ObjectStorageObjectNotFoundError:
            if not upload.upload_id:
                raise InvalidImageOperationError("上传会话缺少 multipart upload ID")
            await self._storage.complete_multipart_upload(
                bucket=upload.storage_bucket,
                object_key=upload.object_key,
                upload_id=upload.upload_id,
                parts=completion.parts,
            )
            stored = await self._storage.stat_object(
                bucket=upload.storage_bucket,
                object_key=upload.object_key,
            )
        self.validate_stored_object(upload, stored, completion.file_hash)
        return stored

    async def _finalize_verified_session(
        self, session_id: str, owner_id: int, stored: StoredObject
    ) -> UploadStatus:
        session = self._required_session(session_id, owner_id, for_update=True)
        if session.status == ImageUploadSessionStatus.COMPLETED.value:
            self._repository.rollback()
            return self._status_view(session)
        if session.status != ImageUploadSessionStatus.COMPLETING.value:
            self._repository.rollback()
            raise InvalidImageOperationError("上传会话状态已发生变化", status_code=409)

        uploaded_at = self._repository.now()
        image = self._repository.create_image(
            ImageFileDraft(
                file_uuid=session.file_uuid,
                original_filename=session.original_filename,
                file_type=session.file_type,
                mime_type=session.mime_type,
                storage_bucket=session.storage_bucket,
                object_key=session.object_key,
                file_size=session.expected_size,
                file_hash=session.expected_hash,
                uploaded_by=session.uploaded_by,
                patient_id=session.patient_id,
                study_date=uploaded_at,
                description=session.description,
                status=ImageFileStatusEnum.UPLOADED,
                upload_progress=100,
            )
        )
        normalized_etag = normalize_storage_etag(stored.etag)
        image.storage_etag = normalized_etag
        image.uploaded_at = uploaded_at
        self._visibility.replace_team_visibility(image, list(session.team_ids or []))
        self._repository.attach_completed_batch_item(session, image)
        thumbnail_event = self._thumbnails.prepare(image)
        session.image_file_id = image.id
        session.storage_etag = normalized_etag
        session.status = ImageUploadSessionStatus.COMPLETED.value
        session.completed_at = uploaded_at
        session.completion_lease_expires_at = None
        session.last_error = None
        self._repository.commit()
        self._repository.refresh(session)
        await self._thumbnails.publish_after_commit(thumbnail_event)
        return self._status_view(session)

    async def _abort_best_effort(
        self, bucket: str, object_key: str, upload_id: str
    ) -> None:
        try:
            await self._storage.abort_multipart_upload(
                bucket=bucket,
                object_key=object_key,
                upload_id=upload_id,
            )
        except Exception:
            # Session state remains durable; reconciliation can retry cleanup.
            return

    def _mark_failed(self, session_id: str, error: str) -> None:
        self._repository.rollback()
        session = self._repository.get_by_id(session_id, for_update=True)
        if (
            session is None
            or session.status != ImageUploadSessionStatus.COMPLETING.value
        ):
            self._repository.rollback()
            return
        session.status = ImageUploadSessionStatus.FAILED.value
        session.last_error = error
        session.completion_lease_expires_at = None
        self._repository.commit()

    @staticmethod
    def validate_stored_object(
        session: ImageUploadSessionRecord,
        stored: StoredObject,
        completion_hash: str | None,
    ) -> None:
        if stored.size != session.expected_size:
            raise InvalidImageOperationError("对象大小校验失败")
        expected_hash = completion_hash or session.expected_hash
        stored_hash = stored.metadata.get("file-hash") or stored.metadata.get(
            "File-Hash"
        )
        if expected_hash:
            if not stored_hash:
                raise InvalidImageOperationError("对象缺少可验证的文件哈希")
            if expected_hash != stored_hash:
                raise InvalidImageOperationError("对象哈希校验失败")

    @staticmethod
    def _validate_batch_owner(
        session: ImageUploadSessionRecord, expected_batch_item_id: int | None
    ) -> None:
        if expected_batch_item_id is None:
            if session.source_type != ImageUploadSourceType.SINGLE.value:
                raise InvalidImageOperationError("上传会话类型不匹配", status_code=409)
            return
        if (
            session.source_type != ImageUploadSourceType.BATCH_IMPORT.value
            or session.batch_item_id != expected_batch_item_id
        ):
            raise InvalidImageOperationError(
                "上传会话不属于当前批量导入项", status_code=409
            )

    def _required_session(
        self, session_id: str, owner_id: int, *, for_update: bool = False
    ) -> ImageUploadSessionRecord:
        session = self._repository.get_owned(
            session_id, owner_id, for_update=for_update
        )
        if session is None:
            raise ImageUploadSessionNotFoundError("上传会话不存在")
        return session

    def _session_view(
        self, session: ImageUploadSessionRecord, *, parts: list[PresignedPart]
    ) -> UploadSession:
        return UploadSession(
            session_id=session.session_id,
            file_uuid=session.file_uuid,
            storage_bucket=session.storage_bucket,
            object_key=session.object_key,
            part_size=self.configuration.part_size,
            expires_in=self.configuration.expires_in,
            parts=parts,
        )

    @staticmethod
    def _status_view(session: ImageUploadSessionRecord) -> UploadStatus:
        return UploadStatus(
            session_id=session.session_id,
            file_uuid=session.file_uuid,
            status=session.status,
            upload_progress=(
                100 if session.status == ImageUploadSessionStatus.COMPLETED.value else 0
            ),
            image_file_id=session.image_file_id,
            expires_at=session.expires_at,
            error=session.last_error,
        )

    @staticmethod
    def _owner_id(actor: ImageAccessActor) -> int:
        if actor.user_id is None:
            raise AuthenticationRequiredError("当前用户ID无效")
        return actor.user_id
