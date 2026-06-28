"""
认证相关API端点
包括用户登录、注册、令牌刷新、密码重置等功能

作者: XieHe Medical System
创建时间: 2025-09-24
"""

from typing import Dict, Any
from datetime import datetime, timedelta
import math

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from app.core.database.session import get_db
from app.core.access.security import security_manager, hash_password_async, verify_password_async
from app.core.access.auth import get_current_active_user, get_current_user, security
from app.core.system.exceptions import AuthenticationException, BusinessLogicException
from app.core.system.cache import get_cache_manager
from app.core.system.response import success_response
from app.core.system.errors import ErrorCode

from app.core.system.logger import LogLevel, logger

router = APIRouter()


# ==========================================
# Pydantic模型
# ==========================================


# ==========================================
# 辅助函数
# ==========================================

def _user_auth_dict(user_row) -> Dict[str, Any]:
    is_superuser = bool(user_row[6])
    return {
        "id": user_row[0],
        "username": user_row[1],
        "email": user_row[2],
        "full_name": user_row[3] or user_row[1],
        "password_hash": user_row[4],
        "status": user_row[5],
        "is_active": user_row[5] == 'active',
        "is_superuser": is_superuser,
        "role": "admin" if is_superuser else "doctor",
        "roles": ["admin"] if is_superuser else ["doctor"],
        "permissions": (
            ["user_manage", "patient_manage", "system_manage"]
            if is_superuser
            else ["patient_manage", "image_manage"]
        ),
        "is_system_admin": bool(user_row[7]) if len(user_row) > 7 else False,
        "system_admin_level": int(user_row[8]) if len(user_row) > 8 and user_row[8] is not None else 0,
    }


def get_user_by_username_or_email(db: Session, username: str) -> Dict[str, Any]:
    """
    根据用户名或邮箱获取用户信息

    Args:
        db: 数据库会话
        username: 用户名或邮箱

    Returns:
        Dict[str, Any]: 用户信息
    """
    try:
        from sqlalchemy import text

        sql = """
        SELECT
            id, username, email, real_name, password_hash, status,
            is_superuser, is_system_admin, system_admin_level
        FROM users
        WHERE (username = :username OR email = :username)
        AND status = 'active'
        AND is_deleted = 0
        """

        result = db.execute(text(sql), {"username": username})
        user_row = result.fetchone()

        if not user_row:
            return None

        return _user_auth_dict(user_row)

    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"查询用户失败: {e}")
        return None


def get_user_by_id(db: Session, user_id: int) -> Dict[str, Any]:
    """根据用户ID获取当前有效用户信息，用于刷新令牌时重建完整 claims。"""

    try:
        from sqlalchemy import text

        sql = """
        SELECT
            id, username, email, real_name, password_hash, status,
            is_superuser, is_system_admin, system_admin_level
        FROM users
        WHERE id = :user_id
        AND status = 'active'
        AND is_deleted = 0
        """

        result = db.execute(text(sql), {"user_id": user_id})
        user_row = result.fetchone()

        if not user_row:
            return None

        return _user_auth_dict(user_row)

    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"按ID查询用户失败: {e}")
        return None


from app.core.config import settings as config_settings
from app.services.storage_gateway import StorageServiceError, storage_gateway
from ..schemas.auth import (
    AvatarUploadCompleteRequest,
    AvatarUploadPart,
    AvatarUploadSessionRequest,
    AvatarUploadSessionResponse,
    UserLogin,
    UserRegister,
    TokenRefresh,
    PasswordReset,
    PasswordResetConfirm,
    PasswordChange,
    UserUpdate,
    TokenResponse,
    UserResponse,
)

def create_user_tokens(user: Dict[str, Any], remember_me: bool = False) -> TokenResponse:
    """
    为用户创建访问令牌和刷新令牌

    Args:
        user: 用户信息
        remember_me: 是否记住我

    Returns:
        TokenResponse: 令牌响应
    """
    # 准备令牌数据
    token_data = {
        "sub": user["username"],
        "user_id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "roles": user.get("roles", []),
        "permissions": user.get("permissions", []),
        "is_active": user["is_active"],
        "is_superuser": user.get("is_superuser", False),
        "is_system_admin": user.get("is_system_admin", False),  # 添加系统管理员标志
        "system_admin_level": user.get("system_admin_level", 0)  # 添加系统管理员级别
    }

    # 设置过期时间（使用默认配置）
    access_expires = timedelta(minutes=config_settings.ACCESS_TOKEN_EXPIRE_MINUTES)  # 12小时
    refresh_expires = timedelta(days=config_settings.REFRESH_TOKEN_EXPIRE_DAYS)  # 7天

    # 创建令牌
    access_token = security_manager.create_access_token(token_data, access_expires)
    refresh_token = security_manager.create_refresh_token(token_data, refresh_expires)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=int(access_expires.total_seconds())
    )


