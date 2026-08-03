"""Model-management HTTP schemas."""

from pydantic import BaseModel, Field

from app.contexts.model_management.domain import ModelViewType


class CreateModelRequest(BaseModel):
    name: str
    description: str | None = None
    view_type: ModelViewType
    endpoint_url: str
    version: str = "1.0.0"
    tags: list[str] = Field(default_factory=list)
