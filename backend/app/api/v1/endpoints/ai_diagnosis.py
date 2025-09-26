"""
AI辅助诊断API端点

提供AI模型分析、批量诊断、模型比较等功能

@author XieHe Medical System
@created 2025-09-24
"""

from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.storage import storage_manager
from app.core.ai_diagnosis import ai_diagnosis_engine
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Pydantic模型
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

@router.get("/ai/models", response_model=List[str])
async def get_available_models(
    current_user = Depends(get_current_user)
):
    """
    获取可用的AI模型列表
    """
    try:
        models = ai_diagnosis_engine.get_available_models()
        logger.info(f"获取AI模型列表: {len(models)} 个模型")
        return models
        
    except Exception as e:
        logger.error(f"获取AI模型列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取AI模型列表失败"
        )

@router.get("/ai/models/{model_name}", response_model=AIModelInfo)
async def get_model_info(
    model_name: str,
    current_user = Depends(get_current_user)
):
    """
    获取指定AI模型的详细信息
    """
    try:
        model_info = ai_diagnosis_engine.get_model_info(model_name)
        
        if "error" in model_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=model_info["error"]
            )
        
        return AIModelInfo(**model_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取模型信息失败 {model_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取模型信息失败"
        )

@router.get("/ai/models/suggest/{modality}")
async def suggest_models_for_modality(
    modality: str,
    current_user = Depends(get_current_user)
):
    """
    根据影像模态推荐合适的AI模型
    """
    try:
        suggested_models = ai_diagnosis_engine.suggest_models_for_modality(modality.upper())
        
        return {
            "modality": modality,
            "suggested_models": suggested_models,
            "model_count": len(suggested_models)
        }
        
    except Exception as e:
        logger.error(f"推荐AI模型失败 {modality}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="推荐AI模型失败"
        )

@router.post("/ai/analyze", response_model=AIAnalysisResult)
async def analyze_image(
    request: AIAnalysisRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    使用AI模型分析单张图像
    """
    try:
        # 检查图像是否存在
        image_path = f"images/{request.image_id}"
        if not storage_manager.file_exists(image_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="图像文件不存在"
            )
        
        # 获取图像文件到临时路径
        image_content = storage_manager.load_file(image_path)
        if not image_content:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="无法加载图像文件"
            )
        
        # 保存到临时文件
        temp_path = Path(f"/tmp/{request.image_id}")
        with open(temp_path, 'wb') as f:
            f.write(image_content)
        
        try:
            # 执行AI分析
            result = ai_diagnosis_engine.analyze_image(
                temp_path, 
                request.model_name
            )
            
            if "error" in result:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result["error"]
                )
            
            # 生成分析ID
            analysis_id = f"analysis_{request.image_id}_{int(result.get('timestamp', '0').replace('-', '').replace(':', '').replace('T', '').replace('.', '')[:14])}"
            
            # 构建响应
            analysis_result = AIAnalysisResult(
                analysis_id=analysis_id,
                image_id=request.image_id,
                model_name=request.model_name,
                predicted_class=result.get("predicted_class", "未知"),
                confidence=result.get("confidence", 0.0),
                results=result.get("results", []),
                suggestions=result.get("suggestions", []),
                processing_time=result.get("processing_time", 0.0),
                timestamp=result.get("timestamp", ""),
                status="completed"
            )
            
            # 后台任务：保存分析结果到数据库
            background_tasks.add_task(
                save_analysis_result,
                analysis_result.dict(),
                request.patient_id,
                current_user.get("user_id")
            )
            
            logger.info(f"AI分析完成: {request.image_id} -> {request.model_name}")
            return analysis_result
            
        finally:
            # 清理临时文件
            if temp_path.exists():
                temp_path.unlink()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI图像分析失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI图像分析失败"
        )

@router.post("/ai/batch-analyze", response_model=BatchAnalysisResult)
async def batch_analyze_images(
    request: BatchAnalysisRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    批量AI图像分析
    """
    try:
        if len(request.image_ids) > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="批量分析最多支持50张图像"
            )
        
        # 准备图像文件路径
        image_paths = []
        for image_id in request.image_ids:
            image_path = f"images/{image_id}"
            if not storage_manager.file_exists(image_path):
                logger.warning(f"图像文件不存在: {image_id}")
                continue
            
            # 获取图像内容并保存到临时文件
            image_content = storage_manager.load_file(image_path)
            if image_content:
                temp_path = Path(f"/tmp/{image_id}")
                with open(temp_path, 'wb') as f:
                    f.write(image_content)
                image_paths.append(temp_path)
        
        if not image_paths:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="没有找到有效的图像文件"
            )
        
        try:
            # 执行批量分析
            batch_result = ai_diagnosis_engine.batch_analyze(
                image_paths,
                request.model_name
            )
            
            # 生成批次ID
            batch_id = f"batch_{int(batch_result['summary']['batch_timestamp'].replace('-', '').replace(':', '').replace('T', '').replace('.', '')[:14])}"
            
            # 构建响应
            result = BatchAnalysisResult(
                batch_id=batch_id,
                total_images=batch_result["summary"]["total_images"],
                success_count=batch_result["summary"]["success_count"],
                error_count=batch_result["summary"]["error_count"],
                results=batch_result["results"],
                status="completed"
            )
            
            # 后台任务：保存批量分析结果
            background_tasks.add_task(
                save_batch_analysis_result,
                result.dict(),
                request.patient_id,
                current_user.get("user_id")
            )
            
            logger.info(f"批量AI分析完成: {len(request.image_ids)} 张图像")
            return result
            
        finally:
            # 清理临时文件
            for temp_path in image_paths:
                if temp_path.exists():
                    temp_path.unlink()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批量AI分析失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="批量AI分析失败"
        )

