"""Thin FastAPI adapter for patient management use cases."""

import typing
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

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
from app.core.system.response import paginated_response, success_response

from ..dependencies import get_patient_service
from ..schemas import PatientCreate, PatientResponse, PatientUpdate

router = APIRouter()


def _actor_id(current_user: dict[str, Any]) -> int | None:
    value = current_user.get("user_id") or current_user.get("id")
    return int(value) if value is not None else None


@router.post("/", response_model=dict[str, Any], summary="创建患者")
@router.post("", response_model=dict[str, Any], summary="创建患者")
async def create_patient(
    patient_data: PatientCreate,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: PatientApplicationService = Depends(get_patient_service),
) -> dict[str, typing.Any]:
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


@router.get("/", response_model=dict[str, Any], summary="获取患者列表")
@router.get("", response_model=dict[str, Any], summary="获取患者列表")
async def get_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    gender: str | None = Query(None),
    age_min: int | None = Query(None, ge=0, le=150),
    age_max: int | None = Query(None, ge=0, le=150),
    status_filter: str | None = Query(None, alias="status"),
    has_images: bool | None = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    _current_user: dict[str, Any] = Depends(get_current_active_user),
    service: PatientApplicationService = Depends(get_patient_service),
) -> typing.Any:
    query = PatientListQuery(
        page=page,
        page_size=page_size,
        search=search,
        gender=gender,
        age_min=age_min,
        age_max=age_max,
        status=status_filter,
        has_images=has_images,
        sort_by=sort_by,
        sort_order=sort_order,
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
        page=page,
        page_size=page_size,
        message="患者列表查询成功",
    )


@router.get("/{patient_id}", response_model=dict[str, Any], summary="获取患者详情")
async def get_patient(
    patient_id: int,
    _current_user: dict[str, Any] = Depends(get_current_active_user),
    service: PatientApplicationService = Depends(get_patient_service),
) -> dict[str, typing.Any]:
    try:
        patient = await service.get_patient(patient_id)
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


@router.put("/{patient_id}", response_model=dict[str, Any], summary="更新患者信息")
async def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: PatientApplicationService = Depends(get_patient_service),
) -> dict[str, typing.Any]:
    try:
        patient = await service.update_patient(
            patient_id,
            patient_data.model_dump(exclude_unset=True),
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


@router.delete("/{patient_id}", response_model=dict[str, Any], summary="删除患者")
async def delete_patient(
    patient_id: int,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: PatientApplicationService = Depends(get_patient_service),
) -> dict[str, typing.Any]:
    try:
        await service.delete_patient(patient_id, actor_id=_actor_id(current_user))
    except PatientNotFound as exc:
        raise ResourceNotFoundException(str(exc)) from exc
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"患者删除失败: {exc}")
        raise HTTPException(status_code=500, detail="患者删除过程中发生错误") from exc
    return success_response(data=None, message="患者删除成功")