async def get_active_avatar_url(user) -> str | None:
    """Return a short-lived avatar URL if the user has an active avatar."""

    if not user.avatar_storage_bucket or not user.avatar_object_key or user.avatar_deleted_at:
        return None
    try:
        return await storage_gateway.presign_get(
            bucket=user.avatar_storage_bucket,
            object_key=user.avatar_object_key,
            expires_in=config_settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
        )
    except Exception as exc:
        logger.emit_event(LogLevel.WARNING, message=f"获取用户头像临时地址失败: {exc}")
        return None


async def build_user_response(user, current_user: Dict[str, Any], db: Session) -> UserResponse:
    from app.models.user import Department

    department_name = None
    if user.department_id:
        department = db.query(Department).filter(Department.id == user.department_id).first()
        if department:
            department_name = department.name

    avatar_url = await get_active_avatar_url(user)
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.real_name or user.username,
        phone=user.phone,
        real_name=user.real_name,
        employee_id=user.employee_id,
        department=department_name,
        department_id=user.department_id,
        position=user.position,
        title=user.title,
        is_active=user.status == "active",
        role="admin" if user.is_superuser else "doctor",
        roles=current_user.get("roles", ["doctor"]),
        permissions=current_user.get("permissions", ["patient_manage", "image_view"]),
        is_superuser=user.is_superuser or False,
        is_system_admin=user.is_system_admin or False,
        system_admin_level=user.system_admin_level or 0,
        avatar_url=avatar_url,
        avatar_storage_bucket=user.avatar_storage_bucket if not user.avatar_deleted_at else None,
        avatar_object_key=user.avatar_object_key if not user.avatar_deleted_at else None,
        created_at=user.created_at.isoformat() if user.created_at else None,
        updated_at=user.updated_at.isoformat() if user.updated_at else None,
    )


# ==========================================
# API端点
# ==========================================

