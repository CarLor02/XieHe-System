"""影像应用用例对接口层公开的失败类型。"""


class ImagingApplicationError(RuntimeError):
    pass


class ImageAccessDeniedError(ImagingApplicationError):
    pass


class AuthenticationRequiredError(ImagingApplicationError):
    pass


class ImageNotReadyError(ImagingApplicationError):
    pass


class InvalidImageOperationError(ImagingApplicationError):
    def __init__(self, detail: str, status_code: int = 400) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class ImageImportNotFoundError(ImagingApplicationError):
    pass


class PatientNotFoundError(ImagingApplicationError):
    pass


class AiTaskQueueUnavailableError(ImagingApplicationError):
    pass


class AiTaskModelError(ImagingApplicationError):
    def __init__(self, detail: str, *, transient: bool) -> None:
        super().__init__(detail)
        self.detail = detail
        self.transient = transient


class ObjectStorageUnavailableError(ImagingApplicationError):
    pass


class ThumbnailGenerationError(ImagingApplicationError):
    """Worker failure classified for bounded retry handling."""

    def __init__(self, detail: str, *, transient: bool) -> None:
        super().__init__(detail)
        self.detail = detail
        self.transient = transient


class AiMeasurementUnavailableError(ImagingApplicationError):
    def __init__(self, detail: str, status_code: int = 502) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code
