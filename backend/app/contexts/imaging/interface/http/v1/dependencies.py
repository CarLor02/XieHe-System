"""影像 HTTP v1 依赖装配。"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.contexts.imaging.application import (
    AnnotationApplicationService,
    ImageDeliveryService,
    ImageFileCommandService,
    ImageImportService,
    ImagePredictionService,
    ImageSelectionService,
    ImageUploadService,
    ImageUploadSessionService,
    ImageVisibilityApplicationService,
    ImagingQueryService,
    ImportConfiguration,
    ThumbnailSchedulingService,
    UploadSessionConfiguration,
)
from app.contexts.imaging.infrastructure.ai import AiModelMeasurementGateway
from app.contexts.imaging.infrastructure.messaging import (
    KafkaAiTaskPublisher,
    KafkaThumbnailTaskPublisher,
)
from app.contexts.imaging.infrastructure.persistence.repositories import (
    SqlAlchemyAnnotationHistoryRepository,
    SqlAlchemyAnnotationRepository,
    SqlAlchemyImageFileRepository,
    SqlAlchemyImageImportRepository,
    SqlAlchemyImageQueryRepository,
    SqlAlchemyImageStatisticsRepository,
    SqlAlchemyImageVisibilityRepository,
    SqlAlchemyThumbnailQueryRepository,
    SqlAlchemyThumbnailSchedulingRepository,
    SqlAlchemyUploadRepository,
    SqlAlchemyUploadSessionRepository,
)
from app.contexts.imaging.infrastructure.storage import StorageServiceObjectStorage
from app.core.config import settings
from app.shared.database import get_db


def build_image_visibility_service(
    db: Session,
) -> ImageVisibilityApplicationService:
    return ImageVisibilityApplicationService(SqlAlchemyImageVisibilityRepository(db))


def build_thumbnail_scheduling_service(db: Session) -> ThumbnailSchedulingService:
    return ThumbnailSchedulingService(
        SqlAlchemyThumbnailSchedulingRepository(db),
        KafkaThumbnailTaskPublisher(),
    )


def build_image_upload_session_service(db: Session) -> ImageUploadSessionService:
    return ImageUploadSessionService(
        SqlAlchemyUploadSessionRepository(db),
        build_image_visibility_service(db),
        StorageServiceObjectStorage(),
        build_thumbnail_scheduling_service(db),
        UploadSessionConfiguration(
            bucket=settings.IMAGE_FILE_BUCKET,
            part_size=settings.STORAGE_MULTIPART_PART_SIZE,
            expires_in=settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
            completion_lease_seconds=settings.IMAGE_UPLOAD_COMPLETION_LEASE_SECONDS,
        ),
    )


def get_annotation_service(
    db: Session = Depends(get_db),
) -> AnnotationApplicationService:
    return AnnotationApplicationService(
        SqlAlchemyAnnotationRepository(db),
        build_image_visibility_service(db),
    )


def get_imaging_query_service(
    db: Session = Depends(get_db),
) -> ImagingQueryService:
    return build_imaging_query_service(db)


def build_imaging_query_service(db: Session) -> ImagingQueryService:
    return ImagingQueryService(
        SqlAlchemyImageQueryRepository(db),
        SqlAlchemyAnnotationHistoryRepository(db),
        SqlAlchemyImageStatisticsRepository(db),
        build_image_visibility_service(db),
    )


def get_image_selection_service(
    db: Session = Depends(get_db),
) -> ImageSelectionService:
    return ImageSelectionService(
        SqlAlchemyImageFileRepository(db),
        build_image_visibility_service(db),
    )


def get_image_delivery_service(
    db: Session = Depends(get_db),
) -> ImageDeliveryService:
    return ImageDeliveryService(
        SqlAlchemyImageFileRepository(db),
        build_image_visibility_service(db),
        SqlAlchemyThumbnailQueryRepository(db),
        StorageServiceObjectStorage(),
        expires_in=settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
    )


def get_image_file_command_service(
    db: Session = Depends(get_db),
) -> ImageFileCommandService:
    visibility = build_image_visibility_service(db)
    annotation = AnnotationApplicationService(
        SqlAlchemyAnnotationRepository(db),
        visibility,
    )
    return ImageFileCommandService(
        SqlAlchemyImageFileRepository(db),
        visibility,
        annotation,
        StorageServiceObjectStorage(),
        build_thumbnail_scheduling_service(db),
    )


def get_image_prediction_service(
    db: Session = Depends(get_db),
) -> ImagePredictionService:
    return ImagePredictionService(
        build_image_visibility_service(db),
        AiModelMeasurementGateway(),
    )


def get_image_upload_service(
    db: Session = Depends(get_db),
) -> ImageUploadService:
    return ImageUploadService(
        SqlAlchemyUploadRepository(db),
        build_image_upload_session_service(db),
    )


def get_image_import_service(
    db: Session = Depends(get_db),
) -> ImageImportService:
    return ImageImportService(
        SqlAlchemyImageImportRepository(db),
        build_image_visibility_service(db),
        KafkaAiTaskPublisher(),
        build_image_upload_session_service(db),
        ImportConfiguration(
            max_files=settings.BATCH_IMPORT_MAX_FILES,
            session_window_size=10,
        ),
    )
