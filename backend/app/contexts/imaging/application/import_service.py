"""持久化批量影像导入流水线用例。"""

from __future__ import annotations

from dataclasses import dataclass

from app.contexts.imaging.application.dto import (
    CompleteUpload,
    CreateImportBatch,
    ImportBatch,
    ImportBatchCreated,
    ImportItem,
    ImportItemResult,
    ImportUploadSession,
    PageResult,
    UploadFileSpec,
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
    ImageFileStatusEnum,
    ImageImportAiStatus,
    ImageImportUploadStatus,
    ImageUploadSourceType,
    validate_upload_file,
)

from .ports import (
    AiTaskPublisher,
    ImageImportBatchRecord,
    ImageImportItemRecord,
    ImageImportRepository,
)
from .upload_session_service import ImageUploadSessionService
from .visibility_service import ImageVisibilityApplicationService


@dataclass(frozen=True, slots=True)
class ImportConfiguration:
    max_files: int
    session_window_size: int


class ImageImportService:
    def __init__(
        self,
        repository: ImageImportRepository,
        visibility: ImageVisibilityApplicationService,
        publisher: AiTaskPublisher,
        sessions: ImageUploadSessionService,
        configuration: ImportConfiguration,
    ) -> None:
        self._repository = repository
        self._visibility = visibility
        self._publisher = publisher
        self._sessions = sessions
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
            for item in items:
                if item.upload_status == ImageImportUploadStatus.UPLOADED.value:
                    continue
                upload = await self._sessions.create(
                    UploadFileSpec(
                        filename=str(item.filename),
                        size=item.size,
                        mime_type=str(item.mime_type),
                        patient_id=batch.patient_id,
                        description=batch.description,
                        team_ids=list(batch.team_ids or []),
                        file_hash=item.file_hash,
                    ),
                    actor,
                    source_type=ImageUploadSourceType.BATCH_IMPORT,
                    batch_item_id=item.id,
                    validated_team_ids=list(batch.team_ids or []),
                )
                item.upload_status = ImageImportUploadStatus.SESSION_CREATED.value
                item.error_message = None
                sessions.append(
                    ImportUploadSession(
                        item_id=item.id,
                        client_file_id=str(item.client_file_id),
                        session_id=upload.session_id,
                        file_uuid=upload.file_uuid,
                        storage_bucket=upload.storage_bucket,
                        object_key=upload.object_key,
                        part_size=upload.part_size,
                        expires_in=upload.expires_in,
                        parts=upload.parts,
                    )
                )
            self._repository.refresh_batch_status(batch)
            self._repository.commit()
        except Exception:
            self._repository.rollback()
            raise
        return sessions

    async def complete_item(
        self,
        batch_id: str,
        item_id: int,
        session_id: str,
        completion: CompleteUpload,
        actor: ImageAccessActor,
    ) -> ImportItemResult:
        batch = self._owned_batch(batch_id, actor)
        item = self._owned_item(batch, item_id)
        self._repository.rollback()
        try:
            await self._sessions.complete(
                session_id,
                completion,
                actor,
                expected_batch_item_id=item.id,
            )
            batch = self._owned_batch(batch_id, actor)
            item = self._owned_item(batch, item_id)
            task = self._repository.ensure_ai_task(item, self._owner_id(actor))
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

    async def mark_upload_failed(
        self,
        batch_id: str,
        item_id: int,
        session_id: str | None,
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
        if session_id is not None:
            await self._sessions.fail(
                session_id,
                error,
                actor,
                expected_batch_item_id=item.id,
            )
        batch = self._owned_batch(batch_id, actor)
        item = self._owned_item(batch, item_id)
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
