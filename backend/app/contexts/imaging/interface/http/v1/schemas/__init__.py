"""影像 HTTP v1 schema。"""

from .annotations import (
    AnnotationBatchRequest,
    AnnotationSaveResponse,
    SaveAnnotationRequest,
)
from .image_files import (
    BatchDownloadUrlsRequest,
    ImageFileResponse,
    RenameImageFileRequest,
    UpdateExamTypeRequest,
    UpdateImageInfoRequest,
)
from .uploads import (
    BatchCreateUploadFileRequest,
    CompleteImageImportItemRequest,
    CompleteUploadPart,
    CompleteUploadSessionRequest,
    CreateImageImportBatchRequest,
    CreateImageImportSessionsRequest,
    CreateUploadSessionRequest,
    MarkImageImportUploadFailedRequest,
)

__all__ = [
    "AnnotationBatchRequest",
    "AnnotationSaveResponse",
    "BatchDownloadUrlsRequest",
    "BatchCreateUploadFileRequest",
    "CompleteImageImportItemRequest",
    "CompleteUploadPart",
    "CompleteUploadSessionRequest",
    "CreateImageImportBatchRequest",
    "CreateImageImportSessionsRequest",
    "CreateUploadSessionRequest",
    "ImageFileResponse",
    "MarkImageImportUploadFailedRequest",
    "RenameImageFileRequest",
    "SaveAnnotationRequest",
    "UpdateExamTypeRequest",
    "UpdateImageInfoRequest",
]
