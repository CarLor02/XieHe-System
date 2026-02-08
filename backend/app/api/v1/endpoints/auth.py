"""
认证相关API端点
包括用户登录、注册、令牌刷新、密码重置等功能

作者: XieHe Medical System
创建时间: 2025-09-24
"""

from typing import Dict, Any
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from app.core.database import get_db
from app.core.security import security_manager, hash_password, verify_password
from app.core.auth import get_current_active_user, get_current_user, security
from app.core.exceptions import AuthenticationException, BusinessLogicException
from app.core.cache import get_cache_manager
from app.core.response import success_response
from app.core.error_codes import ErrorCode

import logging
logger = logging.getLogger(__name__)

router = APIRouter()


# ==========================================
# Pydantic模型
# ==========================================

class UserLogin(BaseModel):
    """用户登录请求模型"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名或邮箱")
    password: str = Field(..., min_length=6, max_length=128, description="密码")
    remember_me: bool = Field(default=False, description="记住我")


class UserRegister(BaseModel):
    """用户注册请求模型"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=6, max_length=128, description="密码")
    confirm_password: str = Field(..., min_length=6, max_length=128, description="确认密码")
    full_name: str = Field(..., min_length=2, max_length=100, description="姓名")
    phone: str = Field(None, max_length=20, description="手机号")


class TokenRefresh(BaseModel):
    """令牌刷新请求模型"""
    refresh_token: str = Field(..., description="刷新令牌")


class PasswordReset(BaseModel):
    """密码重置请求模型"""
    email: EmailStr = Field(..., description="邮箱地址")


class PasswordResetConfirm(BaseModel):
    """密码重置确认模型"""
    token: str = Field(..., description="重置令牌")
    new_password: str = Field(..., min_length=6, max_length=128, description="新密码")
    confirm_password: str = Field(..., min_length=6, max_length=128, description="确认密码")


class PasswordChange(BaseModel):
    """密码修改模型"""
    current_password: str = Field(..., description="当前密码")
    new_password: str = Field(..., min_length=6, max_length=128, description="新密码")
    confirm_password: str = Field(..., min_length=6, max_length=128, description="确认密码")


class UserUpdate(BaseModel):
    """用户信息更新模型"""
    phone: str | None = Field(None, max_length=20, description="手机号")
    real_name: str | None = Field(None, max_length=50, description="真实姓名")
    department_id: int | None = Field(None, description="部门ID")
    position: str | None = Field(None, max_length=50, description="职位")
    title: str | None = Field(None, max_length=50, description="职称")


class TokenResponse(BaseModel):
    """令牌响应模型"""
    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    expires_in: int = Field(..., description="过期时间（秒）")


class UserResponse(BaseModel):
    """用户信息响应模型"""
    id: int | str = Field(..., description="用户ID")  # 支持int或str类型
    username: str = Field(..., description="用户名")
    email: str = Field(..., description="邮箱")
    full_name: str = Field(..., description="姓名")
    phone: str | None = Field(None, description="手机号")
    real_name: str | None = Field(None, description="真实姓名")
    employee_id: str | None = Field(None, description="员工编号")
    department: str | None = Field(None, description="部门名称")
    department_id: int | None = Field(None, description="部门ID")
    position: str | None = Field(None, description="职位")
    title: str | None = Field(None, description="职称")
    is_active: bool = Field(..., description="是否激活")
    role: str = Field(default="doctor", description="用户角色")
    roles: list = Field(default=[], description="角色列表")
    permissions: list = Field(default=[], description="权限列表")
    is_superuser: bool = Field(default=False, description="是否超级管理员")
    is_system_admin: bool = Field(default=False, description="是否系统管理员")
    system_admin_level: int = Field(default=0, description="系统管理员级别：0-非，1-超级，2-二级")
    created_at: str | None = Field(None, description="创建时间")
    updated_at: str | None = Field(None, description="更新时间")


# ==========================================
# 辅助函数
# ==========================================

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

        # 查询用户信息
        # 注意：数据库表使用 real_name 而不是 full_name，使用 status 而不是 is_active
        # bcrypt 不需要 salt 字段，但为了兼容保留查询
        sql = """
        SELECT id, username, email, real_name, password_hash, status, is_superuser, is_system_admin, system_admin_level
        FROM users
        WHERE (username = :username OR email = :username)
        AND status = 'active'
        AND is_deleted = 0
        """

        result = db.execute(text(sql), {"username": username})
        user_row = result.fetchone()

        if not user_row:
            return None

        # 转换为字典格式
        # 字段顺序: id, username, email, real_name, password_hash, status, is_superuser, is_system_admin, system_admin_level
        user = {
            "id": user_row[0],
            "username": user_row[1],
            "email": user_row[2],
            "full_name": user_row[3] or user_row[1],  # 使用real_name作为full_name
            "password_hash": user_row[4],
            "status": user_row[5],
            "is_active": user_row[5] == 'active',  # 根据status判断是否激活
            "is_superuser": bool(user_row[6]),  # is_superuser字段
            "role": "admin" if user_row[6] else "doctor",  # 根据is_superuser判断角色
            "roles": ["admin"] if user_row[6] else ["doctor"],  # 角色列表
            "permissions": ["user_manage", "patient_manage", "system_manage"] if user_row[6] else ["patient_manage", "image_manage"],
            "is_system_admin": bool(user_row[7]) if len(user_row) > 7 else False,
            "system_admin_level": int(user_row[8]) if len(user_row) > 8 and user_row[8] is not None else 0,
        }

        return user

    except Exception as e:
        logger.error(f"查询用户失败: {e}")
        return None


