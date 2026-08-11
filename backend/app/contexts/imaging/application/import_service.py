"""持久化批量影像导入流水线用例。"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass
from datetime import datetime

from app.contexts.imaging.application.dto import (
    CompleteUpload,
    CreateImportBatch,
    ImportBatch,
    ImportBatchCreated,
    ImportItem,
    ImportItemResult,
    ImportUploadSession,
    PageResult,
)
from app.contexts.imaging.application.errors import (
    AiTaskQueueUnavailableError,
    AuthenticationRequiredError,
    ImageImportNotFoundError,
    InvalidImageOperationError,
    PatientNotFoundError,
)
from app.contexts.imaging.domain import (
    AITaskStatusEnum,
    ImageAccessActor,
    ImageFileDraft,
    ImageFileNotFoundError,
    ImageFileStatusEnum,
    ImageFileTypeEnum,
    ImageImportAiStatus,
    ImageImportUploadStatus,
    build_storage_object_key,
    determine_image_file_type,
    validate_upload_file,
)

from .ports import (
    AiTaskPublisher,
    ImageFileRecord,
    ImageImportBatchRecord,
    ImageImportItemRecord,
    ImageImportRepository,
    ObjectStorage,
)
from .visibility_service import ImageVisibilityApplicationService


@dataclass(frozen=True, slots=True)
class ImportConfiguration:
    max_files: int
    session_window_size: int
    bucket: str
    part_size: int
    expires_in: int


class ImageImportService:
    def __init__(
        self,
        repository: ImageImportRepository,
        visibility: ImageVisibilityApplicationService,
        storage: ObjectStorage,
        publisher: AiTaskPublisher,
        configuration: ImportConfiguration,
    ) -> None:
        self._repository = repository
        self._visibility = visibility
        self._storage = storage
        self._publisher = publisher
        self.configuration = configuration

    def create_batch(
        self,
        command: CreateImportBatch,
        actor: ImageAccessActor,
    ) -> ImportBatchCreated:
        owner_id = self._owner_id(actor)
        if len(command.files) > self.configuration.max_files:
            raise InvalidImageOperationError(
                f"一次最多导入 {self.configuration.max_files} 张影像"
            )
        for file in command.files:
            try:
                validate_upload_file(file.filename, file.mime_type)
            except ValueError as exc:
                raise InvalidImageOperationError(str(exc)) from exc
        if not self._repository.patient_exists(command.patient_id):
            raise PatientNotFoundError("患者不存在")
        team_ids = self._visibility.validate_assignable_team_ids(
            actor,
            command.team_ids,
        )
        try:
            batch, items = self._repository.create_batch(
                owner_id=owner_id,
                command=command,
                team_ids=team_ids,
            )
            self._repository.commit()
        except Exception:
            self._repository.rollback()
            raise
        return ImportBatchCreated(
            batch=self._repository.batch_view(batch),
            items=[self._repository.item_view(item) for item in items],
        )

    async def create_sessions(
        self,
        batch_id: str,
        item_ids: list[int],
        actor: ImageAccessActor,
    ) -> list[ImportUploadSession]:
        batch = self._owned_batch(batch_id, actor)
        items = self._repository.list_items_by_ids(batch, item_ids)
        if len(items) != len(set(item_ids)):
            raise ImageImportNotFoundError("部分批量导入项不存在")
        sessions: list[ImportUploadSession] = []
        try:
            await self._storage.ensure_bucket(self.configuration.bucket)
            for item in items:
                if item.upload_status == ImageImportUploadStatus.UPLOADED.value:
                    continue
                sessions.append(await self._create_item_session(batch, item))
            self._repository.refresh_batch_status(batch)
            self._repository.commit()
        except Exception:
            self._repository.rollback()
            raise
        return sessions

    async def _create_item_session(
        self,
        batch: ImageImportBatchRecord,
        item: ImageImportItemRecord,
    ) -> ImportUploadSession:
        file_uuid = str(uuid.uuid4())
        filename = str(item.filename)
        mime_type = str(item.mime_type)
        object_key = build_storage_object_key(file_uuid, filename)
        multipart = await self._storage.create_multipart_upload(
            bucket=self.configuration.bucket,
            object_key=object_key,
            content_type=mime_type,
            metadata={
                "image-file-id": "pending",
                "file-uuid": file_uuid,
                "original-filename": filename,
                "file-hash": str(item.file_hash or ""),
            },
            part_count=max(1, math.ceil(item.size / self.configuration.part_size)),
            expires_in=self.configuration.expires_in,
        )
        draft = ImageFileDraft(
            file_uuid=file_uuid,
            original_filename=filename,
            file_type=ImageFileTypeEnum(determine_image_file_type(filename)),
            mime_type=mime_type,
            storage_bucket=self.configuration.bucket,
            object_key=object_key,
            file_size=item.size,
            file_hash=item.file_hash,
            uploaded_by=batch.uploaded_by,
            patient_id=batch.patient_id,
            study_date=datetime.now(),
            description=batch.description,
            status=ImageFileStatusEnum.UPLOADING,
            upload_progress=0,
        )
        image = self._repository.create_image(draft)
        team_ids = list(batch.team_ids or [])
        self._visibility.replace_team_visibility(image, team_ids)
        item.image_file_id = image.id
        item.upload_id = multipart.upload_id
        item.upload_status = ImageImportUploadStatus.SESSION_CREATED.value
        item.error_message = None
        return ImportUploadSession(
            item_id=item.id,
            client_file_id=str(item.client_file_id),
            image_file_id=image.id,
            file_uuid=file_uuid,
            storage_bucket=self.configuration.bucket,
            object_key=object_key,
            upload_id=multipart.upload_id,
            part_size=self.configuration.part_size,
            expires_in=self.configuration.expires_in,
            parts=multipart.parts,
        )

    async def complete_item(
        self,
        batch_id: str,
        item_id: int,
        completion: CompleteUpload,
        actor: ImageAccessActor,
    ) -> ImportItemResult:
        batch = self._owned_batch(batch_id, actor)
        item = self._owned_item(batch, item_id)
        image = self._repository.get_active_image(item.image_file_id)
        if image is None:
            raise ImageFileNotFoundError
        try:
            if item.upload_status != ImageImportUploadStatus.UPLOADED.value:
                await self._complete_item_upload(item, image, completion)
            task = self._repository.ensure_ai_task(
                item,
                requested_by=self._owner_id(actor),
            )
            self._repository.refresh_batch_status(batch)
            event = self._repository.ai_task_event(task, item, batch)
            self._repository.commit()
        except Exception:
            self._repository.rollback()
            raise

        message = "影像上传完成，AI任务已提交"
        try:
            await self._publisher.publish(event)
        except Exception:
            item = self._owned_item(batch, item_id)
            item.ai_status = ImageImportAiStatus.PENDING.value
            item.error_message = "AI任务排队失败，可重新入队"
            self._repository.refresh_batch_status(batch)
            self._repository.commit()
            message = "影像上传完成，AI任务排队失败，可重新入队"
        self._repository.refresh_item(item)
        return ImportItemResult(self._repository.item_view(item), message)

    async def _complete_item_upload(
        self,
        item: ImageImportItemRecord,
        image: ImageFileRecord,
        completion: CompleteUpload,
    ) -> None:
        if completion.upload_id != item.upload_id:
            raise InvalidImageOperationError("上传会话已失效", status_code=409)
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
            raise InvalidImageOperationError("对象大小校验失败")
        expected_hash = completion.file_hash or image.file_hash
        stored_hash = stored.metadata.get("file-hash") or stored.metadata.get(
            "File-Hash"
        )
        if expected_hash and stored_hash and expected_hash != stored_hash:
            raise InvalidImageOperationError("对象哈希校验失败")
        image.storage_etag = completed.etag or stored.etag
        image.status = ImageFileStatusEnum.UPLOADED
        image.upload_progress = 100
        image.uploaded_at = datetime.now()
        item.upload_status = ImageImportUploadStatus.UPLOADED.value

    def mark_upload_failed(
        self,
        batch_id: str,
        item_id: int,
        error: str,
        actor: ImageAccessActor,
    ) -> ImportItemResult:
        batch = self._owned_batch(batch_id, actor)
        item = self._owned_item(batch, item_id)
        if item.upload_status == ImageImportUploadStatus.UPLOADED.value:
            return ImportItemResult(
                self._repository.item_view(item),
                "影像已经上传完成，忽略迟到的失败回报",
            )
        item.upload_status = ImageImportUploadStatus.FAILED.value
        item.ai_status = ImageImportAiStatus.FAILED.value
        item.error_message = error
        if item.image_file is not None:
            item.image_file.status = ImageFileStatusEnum.FAILED
            item.image_file.upload_progress = 0
        self._repository.refresh_batch_status(batch)
        self._repository.commit()
        self._repository.refresh_item(item)
        return ImportItemResult(
            self._repository.item_view(item),
            "上传失败状态已记录",
        )

    async def enqueue_item(
        self,
        batch_id: str,
        item_id: int,
        actor: ImageAccessActor,
    ) -> ImportItemResult:
        batch = self._owned_batch(batch_id, actor)
        item = self._owned_item(batch, item_id)
        if item.upload_status != ImageImportUploadStatus.UPLOADED.value:
            raise InvalidImageOperationError("影像尚未上传完成", status_code=409)
        task = self._repository.ensure_ai_task(item, self._owner_id(actor))
        if task.status == AITaskStatusEnum.COMPLETED:
            return ImportItemResult(
                self._repository.item_view(item),
                "AI任务已经完成",
            )
        if (
            item.image_file is not None
            and item.image_file.status == ImageFileStatusEnum.FAILED
        ):
            item.image_file.status = ImageFileStatusEnum.UPLOADED
        self._repository.refresh_batch_status(batch)
        event = self._repository.ai_task_event(task, item, batch)
        self._repository.commit()
        try:
            await self._publisher.publish(event)
        except Exception as exc:
            item = self._owned_item(batch, item_id)
            item.ai_status = ImageImportAiStatus.PENDING.value
            item.error_message = "AI任务排队失败，可重新入队"
            self._repository.commit()
            raise AiTaskQueueUnavailableError("AI任务队列暂不可用") from exc
        self._repository.refresh_item(item)
        return ImportItemResult(
            self._repository.item_view(item),
            "AI任务已重新提交",
        )

    def list_batches(
        self,
        *,
        actor: ImageAccessActor,
        page: int,
        page_size: int,
        status: str | None,
    ) -> PageResult[ImportBatch]:
        return self._repository.list_batches(
            owner_id=self._owner_id(actor),
            page=page,
            page_size=page_size,
            status=status,
        )

    def list_items(
        self,
        *,
        batch_id: str,
        actor: ImageAccessActor,
        page: int,
        page_size: int,
    ) -> PageResult[ImportItem]:
        batch = self._owned_batch(batch_id, actor)
        return self._repository.list_items(
            batch=batch,
            page=page,
            page_size=page_size,
        )

    def _owned_batch(
        self,
        batch_id: str,
        actor: ImageAccessActor,
    ) -> ImageImportBatchRecord:
        batch = self._repository.get_owned_batch(batch_id, self._owner_id(actor))
        if batch is None:
            raise ImageImportNotFoundError("批量导入任务不存在")
        return batch

    def _owned_item(
        self,
        batch: ImageImportBatchRecord,
        item_id: int,
    ) -> ImageImportItemRecord:
        item = self._repository.get_owned_item(batch, item_id)
        if item is None:
            raise ImageImportNotFoundError("批量导入项不存在")
        return item

    @staticmethod
    def _owner_id(actor: ImageAccessActor) -> int:
        if actor.user_id is None:
            raise AuthenticationRequiredError("当前用户ID无效")
        return actor.user_id
