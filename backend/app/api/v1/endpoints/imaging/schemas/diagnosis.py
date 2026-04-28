"""Schemas for the diagnosis API endpoints."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field

class AIModelInfo(BaseModel):
    """AI模型信息"""
    name: str
    classes: List[str]
    is_loaded: bool
    description: str


class AIAnalysisRequest(BaseModel):
    """AI分析请求"""
    image_id: str = Field(..., description="图像ID")
    model_name: str = Field(..., description="AI模型名称")
    patient_id: Optional[str] = Field(None, description="患者ID")
    priority: str = Field("normal", description="优先级: low, normal, high")


class BatchAnalysisRequest(BaseModel):
    """批量AI分析请求"""
    image_ids: List[str] = Field(..., description="图像ID列表")
    model_name: str = Field(..., description="AI模型名称")
    patient_id: Optional[str] = Field(None, description="患者ID")


class ModelComparisonRequest(BaseModel):
    """模型比较请求"""
    image_id: str = Field(..., description="图像ID")
    model_names: List[str] = Field(..., description="AI模型名称列表")


class AIAnalysisResult(BaseModel):
    """AI分析结果"""
    analysis_id: str
    image_id: str
    model_name: str
    predicted_class: str
    confidence: float
    results: List[dict]
    suggestions: List[str]
    processing_time: float
    timestamp: str
    status: str = "completed"


class BatchAnalysisResult(BaseModel):
    """批量分析结果"""
    batch_id: str
    total_images: int
    success_count: int
    error_count: int
    results: List[dict]
    status: str