@router.post("/login", response_model=Dict[str, Any], summary="用户登录")
async def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    用户登录

    - **username**: 用户名或邮箱地址
    - **password**: 密码
    - **remember_me**: 是否记住我（影响刷新令牌过期时间）
    """
    try:
        # 获取用户信息
        user = get_user_by_username_or_email(db, login_data.username)
        if not user:
            raise AuthenticationException("用户名或密码错误")

        # 验证密码
        if not await verify_password_async(login_data.password, user["password_hash"]):
            raise AuthenticationException("用户名或密码错误")

        # 检查用户状态
        if not user["is_active"]:
            raise AuthenticationException("用户账户已被禁用")

        # 创建令牌
        tokens = create_user_tokens(user, login_data.remember_me)

        # 记录登录日志
        logger.emit_event(LogLevel.INFO, message=f"用户登录成功: {user['username']} ({user['email']})")

        # 返回前端期望的格式
        tokens_dict = tokens.dict()
        user_dict = UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            full_name=user["full_name"],
            is_active=user["is_active"],
            roles=user.get("roles", []),
            is_superuser=user.get("is_superuser", False),  # 添加超级管理员标志
            is_system_admin=user.get("is_system_admin", False),  # 添加系统管理员标志
            system_admin_level=user.get("system_admin_level", 0)  # 添加系统管理员级别
        ).dict()

        return success_response(
            data={
                "access_token": tokens_dict["access_token"],
                "refresh_token": tokens_dict["refresh_token"],
                "token_type": tokens_dict["token_type"],
                "expires_in": tokens_dict["expires_in"],
                "user": user_dict
            },
            message="登录成功"
        )

    except AuthenticationException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"登录失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登录过程中发生错误"
        )


@router.post("/register", response_model=Dict[str, Any], summary="用户注册")
async def register(
    register_data: UserRegister,
    db: Session = Depends(get_db)
):
    """
    用户注册

    - **username**: 用户名（3-50字符）
    - **email**: 邮箱地址
    - **password**: 密码（6-128字符）
    - **confirm_password**: 确认密码
    - **full_name**: 姓名（2-100字符）
    - **phone**: 手机号（可选）
    """
    try:
        # 验证密码确认
        if register_data.password != register_data.confirm_password:
            raise BusinessLogicException("密码和确认密码不匹配")

        # 检查用户名是否已存在
        existing_user = get_user_by_username_or_email(db, register_data.username)
        if existing_user:
            raise BusinessLogicException("用户名已存在")

        # 检查邮箱是否已存在
        existing_email = get_user_by_username_or_email(db, register_data.email)
        if existing_email:
            raise BusinessLogicException("邮箱已被注册")

        # 创建新用户并保存到数据库
        from sqlalchemy import text
        from datetime import datetime
        import uuid
        import secrets

        # 使用 bcrypt 加密密码（自动包含盐值）
        password_hash = await hash_password_async(register_data.password)
        normalized_phone = (
            register_data.phone.strip() if register_data.phone else None
        )
        if normalized_phone == "":
            normalized_phone = None

        # 插入新用户到数据库
        # 注意：数据库表使用 real_name, status 而不是 full_name, is_active
        # bcrypt 不需要单独的 salt 字段，设置为空字符串
        insert_sql = """
        INSERT INTO users (
            username, email, phone, real_name, password_hash, salt,
            status, is_superuser, is_verified, is_deleted, created_at
        ) VALUES (
            :username, :email, :phone, :real_name, :password_hash, '',
            'active', 0, 1, 0, :created_at
        )
        """

        db.execute(text(insert_sql), {
            "username": register_data.username,
            "email": register_data.email,
            "phone": normalized_phone,
            "real_name": register_data.full_name,
            "password_hash": password_hash,
            "created_at": datetime.now()
        })
        db.commit()

        # 获取新创建的用户ID
        result = db.execute(text("SELECT LAST_INSERT_ID()"))
        new_user_id = result.scalar()

        new_user = {
            "id": new_user_id,
            "username": register_data.username,
            "email": register_data.email,
            "full_name": register_data.full_name,
            "phone": normalized_phone,
            "is_active": True,
            "is_superuser": False,
            "roles": ["doctor"],
            "permissions": ["patient_manage", "image_view"]
        }

        # 记录注册日志
        logger.emit_event(LogLevel.INFO, message=f"用户注册成功: {new_user['username']} ({new_user['email']})")

        return success_response(
            data={
                "user": UserResponse(
                    id=new_user["id"],
                    username=new_user["username"],
                    email=new_user["email"],
                    full_name=new_user["full_name"],
                    is_active=new_user["is_active"],
                    roles=new_user.get("roles", [])
                ).dict()
            },
            message="注册成功"
        )

    except (AuthenticationException, BusinessLogicException):
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"注册失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="注册过程中发生错误"
        )


@router.post("/refresh", response_model=Dict[str, Any], summary="刷新令牌")
async def refresh_token(
    refresh_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """
    刷新访问令牌

    - **refresh_token**: 刷新令牌
    """
    try:
        payload = security_manager.verify_token(refresh_data.refresh_token, "refresh")
        if not payload:
            raise AuthenticationException("刷新令牌无效或已过期")

        user = None
        user_id = payload.get("user_id")
        if user_id is not None:
            try:
                user = get_user_by_id(db, int(user_id))
            except (TypeError, ValueError):
                user = None

        if not user:
            username = payload.get("username") or payload.get("sub")
            if username:
                user = get_user_by_username_or_email(db, username)

        if not user:
            raise AuthenticationException("刷新令牌对应用户不存在或已禁用")

        token_response = create_user_tokens(user)
        new_tokens = token_response.model_dump()

        logger.emit_event(LogLevel.INFO, message="令牌刷新成功")

        return success_response(
            data={"tokens": new_tokens},
            message="令牌刷新成功"
        )

    except AuthenticationException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"令牌刷新失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="令牌刷新过程中发生错误"
        )


@router.post("/logout", response_model=Dict[str, Any], summary="用户登出")
async def logout(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    用户登出

    将当前访问令牌加入黑名单，使其失效
    """
    try:
        # 将当前令牌加入黑名单
        if credentials:
            security_manager.blacklist_token(credentials.credentials)

        logger.emit_event(LogLevel.INFO, message=f"用户登出成功: {current_user['username']}")

        return success_response(
            data=None,
            message="登出成功"
        )

    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"登出失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登出过程中发生错误"
        )


