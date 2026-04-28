"""Schemas for the models API endpoints."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.services.model_manager import ModelManager, AIModel, ModelViewType, ModelConfiguration, ModelStatus

class CreateModelRequest(BaseModel):
    name: str
    description: Optional[str] = None
    view_type: ModelViewType
    endpoint_url: str
    version: str = "1.0.0"
    tags: List[str] = []


class UpdateModelRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    endpoint_url: Optional[str] = None
    tags: Optional[List[str]] = None


class ModelListResponse(BaseModel):
    models: List[AIModel]
    total: int
    page: int
    page_size: int


class ModelStats(BaseModel):
    total_models: int
    active_models: int
    view_distribution: Dict[str, int]
