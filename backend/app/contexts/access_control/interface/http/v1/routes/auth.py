"""认证、密码、个人资料和头像 HTTP 适配。"""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials

from app.contexts.access_control.application import (
    AccessPrincipal,
    AuthenticationService,
    ProfileService,
    UserProfile,
)
from app.core.system.logger import LogLevel, logger
from app.core.system.response import success_response
from app.shared.storage import StorageServiceError

from ..dependencies import (
    get_authentication_service,
    get_current_active_user,
    get_profile_service,
    security,
)
from ..schemas.auth import (
    AvatarUploadCompleteRequest,
    AvatarUploadPart,
    AvatarUploadSessionRequest,
    AvatarUploadSessionResponse,
    PasswordChange,
    PasswordReset,
    PasswordResetConfirm,
    TokenRefresh,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
)

router = APIRouter()


def _identity_response(identity: Any) -> dict[str, Any]:
    return UserResponse(
        id=identity.id,
        username=identity.username,
        email=identity.email,
        full_name=identity.full_name,
        is_active=identity.is_active,
        roles=list(identity.roles),
        is_superuser=identity.is_superuser,
        is_system_admin=identity.is_system_admin,
        system_admin_level=identity.system_admin_level,
    ).model_dump()


def _profile_response(
    profile: UserProfile, principal: AccessPrincipal
) -> dict[str, Any]:
    return UserResponse(
        id=profile.id,
        username=profile.username,
        email=profile.email,
        full_name=profile.full_name,
        phone=profile.phone,
        real_name=profile.real_name,
        employee_id=profile.employee_id,
        department=profile.department,
        department_id=profile.department_id,
        position=profile.position,
        title=profile.title,
        is_active=profile.is_active,
        role="admin" if profile.is_superuser else "doctor",
        roles=list(principal.get("roles", ["doctor"])),
        permissions=list(
            principal.get("permissions", ["patient_manage", "image_view"])
        ),
        is_superuser=profile.is_superuser,
        is_system_admin=profile.is_system_admin,
        system_admin_level=profile.system_admin_level,
        avatar_url=profile.avatar_url,
        avatar_storage_bucket=profile.avatar_storage_bucket,
        avatar_object_key=profile.avatar_object_key,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    ).model_dump()


@router.post("/login", response_model=dict[str, Any], summary="用户登录")
async def login(
    request: UserLogin,
    service: AuthenticationService = Depends(get_authentication_service),
) -> dict[str, Any]:
    identity, tokens = await service.login(
        username=request.username,
        password=request.password,
        remember_me=request.remember_me,
    )
    logger.emit_event(LogLevel.INFO, message=f"用户登录成功: {identity.username}")
    return success_response(
        data={**asdict(tokens), "user": _identity_response(identity)},
        message="登录成功",
    )


@router.post("/register", response_model=dict[str, Any], summary="用户注册")
async def register(
    request: UserRegister,
    service: AuthenticationService = Depends(get_authentication_service),
) -> dict[str, Any]:
    identity = await service.register(
        username=request.username,
        email=str(request.email),
        password=request.password,
        confirm_password=request.confirm_password,
        full_name=request.full_name,
        phone=request.phone,
    )
    logger.emit_event(LogLevel.INFO, message=f"用户注册成功: {identity.username}")
    return success_response(
        data={"user": _identity_response(identity)}, message="注册成功"
    )


@router.post("/refresh", response_model=dict[str, Any], summary="刷新令牌")
async def refresh_token(
    request: TokenRefresh,
    service: AuthenticationService = Depends(get_authentication_service),
) -> dict[str, Any]:
    tokens = await service.refresh(request.refresh_token)
    return success_response(data={"tokens": asdict(tokens)}, message="令牌刷新成功")


