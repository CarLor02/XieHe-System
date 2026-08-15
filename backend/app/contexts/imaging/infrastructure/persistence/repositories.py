"""Public repository adapter entry point for imaging composition roots."""

from .access_scope import (
    SqlAlchemyImageVisibilityRepository,
    apply_image_access_scope,
)
from .ai_task_execution_repository import SqlAlchemyAiTaskExecutionRepository
from .annotation_history_repository import SqlAlchemyAnnotationHistoryRepository
from .annotation_repository import SqlAlchemyAnnotationRepository
from .image_file_repository import SqlAlchemyImageFileRepository
from .image_import_repository import SqlAlchemyImageImportRepository
from .image_query_repository import SqlAlchemyImageQueryRepository, image_summary
from .image_statistics_repository import SqlAlchemyImageStatisticsRepository
from .thumbnail_repository import (
    SqlAlchemyThumbnailSchedulingRepository,
    SqlAlchemyThumbnailTaskRepository,
)
from .upload_repository import SqlAlchemyUploadRepository

__all__ = [
    "SqlAlchemyAiTaskExecutionRepository",
    "SqlAlchemyAnnotationHistoryRepository",
    "SqlAlchemyAnnotationRepository",
    "SqlAlchemyImageFileRepository",
    "SqlAlchemyImageImportRepository",
    "SqlAlchemyImageQueryRepository",
    "SqlAlchemyImageStatisticsRepository",
    "SqlAlchemyImageVisibilityRepository",
    "SqlAlchemyUploadRepository",
    "SqlAlchemyThumbnailSchedulingRepository",
    "SqlAlchemyThumbnailTaskRepository",
    "apply_image_access_scope",
    "image_summary",
]