@router.post("/ai/compare-models")
async def compare_models(
    request: ModelComparisonRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """
    使用多个AI模型分析同一图像并比较结果
    """
    try:
        # 检查图像是否存在
        image_path = f"images/{request.image_id}"
        if not storage_manager.file_exists(image_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="图像文件不存在"
            )
        
        # 获取图像文件到临时路径
        image_content = storage_manager.load_file(image_path)
        if not image_content:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="无法加载图像文件"
            )
        
        temp_path = Path(f"/tmp/{request.image_id}")
        with open(temp_path, 'wb') as f:
            f.write(image_content)
        
        try:
            # 执行模型比较
            comparison_result = ai_diagnosis_engine.compare_models(
                temp_path,
                request.model_names
            )
            
            # 生成比较ID
            comparison_id = f"comparison_{request.image_id}_{int(comparison_result['comparison_timestamp'].replace('-', '').replace(':', '').replace('T', '').replace('.', '')[:14])}"
            comparison_result["comparison_id"] = comparison_id
            
            # 后台任务：保存比较结果
            background_tasks.add_task(
                save_comparison_result,
                comparison_result,
                current_user.get("user_id")
            )
            
            logger.info(f"AI模型比较完成: {request.image_id} -> {request.model_names}")
            return comparison_result
            
        finally:
            # 清理临时文件
            if temp_path.exists():
                temp_path.unlink()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI模型比较失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI模型比较失败"
        )

@router.get("/ai/analysis/{analysis_id}")
async def get_analysis_result(
    analysis_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取AI分析结果
    """
    try:
        # 这里应该从数据库查询分析结果
        # 暂时返回模拟数据
        return {
            "analysis_id": analysis_id,
            "status": "completed",
            "message": "分析结果查询功能开发中"
        }
        
    except Exception as e:
        logger.error(f"获取分析结果失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取分析结果失败"
        )

# 后台任务函数
async def save_analysis_result(result_data: dict, patient_id: Optional[str], user_id: int):
    """保存AI分析结果到数据库"""
    try:
        # 这里应该保存到数据库
        logger.info(f"保存AI分析结果: {result_data['analysis_id']}")
    except Exception as e:
        logger.error(f"保存AI分析结果失败: {e}")

async def save_batch_analysis_result(result_data: dict, patient_id: Optional[str], user_id: int):
    """保存批量AI分析结果到数据库"""
    try:
        # 这里应该保存到数据库
        logger.info(f"保存批量AI分析结果: {result_data['batch_id']}")
    except Exception as e:
        logger.error(f"保存批量AI分析结果失败: {e}")

async def save_comparison_result(result_data: dict, user_id: int):
    """保存AI模型比较结果到数据库"""
    try:
        # 这里应该保存到数据库
        logger.info(f"保存AI模型比较结果: {result_data['comparison_id']}")
    except Exception as e:
        logger.error(f"保存AI模型比较结果失败: {e}")
