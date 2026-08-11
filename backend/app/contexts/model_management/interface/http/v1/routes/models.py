"""模型中心 HTTP v1 适配器。"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.model_management.application import (
    CreateModelCommand,
    ModelManagementApplicationService,
    UpdateModelCommand,
)
from app.contexts.model_management.application.ports import ModelTestFile
from app.contexts.model_management.domain import (
    ModelNotFound,
    ModelOperationRejected,
    ModelViewType,
)
from app.core.system.response import paginated_response, success_response

from ..dependencies import get_model_management_service
from ..schemas import CreateModelRequest

router = APIRouter()


async def check_model_admin(
    current_user: dict[str, Any] = Depends(get_current_active_user),
) -> dict[str, Any]:
    roles = current_user.get("roles", [])
    if not (
        current_user.get("is_system_admin", False)
        or "admin" in roles
        or "system_admin" in roles
        or "team_admin" in roles
    ):
        raise HTTPException(
            status_code=403, detail="权限不足：需要管理员权限进行此操作"
        )
    return current_user


@router.get("", response_model=dict[str, Any])
async def get_models(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    view_type: ModelViewType | None = Query(None, description="模型类型筛选"),
    search: str | None = Query(None, description="搜索关键词"),
    _: dict[str, Any] = Depends(get_current_active_user),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, Any]:
    try:
        result = service.list(
            page=page,
            page_size=page_size,
            view_type=view_type,
            search=search,
        )
        return paginated_response(
            items=list(result.items),
            total=result.total,
            page=result.page,
            page_size=result.page_size,
            message="获取模型列表成功",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("", response_model=dict[str, Any])
async def create_model(
    request: CreateModelRequest,
    _: dict[str, Any] = Depends(check_model_admin),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, Any]:
    try:
        model = await service.create(
            CreateModelCommand(
                name=request.name,
                description=request.description,
                view_type=request.view_type,
                endpoint_url=request.endpoint_url,
                version=request.version,
                tags=tuple(request.tags),
            )
        )
        return success_response(data=model.to_dict(), message="创建模型成功")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"创建模型失败: {exc}") from exc


@router.get("/configuration", response_model=dict[str, Any])
async def get_configuration(
    _: dict[str, Any] = Depends(get_current_active_user),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, Any]:
    return success_response(
        data=service.get_configuration().to_dict(),
        message="获取模型配置成功",
    )


@router.put("/configuration", response_model=dict[str, Any])
async def update_configuration(
    request: dict[str, str | None],
    _: dict[str, Any] = Depends(check_model_admin),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, Any]:
    updates = {key: value for key, value in request.items() if value is not None}
    config = service.update_configuration(updates)
    return success_response(data=config.to_dict(), message="更新模型配置成功")


@router.get("/stats", response_model=dict[str, Any])
async def get_model_stats(
    _: dict[str, Any] = Depends(get_current_active_user),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, Any]:
    return success_response(data=service.stats().to_dict(), message="获取模型统计成功")


@router.get("/{model_id}", response_model=dict[str, Any])
async def get_model(
    model_id: str,
    _: dict[str, Any] = Depends(get_current_active_user),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, Any]:
    try:
        return success_response(
            data=service.get(model_id).to_dict(), message="获取模型详情成功"
        )
    except ModelNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/{model_id}", response_model=dict[str, Any])
async def update_model(
    model_id: str,
    request: CreateModelRequest,
    _: dict[str, Any] = Depends(check_model_admin),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, Any]:
    try:
        model = service.update(
            model_id,
            UpdateModelCommand(changes=request.model_dump(exclude_unset=True)),
        )
        return success_response(data=model.to_dict(), message="更新模型成功")
    except ModelNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{model_id}/refresh-status", response_model=dict[str, Any])
async def refresh_model_status(
    model_id: str,
    _: dict[str, Any] = Depends(check_model_admin),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, Any]:
    try:
        model = await service.refresh_status(model_id)
        return success_response(data=model.to_dict(), message="刷新模型状态成功")
    except ModelNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"刷新状态失败: {exc}") from exc


@router.post("/{model_id}/activate", response_model=dict[str, Any])
async def activate_model(
    model_id: str,
    _: dict[str, Any] = Depends(check_model_admin),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, Any]:
    try:
        return success_response(data=service.activate(model_id), message="激活模型成功")
    except ModelNotFound as exc:
        raise HTTPException(status_code=400, detail="模型不存在") from exc


@router.delete("/{model_id}", response_model=dict[str, Any])
async def delete_model(
    model_id: str,
    _: dict[str, Any] = Depends(check_model_admin),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, Any]:
    try:
        return success_response(
            data=service.delete(model_id).to_dict(),
            message="模型删除成功",
        )
    except (ModelNotFound, ModelOperationRejected) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{model_id}/test", response_model=dict[str, Any])
async def test_model(
    model_id: str,
    files: list[UploadFile] = File(...),
    _: dict[str, Any] = Depends(get_current_active_user),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, Any]:
    try:
        uploaded_files: list[ModelTestFile] = []
        for file in files:
            uploaded_files.append(
                (file.filename or "upload", await file.read(), file.content_type)
            )
        return success_response(
            data=await service.test(model_id, tuple(uploaded_files)),
            message="模型测试成功",
        )
    except (ModelNotFound, ModelOperationRejected) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"模型测试失败: {exc}") from exc
