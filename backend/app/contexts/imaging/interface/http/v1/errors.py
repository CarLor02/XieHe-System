"""影像应用错误到 HTTP 状态的统一转换。"""

from typing import NoReturn

from fastapi import HTTPException, status

from app.contexts.imaging.application.errors import (
    AiMeasurementUnavailableError,
    AiTaskQueueUnavailableError,
    AuthenticationRequiredError,
    ImageAccessDeniedError,
    ImageImportNotFoundError,
    ImageNotReadyError,
    InvalidImageOperationError,
    ObjectStorageUnavailableError,
    PatientNotFoundError,
)
from app.contexts.imaging.domain import (
    ImageFileNotFoundError,
    ImageTeamAssignmentDeniedError,
)


def raise_http_error(error: Exception) -> NoReturn:
    if isinstance(error, AuthenticationRequiredError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error))
    if isinstance(error, ImageFileNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="影像文件不存在"
        )
    if isinstance(error, (ImageAccessDeniedError, ImageTeamAssignmentDeniedError)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error))
    if isinstance(error, (ImageImportNotFoundError, PatientNotFoundError)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    if isinstance(error, ImageNotReadyError):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))
    if isinstance(error, InvalidImageOperationError):
        raise HTTPException(status_code=error.status_code, detail=error.detail)
    if isinstance(error, ObjectStorageUnavailableError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="对象存储服务不可用",
        )
    if isinstance(error, AiMeasurementUnavailableError):
        raise HTTPException(status_code=error.status_code, detail=error.detail)
    if isinstance(error, AiTaskQueueUnavailableError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        )
    raise error
