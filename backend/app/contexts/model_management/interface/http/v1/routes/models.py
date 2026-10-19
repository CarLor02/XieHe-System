"""模型中心 HTTP v1 适配器。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.contexts.access_control.application import AccessPrincipal
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
)
from app.core.system.response import (
    ApiResponse,
    PaginatedData,
    paginated_response,
    success_response,
)

from ..dependencies import get_model_management_service
from ..schemas import CreateModelRequest
from ..schemas.models import (
    ModelActivationResult,
    ModelConfigurationResult,
    ModelConfigurationUpdate,
    ModelDeletionResult,
    ModelListItem,
    ModelResult,
    ModelStatsResult,
    ModelTestResult,
)
from ..schemas.models_requests import (
    RequestActivateModel,
    RequestDeleteModel,
    RequestGetConfiguration,
    RequestGetModel,
    RequestGetModels,
    RequestGetModelStats,
    RequestRefreshModelStatus,
    RequestUpdateModel,
)

router = APIRouter()


async def check_model_admin(
    current_user: AccessPrincipal = Depends(get_current_active_user),
) -> AccessPrincipal:
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


@router.post(
    "/list",
    response_model=ApiResponse[PaginatedData[ModelListItem]],
    operation_id="get_models",
)
async def get_models(
    request: RequestGetModels,
    _: AccessPrincipal = Depends(get_current_active_user),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, object]:
    try:
        result = service.list(
            page=request.page,
            page_size=request.page_size,
            view_type=request.view_type,
            search=request.search,
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


@router.post(
    "/create", response_model=ApiResponse[ModelResult], operation_id="create_model"
)
async def create_model(
    request: CreateModelRequest,
    _: AccessPrincipal = Depends(check_model_admin),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, object]:
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


@router.post(
    "/configuration/get",
    response_model=ApiResponse[ModelConfigurationResult],
    operation_id="get_configuration",
)
async def get_configuration(
    request: RequestGetConfiguration,
    _: AccessPrincipal = Depends(get_current_active_user),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, object]:
    return success_response(
        data=service.get_configuration().to_dict(),
        message="获取模型配置成功",
    )


@router.post(
    "/configuration/update",
    response_model=ApiResponse[ModelConfigurationResult],
    operation_id="update_configuration",
)
async def update_configuration(
    request: ModelConfigurationUpdate,
    _: AccessPrincipal = Depends(check_model_admin),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, object]:
    updates = {
        key: value
        for key, value in request.model_dump(exclude_unset=True).items()
        if value is not None
    }
    config = service.update_configuration(updates)
    return success_response(data=config.to_dict(), message="更新模型配置成功")


@router.post(
    "/stats",
    response_model=ApiResponse[ModelStatsResult],
    operation_id="get_model_stats",
)
async def get_model_stats(
    request: RequestGetModelStats,
    _: AccessPrincipal = Depends(get_current_active_user),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, object]:
    return success_response(data=service.stats().to_dict(), message="获取模型统计成功")


@router.post("/get", response_model=ApiResponse[ModelResult], operation_id="get_model")
async def get_model(
    request: RequestGetModel,
    _: AccessPrincipal = Depends(get_current_active_user),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, object]:
    try:
        return success_response(
            data=service.get(request.model_id).to_dict(), message="获取模型详情成功"
        )
    except ModelNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post(
    "/update", response_model=ApiResponse[ModelResult], operation_id="update_model"
)
async def update_model(
    request: RequestUpdateModel,
    _: AccessPrincipal = Depends(check_model_admin),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, object]:
    try:
        model = service.update(
            request.model_id,
            UpdateModelCommand(
                changes=request.model_dump(exclude_unset=True, exclude={"model_id"})
            ),
        )
        return success_response(data=model.to_dict(), message="更新模型成功")
    except ModelNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post(
    "/refresh-status",
    response_model=ApiResponse[ModelResult],
    operation_id="refresh_model_status",
)
async def refresh_model_status(
    request: RequestRefreshModelStatus,
    _: AccessPrincipal = Depends(check_model_admin),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, object]:
    try:
        model = await service.refresh_status(request.model_id)
        return success_response(data=model.to_dict(), message="刷新模型状态成功")
    except ModelNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"刷新状态失败: {exc}") from exc


@router.post(
    "/activate",
    response_model=ApiResponse[ModelActivationResult],
    operation_id="activate_model",
)
async def activate_model(
    request: RequestActivateModel,
    _: AccessPrincipal = Depends(check_model_admin),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, object]:
    try:
        return success_response(
            data=service.activate(request.model_id), message="激活模型成功"
        )
    except ModelNotFound as exc:
        raise HTTPException(status_code=400, detail="模型不存在") from exc


@router.post(
    "/delete",
    response_model=ApiResponse[ModelDeletionResult],
    operation_id="delete_model",
)
async def delete_model(
    request: RequestDeleteModel,
    _: AccessPrincipal = Depends(check_model_admin),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, object]:
    try:
        return success_response(
            data=service.delete(request.model_id).to_dict(),
            message="模型删除成功",
        )
    except (ModelNotFound, ModelOperationRejected) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post(
    "/{model_id}/test",
    response_model=None,
    responses={200: {"model": ApiResponse[ModelTestResult]}},
    operation_id="test_model",
)
async def test_model(
    model_id: str,
    files: list[UploadFile] = File(...),
    _: AccessPrincipal = Depends(get_current_active_user),
    service: ModelManagementApplicationService = Depends(get_model_management_service),
) -> dict[str, object]:
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