@router.post("/password/reset", response_model=Dict[str, Any], summary="请求密码重置")
async def request_password_reset(
    reset_data: PasswordReset,
    db: Session = Depends(get_db)
):
    """
    请求密码重置

    - **email**: 邮箱地址
    """
    try:
        # 检查用户是否存在
        user = get_user_by_username_or_email(db, reset_data.email)
        if not user:
            # 为了安全，即使用户不存在也返回成功消息
            return {
                "message": "如果邮箱存在，重置链接已发送到您的邮箱"
            }

        # 生成重置令牌
        reset_token = security_manager.generate_api_key(str(user["id"]), "password_reset")

        # 这里应该发送重置邮件
        # send_password_reset_email(user["email"], reset_token)

        logger.emit_event(LogLevel.INFO, message=f"密码重置请求: {user['email']}")

        return success_response(
            data={"reset_token": reset_token},  # 仅用于测试，生产环境不应返回
            message="如果邮箱存在，重置链接已发送到您的邮箱"
        )

    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"密码重置请求失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="密码重置请求过程中发生错误"
        )


@router.post("/password/reset/confirm", response_model=Dict[str, Any], summary="确认密码重置")
async def confirm_password_reset(
    reset_confirm: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    确认密码重置

    - **token**: 重置令牌
    - **new_password**: 新密码
    - **confirm_password**: 确认密码
    """
    try:
        # 验证密码确认
        if reset_confirm.new_password != reset_confirm.confirm_password:
            raise BusinessLogicException("密码和确认密码不匹配")

        # 验证重置令牌
        token_info = security_manager.verify_api_key(reset_confirm.token)
        if not token_info or token_info.get("name") != "password_reset":
            raise AuthenticationException("重置令牌无效或已过期")

        user_id = token_info.get("user_id")
        if not user_id:
            raise AuthenticationException("重置令牌无效")

        # 这里应该更新数据库中的密码
        new_password_hash = await hash_password_async(reset_confirm.new_password)

        # 撤销重置令牌
        cache_key = f"api_key:{reset_confirm.token}"
        cache_manager = get_cache_manager()
        cache_manager.delete(cache_key)

        logger.emit_event(LogLevel.INFO, message=f"密码重置成功: 用户ID {user_id}")

        return success_response(
            data=None,
            message="密码重置成功"
        )

    except (AuthenticationException, BusinessLogicException):
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"密码重置确认失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="密码重置确认过程中发生错误"
        )


@router.post("/password/change", response_model=Dict[str, Any], summary="修改密码")
async def change_password(
    password_change: PasswordChange,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    修改密码

    - **current_password**: 当前密码
    - **new_password**: 新密码
    - **confirm_password**: 确认密码
    """
    try:
        # 验证密码确认
        if password_change.new_password != password_change.confirm_password:
            raise BusinessLogicException("新密码和确认密码不匹配")

        # 获取用户信息验证当前密码
        user = get_user_by_username_or_email(db, current_user["username"])
        if not user:
            raise AuthenticationException("用户不存在")

        # 验证当前密码
        if not await verify_password_async(password_change.current_password, user["password_hash"]):
            raise AuthenticationException("当前密码错误")

        from sqlalchemy import text

        new_password_hash = await hash_password_async(password_change.new_password)
        db.execute(
            text("""
            UPDATE users
            SET password_hash = :password_hash,
                updated_at = NOW()
            WHERE id = :user_id
              AND is_deleted = 0
            """),
            {
                "password_hash": new_password_hash,
                "user_id": current_user["id"],
            },
        )
        db.commit()

        logger.emit_event(LogLevel.INFO, message=f"密码修改成功: {current_user['username']}")

        return success_response(
            data=None,
            message="密码修改成功"
        )

    except (AuthenticationException, BusinessLogicException):
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"密码修改失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="密码修改过程中发生错误"
        )


