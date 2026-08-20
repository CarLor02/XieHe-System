"""Public repository adapter entry point for imaging composition roots."""

from .access_scope import (
    SqlAlchemyImageVisibilityRepository,
    apply_image_access_scope,
)
from .ai_task_execution_repository import SqlAlchemyAiTaskExecutionRepository
from .annotation_history_repository import SqlAlchemyAnnotationHistoryRepository
from .annotation_repository import SqlAlchemyAnnotationRepository
from .dataset_export_repository import SqlAlchemyDatasetExportRepository
from .image_file_repository import SqlAlchemyImageFileRepository
from .image_import_repository import SqlAlchemyImageImportRepository
from .image_query_repository import SqlAlchemyImageQueryRepository, image_summary
from .image_statistics_repository import SqlAlchemyImageStatisticsRepository
from .thumbnail_repository import (
    SqlAlchemyThumbnailQueryRepository,
    SqlAlchemyThumbnailSchedulingRepository,
    SqlAlchemyThumbnailTaskRepository,
)
from .upload_repository import SqlAlchemyUploadRepository
from .upload_session_repository import SqlAlchemyUploadSessionRepository

__all__ = [
    "SqlAlchemyAiTaskExecutionRepository",
    "SqlAlchemyAnnotationHistoryRepository",
    "SqlAlchemyAnnotationRepository",
    "SqlAlchemyDatasetExportRepository",
    "SqlAlchemyImageFileRepository",
    "SqlAlchemyImageImportRepository",
    "SqlAlchemyImageQueryRepository",
    "SqlAlchemyImageStatisticsRepository",
    "SqlAlchemyImageVisibilityRepository",
    "SqlAlchemyUploadRepository",
    "SqlAlchemyUploadSessionRepository",
    "SqlAlchemyThumbnailSchedulingRepository",
    "SqlAlchemyThumbnailQueryRepository",
    "SqlAlchemyThumbnailTaskRepository",
    "apply_image_access_scope",
    "image_summary",
]
