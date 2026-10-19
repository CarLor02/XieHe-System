"""Model-management HTTP schemas."""

from pydantic import BaseModel, ConfigDict, Field, JsonValue

from app.contexts.model_management.domain import ModelViewType


class CreateModelRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    name: str
    description: str | None = None
    view_type: ModelViewType
    endpoint_url: str
    version: str = "1.0.0"
    tags: list[str] = Field(default_factory=list)


class ModelConfigurationUpdate(BaseModel):
    # 省略与 null 均沿用原配置；清除默认模型不是当前用例支持的操作。
    front_model_id: str | None = None
    side_model_id: str | None = None


class ModelConfigurationResult(BaseModel):
    front_model_id: str | None
    side_model_id: str | None


class ModelResult(CreateModelRequest):
    id: str
    status: str
    is_active: bool
    created_at: str
    updated_at: str


class ModelListItem(ModelResult):
    is_system_default: bool
    can_delete: bool


class ModelStatsResult(BaseModel):
    total_models: int
    active_models: int
    view_distribution: dict[str, int]


class ModelActivationResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    success: bool
    model_id: str


class ModelDeletionResult(BaseModel):
    success: bool
    fallback_to_default: bool
    default_model_id: str | None


class ModelTestResult(BaseModel):
    # 外部模型允许返回各自的推理结果；扩展字段仅接受 JSON 值。
    model_config = ConfigDict(extra="allow")
    __pydantic_extra__: dict[str, JsonValue]
    success: bool | None = None
    result_image: str | None = None