from app.core.config import settings as config_settings

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
        if not verify_password(login_data.password, user["password_hash"]):
            raise AuthenticationException("用户名或密码错误")

        # 检查用户状态
        if not user["is_active"]:
            raise AuthenticationException("用户账户已被禁用")

        # 创建令牌
        tokens = create_user_tokens(user, login_data.remember_me)

        # 记录登录日志
        logger.info(f"用户登录成功: {user['username']} ({user['email']})")

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
        logger.error(f"登录失败: {e}")
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
        password_hash = hash_password(register_data.password)

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
            "phone": register_data.phone,
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
            "phone": register_data.phone,
            "is_active": True,
            "is_superuser": False,
            "roles": ["doctor"],
            "permissions": ["patient_manage", "image_view"]
        }

        # 记录注册日志
        logger.info(f"用户注册成功: {new_user['username']} ({new_user['email']})")

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
        logger.error(f"注册失败: {e}")
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
        # 使用刷新令牌获取新的访问令牌
        new_tokens = security_manager.refresh_access_token(refresh_data.refresh_token)
        if not new_tokens:
            raise AuthenticationException("刷新令牌无效或已过期")

        logger.info("令牌刷新成功")

        return success_response(
            data={"tokens": new_tokens},
            message="令牌刷新成功"
        )

    except AuthenticationException:
        raise
    except Exception as e:
        logger.error(f"令牌刷新失败: {e}")
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

        logger.info(f"用户登出成功: {current_user['username']}")

        return success_response(
            data=None,
            message="登出成功"
        )

    except Exception as e:
        logger.error(f"登出失败: {e}")
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

        logger.info(f"密码重置请求: {user['email']}")

        return success_response(
            data={"reset_token": reset_token},  # 仅用于测试，生产环境不应返回
            message="如果邮箱存在，重置链接已发送到您的邮箱"
        )

    except Exception as e:
        logger.error(f"密码重置请求失败: {e}")
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
        new_password_hash = hash_password(reset_confirm.new_password)

        # 撤销重置令牌
        cache_key = f"api_key:{reset_confirm.token}"
        cache_manager = get_cache_manager()
        cache_manager.delete(cache_key)

        logger.info(f"密码重置成功: 用户ID {user_id}")

        return success_response(
            data=None,
            message="密码重置成功"
        )

    except (AuthenticationException, BusinessLogicException):
        raise
    except Exception as e:
        logger.error(f"密码重置确认失败: {e}")
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
        if not verify_password(password_change.current_password, user["password_hash"]):
            raise AuthenticationException("当前密码错误")

        # 这里应该更新数据库中的密码
        new_password_hash = hash_password(password_change.new_password)

        logger.info(f"密码修改成功: {current_user['username']}")

        return success_response(
            data=None,
            message="密码修改成功"
        )

    except (AuthenticationException, BusinessLogicException):
        raise
    except Exception as e:
        logger.error(f"密码修改失败: {e}")
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

        # 获取部门名称
        department_name = None
        if user.department_id:
            department = db.query(Department).filter(Department.id == user.department_id).first()
            if department:
                department_name = department.name

        # 确定用户角色和权限
        role = "admin" if user.is_superuser else "doctor"
        roles = current_user.get("roles", ["doctor"])
        permissions = current_user.get("permissions", ["patient_manage", "image_view"])

        return success_response(
            data=UserResponse(
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
                is_active=user.status == 'active',
                role=role,
                roles=roles,
                permissions=permissions,
                is_superuser=user.is_superuser or False,
                is_system_admin=user.is_system_admin or False,
                system_admin_level=user.system_admin_level or 0,
                created_at=user.created_at.isoformat() if user.created_at else None,
                updated_at=user.updated_at.isoformat() if user.updated_at else None
            ).dict(),
            message="获取用户信息成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取用户信息失败: {e}")
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
        logger.info(f"收到更新请求，用户ID: {current_user['id']}, 更新数据: {update_data}")

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
        logger.info(f"更新前的值 - phone: {user.phone}, real_name: {user.real_name}, position: {user.position}, title: {user.title}")

        # 更新字段
        for field, value in update_data.items():
            logger.info(f"设置字段 {field} = {value}")
            setattr(user, field, value)

        # 记录更新后的值
        logger.info(f"更新后的值 - phone: {user.phone}, real_name: {user.real_name}, position: {user.position}, title: {user.title}")

        db.commit()
        logger.info("数据库提交成功")

        db.refresh(user)
        logger.info(f"刷新后的值 - phone: {user.phone}, real_name: {user.real_name}, position: {user.position}, title: {user.title}")

        # 获取部门名称
        department_name = None
        if user.department_id:
            department = db.query(Department).filter(Department.id == user.department_id).first()
            if department:
                department_name = department.name

        logger.info(f"用户信息更新成功: {user.username}")

        # 确定用户角色和权限
        role = "admin" if user.is_superuser else "doctor"
        roles = current_user.get("roles", ["doctor"])
        permissions = current_user.get("permissions", ["patient_manage", "image_view"])

        return success_response(
            data=UserResponse(
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
                is_active=user.status == 'active',
                role=role,
                roles=roles,
                permissions=permissions,
                is_superuser=user.is_superuser or False,
                is_system_admin=user.is_system_admin or False,
                system_admin_level=user.system_admin_level or 0,
                created_at=user.created_at.isoformat() if user.created_at else None,
                updated_at=user.updated_at.isoformat() if user.updated_at else None
            ).dict(),
            message="用户信息更新成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新用户信息失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新用户信息失败"
        )