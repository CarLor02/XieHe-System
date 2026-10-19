"""Thin FastAPI adapter for patient management use cases."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.patients.application import PatientApplicationService
from app.contexts.patients.domain import (
    DuplicatePatientId,
    PatientListQuery,
    PatientNotFound,
)
from app.core.system.exceptions import BusinessLogicException, ResourceNotFoundException
from app.core.system.logger import LogLevel, logger
from app.core.system.response import (
    ApiResponse,
    PaginatedData,
    paginated_response,
    success_response,
)

from ..dependencies import get_patient_service
from ..schemas import PatientCreate, PatientResponse
from ..schemas.management_requests import (
    RequestDeletePatient,
    RequestGetPatient,
    RequestGetPatients,
    RequestUpdatePatient,
)

router = APIRouter()


def _actor_id(current_user: AccessPrincipal) -> int | None:
    value = current_user.get("user_id") or current_user.get("id")
    return int(value) if value is not None else None


@router.post(
    "/create",
    summary="创建患者",
    response_model=ApiResponse[PatientResponse],
    operation_id="create_patient",
)
async def create_patient(
    patient_data: PatientCreate,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: PatientApplicationService = Depends(get_patient_service),
) -> dict[str, object]:
    try:
        patient = await service.create_patient(
            patient_data.model_dump(),
            actor_id=_actor_id(current_user),
        )
    except DuplicatePatientId as exc:
        raise BusinessLogicException(str(exc)) from exc
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"患者创建失败: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="患者创建过程中发生错误",
        ) from exc
    return success_response(
        data=PatientResponse.model_validate(patient).model_dump(mode="json"),
        message="患者创建成功",
        code=201,
    )


@router.post(
    "/list",
    summary="获取患者列表",
    response_model=ApiResponse[PaginatedData[PatientResponse]],
    operation_id="get_patients",
)
async def get_patients(
    request: RequestGetPatients,
    _current_user: AccessPrincipal = Depends(get_current_active_user),
    service: PatientApplicationService = Depends(get_patient_service),
) -> dict[str, object]:
    query = PatientListQuery(
        page=request.page,
        page_size=request.page_size,
        search=request.search,
        gender=request.gender,
        age_min=request.age_min,
        age_max=request.age_max,
        status=request.status_filter,
        has_images=request.has_images,
        sort_by=request.sort_by,
        sort_order=request.sort_order,
    )
    try:
        patients, total = await service.list_patients(query)
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"获取患者列表失败: {exc}")
        raise HTTPException(
            status_code=500, detail="获取患者列表过程中发生错误"
        ) from exc
    return paginated_response(
        items=[
            PatientResponse.model_validate(item).model_dump(mode="json")
            for item in patients
        ],
        total=total,
        page=request.page,
        page_size=request.page_size,
        message="患者列表查询成功",
    )


@router.post(
    "/get",
    summary="获取患者详情",
    response_model=ApiResponse[PatientResponse],
    operation_id="get_patient",
)
async def get_patient(
    request: RequestGetPatient,
    _current_user: AccessPrincipal = Depends(get_current_active_user),
    service: PatientApplicationService = Depends(get_patient_service),
) -> dict[str, object]:
    try:
        patient = await service.get_patient(request.patient_id)
    except PatientNotFound as exc:
        raise ResourceNotFoundException(str(exc)) from exc
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"获取患者详情失败: {exc}")
        raise HTTPException(
            status_code=500, detail="获取患者详情过程中发生错误"
        ) from exc
    return success_response(
        data=PatientResponse.model_validate(patient).model_dump(mode="json"),
        message="患者详情查询成功",
    )


@router.post(
    "/update",
    summary="更新患者信息",
    response_model=ApiResponse[PatientResponse],
    operation_id="update_patient",
)
async def update_patient(
    patient_data: RequestUpdatePatient,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: PatientApplicationService = Depends(get_patient_service),
) -> dict[str, object]:
    try:
        patient = await service.update_patient(
            patient_data.patient_id,
            patient_data.model_dump(exclude_unset=True, exclude={"patient_id"}),
            actor_id=_actor_id(current_user),
        )
    except PatientNotFound as exc:
        raise ResourceNotFoundException(str(exc)) from exc
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"患者信息更新失败: {exc}")
        raise HTTPException(
            status_code=500, detail="患者信息更新过程中发生错误"
        ) from exc
    return success_response(
        data=PatientResponse.model_validate(patient).model_dump(mode="json"),
        message="患者信息更新成功",
    )


@router.post(
    "/delete",
    summary="删除患者",
    response_model=ApiResponse[None],
    operation_id="delete_patient",
)
async def delete_patient(
    request: RequestDeletePatient,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: PatientApplicationService = Depends(get_patient_service),
) -> dict[str, object]:
    try:
        await service.delete_patient(
            request.patient_id, actor_id=_actor_id(current_user)
        )
    except PatientNotFound as exc:
        raise ResourceNotFoundException(str(exc)) from exc
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"患者删除失败: {exc}")
        raise HTTPException(status_code=500, detail="患者删除过程中发生错误") from exc
    return success_response(data=None, message="患者删除成功")