@router.post("/logout", response_model=dict[str, Any], summary="用户登出")
async def logout(
    request: Request,
    principal: AccessPrincipal = Depends(get_current_active_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    service: AuthenticationService = Depends(get_authentication_service),
) -> dict[str, Any]:
    del request
    if credentials:
        await service.logout(credentials.credentials)
    logger.emit_event(LogLevel.INFO, message=f"用户登出成功: {principal['username']}")
    return success_response(data=None, message="登出成功")


@router.post("/password/reset", response_model=dict[str, Any], summary="请求密码重置")
async def request_password_reset(
    request: PasswordReset,
    service: AuthenticationService = Depends(get_authentication_service),
) -> dict[str, Any]:
    token = await service.request_password_reset(str(request.email))
    message = "如果邮箱存在，重置链接已发送到您的邮箱"
    if token is None:
        return {"message": message}
    return success_response(data={"reset_token": token}, message=message)


@router.post(
    "/password/reset/confirm",
    response_model=dict[str, Any],
    summary="确认密码重置",
)
async def confirm_password_reset(
    request: PasswordResetConfirm,
    service: AuthenticationService = Depends(get_authentication_service),
) -> dict[str, Any]:
    await service.confirm_password_reset(
        token=request.token,
        new_password=request.new_password,
        confirm_password=request.confirm_password,
    )
    return success_response(data=None, message="密码重置成功")


@router.post("/password/change", response_model=dict[str, Any], summary="修改密码")
async def change_password(
    request: PasswordChange,
    principal: AccessPrincipal = Depends(get_current_active_user),
    service: AuthenticationService = Depends(get_authentication_service),
) -> dict[str, Any]:
    await service.change_password(
        principal=principal,
        current_password=request.current_password,
        new_password=request.new_password,
        confirm_password=request.confirm_password,
    )
    return success_response(data=None, message="密码修改成功")


@router.get("/me", response_model=dict[str, Any], summary="获取当前用户信息")
async def get_current_user_info(
    principal: AccessPrincipal = Depends(get_current_active_user),
    service: ProfileService = Depends(get_profile_service),
) -> dict[str, Any]:
    profile = await service.get_profile(principal)
    return success_response(
        data=_profile_response(profile, principal), message="获取用户信息成功"
    )


@router.put("/me", response_model=dict[str, Any], summary="更新当前用户信息")
async def update_current_user_info(
    request: UserUpdate,
    principal: AccessPrincipal = Depends(get_current_active_user),
    service: ProfileService = Depends(get_profile_service),
) -> dict[str, Any]:
    profile = await service.update_profile(
        principal, request.model_dump(exclude_unset=True)
    )
    return success_response(
        data=_profile_response(profile, principal), message="用户信息更新成功"
    )


@router.post(
    "/me/avatar/upload-session",
    response_model=dict[str, Any],
    summary="创建头像上传会话",
)
async def create_avatar_upload_session(
    request: AvatarUploadSessionRequest,
    principal: AccessPrincipal = Depends(get_current_active_user),
    service: ProfileService = Depends(get_profile_service),
) -> dict[str, Any]:
    try:
        session = await service.create_avatar_upload_session(
            principal=principal,
            filename=request.filename,
            size=request.size,
            mime_type=request.mime_type,
        )
    except StorageServiceError as exc:
        logger.emit_event(LogLevel.ERROR, message=f"创建头像上传会话失败: {exc}")
        raise HTTPException(status_code=502, detail="对象存储服务不可用") from exc
    response = AvatarUploadSessionResponse(
        storage_bucket=session.storage_bucket,
        object_key=session.object_key,
        upload_id=session.upload_id,
        part_size=session.part_size,
        expires_in=session.expires_in,
        parts=[AvatarUploadPart(**part) for part in session.parts],
    )
    return success_response(data=response.model_dump(), message="头像上传会话创建成功")


@router.post(
    "/me/avatar/complete", response_model=dict[str, Any], summary="完成头像上传"
)
async def complete_avatar_upload(
    request: AvatarUploadCompleteRequest,
    principal: AccessPrincipal = Depends(get_current_active_user),
    service: ProfileService = Depends(get_profile_service),
) -> dict[str, Any]:
    try:
        profile = await service.complete_avatar_upload(
            principal=principal,
            upload_id=request.upload_id,
            parts=[part.model_dump() for part in request.parts],
        )
    except StorageServiceError as exc:
        logger.emit_event(LogLevel.ERROR, message=f"完成头像上传失败: {exc}")
        raise HTTPException(status_code=502, detail="对象存储服务不可用") from exc
    return success_response(
        data=_profile_response(profile, principal), message="头像上传成功"
    )


@router.delete("/me/avatar", response_model=dict[str, Any], summary="删除当前用户头像")
async def delete_current_user_avatar(
    principal: AccessPrincipal = Depends(get_current_active_user),
    service: ProfileService = Depends(get_profile_service),
) -> dict[str, Any]:
    profile, deleted = await service.delete_avatar(principal)
    return success_response(
        data=_profile_response(profile, principal),
        message="头像已标记删除" if deleted else "当前用户没有头像",
    )