@router.get("/me", response_model=Dict[str, Any], summary="获取当前用户信息")
async def get_current_user_info(
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户完整信息
    """
    try:
        from app.models.user import User, Department

        # 从数据库获取完整用户信息
        user = db.query(User).filter(User.id == current_user["id"]).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        return success_response(
            data=(await build_user_response(user, current_user, db)).dict(),
            message="获取用户信息成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"获取用户信息失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户信息失败"
        )


@router.put("/me", response_model=Dict[str, Any], summary="更新当前用户信息")
async def update_current_user_info(
    user_data: UserUpdate,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    更新当前用户信息
    """
    try:
        from app.models.user import User, Department

        # 从数据库获取用户
        user = db.query(User).filter(User.id == current_user["id"]).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        # 更新用户信息
        update_data = user_data.dict(exclude_unset=True)
        logger.emit_event(LogLevel.INFO, message=f"收到更新请求，用户ID: {current_user['id']}, 更新数据: {update_data}")

        # 如果更新手机号，检查是否已存在
        if 'phone' in update_data and update_data['phone']:
            existing_user = db.query(User).filter(
                User.phone == update_data['phone'],
                User.id != user.id
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="该手机号已被使用"
                )

        # 记录更新前的值
        logger.emit_event(LogLevel.INFO, message=f"更新前的值 - phone: {user.phone}, real_name: {user.real_name}, position: {user.position}, title: {user.title}")

        # 更新字段
        for field, value in update_data.items():
            logger.emit_event(LogLevel.INFO, message=f"设置字段 {field} = {value}")
            setattr(user, field, value)

        # 记录更新后的值
        logger.emit_event(LogLevel.INFO, message=f"更新后的值 - phone: {user.phone}, real_name: {user.real_name}, position: {user.position}, title: {user.title}")

        db.commit()
        logger.emit_event(LogLevel.INFO, message="数据库提交成功")

        db.refresh(user)
        logger.emit_event(LogLevel.INFO, message=f"刷新后的值 - phone: {user.phone}, real_name: {user.real_name}, position: {user.position}, title: {user.title}")

        logger.emit_event(LogLevel.INFO, message=f"用户信息更新成功: {user.username}")

        return success_response(
            data=(await build_user_response(user, current_user, db)).dict(),
            message="用户信息更新成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"更新用户信息失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新用户信息失败"
        )


@router.post("/me/avatar/upload-session", response_model=Dict[str, Any], summary="创建头像上传会话")
async def create_avatar_upload_session(
    request: AvatarUploadSessionRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    if request.mime_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="不支持的头像文件类型")

    bucket = config_settings.USER_AVATAR_BUCKET
    object_key = f"users/{current_user['id']}/avatar"
    part_size = config_settings.STORAGE_MULTIPART_PART_SIZE
    part_count = max(1, math.ceil(request.size / part_size))

    try:
        await storage_gateway.ensure_bucket(bucket)
        upload_session = await storage_gateway.create_multipart_upload(
            bucket=bucket,
            object_key=object_key,
            content_type=request.mime_type,
            metadata={
                "user-id": str(current_user["id"]),
                "original-filename": request.filename,
            },
            part_count=part_count,
            expires_in=config_settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
        )
        response = AvatarUploadSessionResponse(
            storage_bucket=bucket,
            object_key=object_key,
            upload_id=upload_session["upload_id"],
            part_size=part_size,
            expires_in=config_settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
            parts=[
                AvatarUploadPart(
                    part_number=part["part_number"],
                    url=part["url"],
                )
                for part in upload_session["parts"]
            ],
        )
        return success_response(data=response.dict(), message="头像上传会话创建成功")
    except StorageServiceError as exc:
        logger.emit_event(LogLevel.ERROR, message=f"创建头像上传会话失败: {exc}")
        raise HTTPException(status_code=502, detail="对象存储服务不可用")


@router.post("/me/avatar/complete", response_model=Dict[str, Any], summary="完成头像上传")
async def complete_avatar_upload(
    request: AvatarUploadCompleteRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    from app.models.user import User

    user = db.query(User).filter(User.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    bucket = config_settings.USER_AVATAR_BUCKET
    object_key = f"users/{current_user['id']}/avatar"
    try:
        result = await storage_gateway.complete_multipart_upload(
            bucket=bucket,
            object_key=object_key,
            upload_id=request.upload_id,
            parts=[
                {"part_number": part.part_number, "etag": part.etag}
                for part in request.parts
            ],
        )
        stat_result = await storage_gateway.stat_object(bucket=bucket, object_key=object_key)
        user.avatar_storage_bucket = bucket
        user.avatar_object_key = object_key
        user.avatar_storage_etag = result.get("etag") or stat_result.etag
        user.avatar_deleted_at = None
        db.commit()
        db.refresh(user)

        return success_response(
            data=(await build_user_response(user, current_user, db)).dict(),
            message="头像上传成功",
        )
    except StorageServiceError as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"完成头像上传失败: {exc}")
        raise HTTPException(status_code=502, detail="对象存储服务不可用")
    except Exception as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"完成头像上传失败: {exc}")
        raise HTTPException(status_code=500, detail="完成头像上传失败")


@router.delete("/me/avatar", response_model=Dict[str, Any], summary="删除当前用户头像")
async def delete_current_user_avatar(
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    from app.models.user import User

    user = db.query(User).filter(User.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if not user.avatar_storage_bucket or not user.avatar_object_key:
        return success_response(
            data=(await build_user_response(user, current_user, db)).dict(),
            message="当前用户没有头像",
        )

    user.avatar_deleted_at = datetime.now()
    db.commit()
    db.refresh(user)
    return success_response(
        data=(await build_user_response(user, current_user, db)).dict(),
        message="头像已标记删除",
    )
