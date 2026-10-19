"""影像查询和修改的 HTTP 成功数据。"""

from pydantic import BaseModel, JsonValue, RootModel

from .image_files import ImageFileResponse


class ImageNavigationResult(BaseModel):
    ids: list[int]


class ImageDeletionResult(BaseModel):
    file_id: int


class ImageMutationResult(ImageFileResponse):
    warning: str | None = None


class BatchExamTypeResult(BaseModel):
    updated_ids: list[int]
    unchanged_ids: list[int]
    updated_count: int
    unchanged_count: int
    exam_type: str


class ExternalPredictionResult(RootModel[dict[str, JsonValue]]):
    """对象推理端点原样透传模型协议，本轮仅限定可序列化 JSON。"""
