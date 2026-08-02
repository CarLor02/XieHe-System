"""影像领域错误。"""


class ImageFileNotFoundError(LookupError):
    """当前用户不可见的影像也按不存在处理。"""


class AnnotationVersionConflictError(RuntimeError):
    """客户端保存基于过期的标注版本。"""

    def __init__(self, current_version: int) -> None:
        self.current_version = current_version
        super().__init__(f"annotation version conflict: {current_version}")
