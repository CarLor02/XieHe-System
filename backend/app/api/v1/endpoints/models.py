"""
模型管理API端点

提供AI模型管理、模型统计、模型部署等功能的API接口
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from pydantic import BaseModel
from app.services.model_manager import ModelManager, AIModel, ModelViewType, ModelConfiguration, ModelStatus
from app.core.auth import get_current_active_user

router = APIRouter()
model_manager = ModelManager()

# Init ModelManager with absolute path if needed, usually handled inside the service
# model_manager = ModelManager() 

async def check_model_admin(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """检查是否有模型管理权限（管理员或团队管理员）"""
    is_admin = current_user.get("is_system_admin", False)
    roles = current_user.get("roles", [])
    
    # 允许系统管理员、团队管理员或拥有admin/system_admin/team_admin角色的用户
    if not (is_admin or "admin" in roles or "system_admin" in roles or "team_admin" in roles):
        raise HTTPException(status_code=403, detail="权限不足：需要管理员权限进行此操作")
    return current_user

# Pydantic models for API request/response
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

@router.get("")
async def get_models(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    view_type: Optional[ModelViewType] = Query(None, description="模型类型筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """获取模型列表（增强版，包含系统默认标识和删除权限）"""
    try:
        all_models = model_manager.get_models()

        # Filtering
        filtered_models = all_models
        if view_type:
            filtered_models = [m for m in filtered_models if m.view_type == view_type]

        if search:
            search_lower = search.lower()
            filtered_models = [
                m for m in filtered_models
                if search_lower in m.name.lower() or
                   (m.description and search_lower in m.description.lower())
            ]

        # 增强：添加 is_system_default 和 can_delete 字段
        enhanced_models = []
        for model in filtered_models:
            model_dict = model.dict()
            model_dict["is_system_default"] = model_manager.is_default_model(model.id)
            model_dict["can_delete"] = not model_dict["is_system_default"]
            enhanced_models.append(model_dict)

        # Pagination
        total = len(enhanced_models)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_models = enhanced_models[start:end]

        return {
            "models": paginated_models,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=AIModel)
async def create_model(
    request: CreateModelRequest,
    current_user: Dict[str, Any] = Depends(check_model_admin)
):
    """创建新模型（带健康检查）"""
    try:
        model = await model_manager.create_model(request.dict())
        return model
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建模型失败: {str(e)}")

@router.get("/configuration", response_model=ModelConfiguration)
async def get_configuration(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """获取当前模型配置"""
    return model_manager.get_configuration()

@router.put("/configuration", response_model=ModelConfiguration)
async def update_configuration(
    request: Dict[str, Optional[str]],
    current_user: Dict[str, Any] = Depends(check_model_admin)
):
    """更新当前模型配置"""
    # Convert pydantic model to dict, filtering None if needed, but here we expect full updates or partial? 
    # Usually config updates might be partial.
    update_data = {}
    if request.get("front_model_id") is not None:
        update_data["front_model_id"] = request["front_model_id"]
    if request.get("side_model_id") is not None:
        update_data["side_model_id"] = request["side_model_id"]
        
    return model_manager.update_configuration(update_data)

@router.get("/stats", response_model=ModelStats)
async def get_model_stats(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """获取模型统计信息"""
    models = model_manager.get_models()
    total = len(models)
    active = len([m for m in models if m.is_active])
    
    distribution = {
        "front": len([m for m in models if m.view_type == ModelViewType.FRONT]),
        "side": len([m for m in models if m.view_type == ModelViewType.SIDE]),
        "other": len([m for m in models if m.view_type == ModelViewType.OTHER]),
    }
    
    return ModelStats(
        total_models=total,
        active_models=active,
        view_distribution=distribution
    )

@router.get("/{model_id}", response_model=AIModel)
async def get_model(
    model_id: str,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """获取单个模型详情"""
    model = model_manager.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="模型未找到")
    return model

@router.put("/{model_id}", response_model=AIModel)
async def update_model(
    model_id: str, 
    request: CreateModelRequest,
    current_user: Dict[str, Any] = Depends(check_model_admin)
):
    """更新模型信息"""
    update_data = request.dict(exclude_unset=True)
    model = model_manager.update_model(model_id, update_data)
    if not model:
        raise HTTPException(status_code=404, detail="模型未找到")
    return model

@router.post("/{model_id}/refresh-status")
async def refresh_model_status(
    model_id: str,
    current_user: Dict[str, Any] = Depends(check_model_admin)
):
    """刷新模型状态（检查健康）"""
    try:
        model = await model_manager.refresh_model_status(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="模型未找到")
        return model
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"刷新状态失败: {str(e)}")

@router.post("/{model_id}/activate")
async def activate_model(
    model_id: str,
    current_user: Dict[str, Any] = Depends(check_model_admin)
):
    """激活模型"""
    try:
        result = model_manager.activate_model(model_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{model_id}")
async def delete_model(
    model_id: str,
    current_user: Dict[str, Any] = Depends(check_model_admin)
):
    """删除模型（增强版，带保护和回退逻辑）"""
    try:
        result = model_manager.delete_model(model_id)
        if not result.get("success"):
            raise HTTPException(status_code=404, detail="模型未找到或删除失败")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{model_id}/test")
async def test_model(
    model_id: str, 
    files: List[UploadFile] = File(...),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """测试模型"""
    try:
        # Pydantic's UploadFile needs to be converted for httpx
        file_list = []
        for file in files:
            content = await file.read()
            file_list.append(('files', (file.filename, content, file.content_type)))
            
        result = await model_manager.test_model(model_id, file_list)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"模型测试失败: {str(e)}")
