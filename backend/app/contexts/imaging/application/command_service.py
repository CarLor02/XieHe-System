"""影像内容与元数据写操作用例。"""

from datetime import datetime

from app.contexts.imaging.application.dto import (
    BatchExamTypeMutationResult,
    ImageContentReplacement,
    ImageInfoUpdate,
    ImageMutationResult,
)
from app.contexts.imaging.application.errors import (
    ImageAccessDeniedError,
    InvalidImageOperationError,
)
from app.contexts.imaging.domain import (
    AnnotationMutationReason,
    AnnotationSource,
    ImageAccessActor,
    ImageFileNotFoundError,
    build_renamed_filename,
    determine_image_file_type,
    normalize_exam_type,
    validate_replacement_file,
)
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum

from .annotation_service import AnnotationApplicationService
from .ports import ImageFileRepository, ObjectStorage
from .visibility_service import ImageVisibilityApplicationService


class ImageFileCommandService:
    def __init__(
        self,
        repository: ImageFileRepository,
        visibility: ImageVisibilityApplicationService,
        annotation_service: AnnotationApplicationService,
        storage: ObjectStorage,
    ) -> None:
        self._repository = repository
        self._visibility = visibility
        self._annotation_service = annotation_service
        self._storage = storage

    def delete(self, image_file_id: int, actor: ImageAccessActor) -> int:
        image = self._repository.get_active(image_file_id)
        if image is None:
            raise ImageFileNotFoundError
        if self._visibility.get_visible_image(image_file_id, actor) is None:
            raise ImageAccessDeniedError("无权删除此文件")
        image.is_deleted = True
        image.deleted_at = datetime.now()
        image.deleted_by = actor.user_id
        self._commit()
        return image_file_id

    def update_info(
        self,
        image_file_id: int,
        actor: ImageAccessActor,
        update: ImageInfoUpdate,
    ) -> ImageMutationResult:
        image = self._visible_image(image_file_id, actor)
        warning = None
        if image.status == ImageFileStatusEnum.PROCESSED:
            warning = "该影像已完成AI分析，修改检查类型可能影响结果解读"
        elif image.annotation:
            warning = "该影像已有标注数据，修改检查类型可能影响标注关联"
        self._apply_info(image, actor, update)
        self._commit()
        self._repository.refresh(image)
        return ImageMutationResult(self._repository.get_detail(image), warning)

    def rename(
        self,
        image_file_id: int,
        actor: ImageAccessActor,
        basename: str,
    ) -> ImageMutationResult:
        image = self._visible_image(image_file_id, actor)
        try:
            image.original_filename = build_renamed_filename(
                str(image.original_filename), basename
            )
        except ValueError as exc:
            raise InvalidImageOperationError(str(exc), status_code=422) from exc
        image.updated_at = datetime.now()
        self._commit()
        self._repository.refresh(image)
        return ImageMutationResult(self._repository.get_detail(image))

    def update_exam_type(
        self,
        image_file_id: int,
        actor: ImageAccessActor,
        description: str,
    ) -> ImageMutationResult:
        image = self._visible_image(image_file_id, actor)
        try:
            image.description = normalize_exam_type(description)
        except ValueError as exc:
            raise InvalidImageOperationError(str(exc), status_code=422) from exc
        image.updated_at = datetime.now()
        self._commit()
        self._repository.refresh(image)
        return ImageMutationResult(self._repository.get_detail(image))

    def update_exam_types(
        self,
        image_file_ids: list[int],
        actor: ImageAccessActor,
        exam_type: str,
    ) -> BatchExamTypeMutationResult:
        try:
            normalized_exam_type = normalize_exam_type(exam_type)
        except ValueError as exc:
            raise InvalidImageOperationError(str(exc), status_code=422) from exc

        normalized_ids = sorted(set(image_file_ids))
        try:
            images = self._visibility.get_visible_images_by_ids(
                normalized_ids,
                actor,
                for_update=True,
            )
            if len(images) != len(normalized_ids):
                # 不区分不存在与无权限，避免通过批量接口探测不可见影像。
                raise ImageFileNotFoundError

            updated_ids: list[int] = []
            unchanged_ids: list[int] = []
            for image_file_id in normalized_ids:
                image = images[image_file_id]
                if image.description == normalized_exam_type:
                    unchanged_ids.append(image_file_id)
                    continue

                image.description = normalized_exam_type
                # 影像类型决定可用标注工具和领域规则；类型变化后旧标注不可继续解释，
                # 必须通过统一标注写入流程清空，以保留版本和逐项删除审计。
                self._annotation_service.save_locked_image(
                    image=image,
                    actor_id=actor.user_id,
                    annotation={},
                    source=AnnotationSource.SYSTEM,
                    reason=AnnotationMutationReason.EXAM_TYPE_CHANGE,
                )
                image.status = ImageFileStatusEnum.UPLOADED
                image.updated_at = datetime.now()
                updated_ids.append(image_file_id)

            self._commit()
            return BatchExamTypeMutationResult(
                updated_ids=tuple(updated_ids),
                unchanged_ids=tuple(unchanged_ids),
                exam_type=normalized_exam_type,
            )
        except Exception:
            self._repository.rollback()
            raise

    async def replace_content(
        self,
        image_file_id: int,
        actor: ImageAccessActor,
        replacement: ImageContentReplacement,
    ) -> ImageMutationResult:
        image = self._visible_image(image_file_id, actor)
        filename = replacement.filename or str(image.original_filename)
        content_type = (
            replacement.content_type or image.mime_type or "application/octet-stream"
        )
        try:
            validate_replacement_file(filename, content_type)
        except ValueError as exc:
            raise InvalidImageOperationError(str(exc)) from exc
        if not replacement.content:
            raise InvalidImageOperationError("替换文件不能为空")
        try:
            upload = await self._storage.put_object(
                bucket=str(image.storage_bucket),
                object_key=str(image.object_key),
                data=replacement.content,
                content_type=content_type,
            )
            locked_image = self._repository.get_active(image_file_id, for_update=True)
            if locked_image is None:
                raise ImageFileNotFoundError
            image = locked_image
            image.original_filename = filename
            image.file_type = ImageFileTypeEnum(determine_image_file_type(filename))
            image.mime_type = content_type
            image.file_size = len(replacement.content)
            image.file_hash = None
            image.storage_etag = upload.etag
            image.thumbnail_path = None
            self._apply_info(
                image,
                actor,
                ImageInfoUpdate(
                    description=replacement.description,
                    team_ids=replacement.team_ids,
                ),
            )
            image.upload_progress = 100
            image.uploaded_at = datetime.now()
            self._annotation_service.save_locked_image(
                image=image,
                actor_id=actor.user_id,
                annotation={},
                source=AnnotationSource.SYSTEM,
                reason=AnnotationMutationReason.CONTENT_REPLACEMENT,
                force_revision=True,
            )
            self._repository.commit()
            self._repository.refresh(image)
        except Exception:
            self._repository.rollback()
            raise
        return ImageMutationResult(self._repository.get_detail(image))

    def _visible_image(
        self,
        image_file_id: int,
        actor: ImageAccessActor,
    ) -> ImageFile:
        image = self._visibility.get_visible_image(image_file_id, actor)
        if image is None:
            raise ImageFileNotFoundError
        return image

    def _apply_info(
        self,
        image: ImageFile,
        actor: ImageAccessActor,
        update: ImageInfoUpdate,
    ) -> None:
        if update.description is not None:
            image.description = update.description
        if update.team_ids is not None:
            team_ids = self._visibility.validate_assignable_team_ids(
                actor,
                update.team_ids,
            )
            self._visibility.replace_team_visibility(image, team_ids)
        image.updated_at = datetime.now()

    def _commit(self) -> None:
        try:
            self._repository.commit()
        except Exception:
            self._repository.rollback()
            raise
