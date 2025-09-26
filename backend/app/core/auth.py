"""
认证中间件和依赖注入模块

提供FastAPI认证中间件、依赖注入函数和权限验证装饰器。
支持JWT令牌认证、API密钥认证和基于角色的权限控制。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

from typing import Optional, List, Dict, Any, Callable
from functools import wraps

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .security import security_manager, verify_token
from .database import get_db
from .exceptions import AuthenticationException, AuthorizationException

import logging
logger = logging.getLogger(__name__)

# HTTP Bearer认证方案
security = HTTPBearer(auto_error=False)


class AuthManager:
    """认证管理器"""
    
    def __init__(self):
        self.security_manager = security_manager
    
    async def get_current_user_from_token(
        self, 
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        db: Session = Depends(get_db)
    ) -> Optional[Dict[str, Any]]:
        """
        从JWT令牌获取当前用户
        
        Args:
            credentials: HTTP认证凭据
            db: 数据库会话
        
        Returns:
            Optional[Dict[str, Any]]: 用户信息，未认证返回None
        """
        if not credentials:
            return None
        
        # 验证访问令牌
        payload = self.security_manager.verify_token(credentials.credentials, "access")
        if not payload:
            return None
        
        # 从数据库获取用户信息
        user_id = payload.get("user_id")
        if not user_id:
            return None
        
        try:
            # 这里应该从数据库查询用户信息
            # 暂时返回令牌中的用户信息
            user_info = {
                "id": user_id,
                "username": payload.get("username"),
                "email": payload.get("email"),
                "roles": payload.get("roles", []),
                "permissions": payload.get("permissions", []),
                "is_active": payload.get("is_active", True),
                "is_superuser": payload.get("is_superuser", False)
            }
            
            logger.debug(f"从令牌获取用户成功: {user_info['username']}")
            return user_info
            
        except Exception as e:
            logger.error(f"获取用户信息失败: {e}")
            return None
    
    async def get_current_user_from_api_key(
        self,
        request: Request,
        db: Session = Depends(get_db)
    ) -> Optional[Dict[str, Any]]:
        """
        从API密钥获取当前用户
        
        Args:
            request: FastAPI请求对象
            db: 数据库会话
        
        Returns:
            Optional[Dict[str, Any]]: 用户信息，未认证返回None
        """
        # 从请求头获取API密钥
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return None
        
        # 验证API密钥
        api_info = self.security_manager.verify_api_key(api_key)
        if not api_info:
            return None
        
        user_id = api_info.get("user_id")
        if not user_id:
            return None
        
        try:
            # 这里应该从数据库查询用户信息
            # 暂时返回基本用户信息
            user_info = {
                "id": user_id,
                "username": f"api_user_{user_id}",
                "email": None,
                "roles": ["api_user"],
                "permissions": ["api_access"],
                "is_active": True,
                "is_superuser": False,
                "auth_type": "api_key",
                "api_key_name": api_info.get("name")
            }
            
            logger.debug(f"从API密钥获取用户成功: {user_info['username']}")
            return user_info
            
        except Exception as e:
            logger.error(f"通过API密钥获取用户信息失败: {e}")
            return None
    
    async def get_current_user(
        self,
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        db: Session = Depends(get_db)
    ) -> Optional[Dict[str, Any]]:
        """
        获取当前用户（支持JWT和API密钥）
        
        Args:
            request: FastAPI请求对象
            credentials: HTTP认证凭据
            db: 数据库会话
        
        Returns:
            Optional[Dict[str, Any]]: 用户信息，未认证返回None
        """
        # 优先尝试JWT令牌认证
        user = await self.get_current_user_from_token(credentials, db)
        if user:
            return user
        
        # 尝试API密钥认证
        user = await self.get_current_user_from_api_key(request, db)
        if user:
            return user
        
        return None
    
    async def get_current_active_user(
        self,
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        db: Session = Depends(get_db)
    ) -> Dict[str, Any]:
        """
        获取当前活跃用户（必须认证）
        
        Args:
            request: FastAPI请求对象
            credentials: HTTP认证凭据
            db: 数据库会话
        
        Returns:
            Dict[str, Any]: 用户信息
        
        Raises:
            AuthenticationException: 认证失败
        """
        user = await self.get_current_user(request, credentials, db)
        if not user:
            raise AuthenticationException("未提供有效的认证凭据")
        
        if not user.get("is_active", False):
            raise AuthenticationException("用户账户已被禁用")
        
        return user
    
    async def get_current_superuser(
        self,
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        db: Session = Depends(get_db)
    ) -> Dict[str, Any]:
        """
        获取当前超级用户
        
        Args:
            request: FastAPI请求对象
            credentials: HTTP认证凭据
            db: 数据库会话
        
        Returns:
            Dict[str, Any]: 超级用户信息
        
        Raises:
            AuthenticationException: 认证失败
            AuthorizationException: 权限不足
        """
        user = await self.get_current_active_user(request, credentials, db)
        
        if not user.get("is_superuser", False):
            raise AuthorizationException("需要超级用户权限")
        
        return user
    
    def check_permissions(self, user: Dict[str, Any], required_permissions: List[str]) -> bool:
        """
        检查用户权限
        
        Args:
            user: 用户信息
            required_permissions: 需要的权限列表
        
        Returns:
            bool: 是否有权限
        """
        if user.get("is_superuser", False):
            return True
        
        user_permissions = user.get("permissions", [])
        return all(perm in user_permissions for perm in required_permissions)
    
    def check_roles(self, user: Dict[str, Any], required_roles: List[str]) -> bool:
        """
        检查用户角色
        
        Args:
            user: 用户信息
            required_roles: 需要的角色列表
        
        Returns:
            bool: 是否有角色
        """
        if user.get("is_superuser", False):
            return True
        
        user_roles = user.get("roles", [])
        return any(role in user_roles for role in required_roles)


# 全局认证管理器实例
auth_manager = AuthManager()


# 依赖注入函数
async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """获取当前用户（可选认证）"""
    return await auth_manager.get_current_user(request, credentials, db)


async def get_current_active_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """获取当前活跃用户（必须认证）"""
    return await auth_manager.get_current_active_user(request, credentials, db)


async def get_current_superuser(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """获取当前超级用户"""
    return await auth_manager.get_current_superuser(request, credentials, db)


# 权限装饰器
def require_permissions(*permissions: str):
    """
    权限验证装饰器
    
    Args:
        *permissions: 需要的权限列表
    
    Returns:
        装饰器函数
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 从kwargs中获取current_user
            current_user = kwargs.get("current_user")
            if not current_user:
                raise AuthenticationException("需要用户认证")
            
            # 检查权限
            if not auth_manager.check_permissions(current_user, list(permissions)):
                raise AuthorizationException(f"需要权限: {', '.join(permissions)}")
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_roles(*roles: str):
    """
    角色验证装饰器
    
    Args:
        *roles: 需要的角色列表
    
    Returns:
        装饰器函数
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 从kwargs中获取current_user
            current_user = kwargs.get("current_user")
            if not current_user:
                raise AuthenticationException("需要用户认证")
            
            # 检查角色
            if not auth_manager.check_roles(current_user, list(roles)):
                raise AuthorizationException(f"需要角色: {', '.join(roles)}")
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# 创建权限依赖注入函数
def require_permission_dependency(*permissions: str):
    """
    创建权限依赖注入函数
    
    Args:
        *permissions: 需要的权限列表
    
    Returns:
        依赖注入函数
    """
    async def permission_dependency(
        current_user: Dict[str, Any] = Depends(get_current_active_user)
    ) -> Dict[str, Any]:
        if not auth_manager.check_permissions(current_user, list(permissions)):
            raise AuthorizationException(f"需要权限: {', '.join(permissions)}")
        return current_user
    
    return permission_dependency


def require_role_dependency(*roles: str):
    """
    创建角色依赖注入函数
    
    Args:
        *roles: 需要的角色列表
    
    Returns:
        依赖注入函数
    """
    async def role_dependency(
        current_user: Dict[str, Any] = Depends(get_current_active_user)
    ) -> Dict[str, Any]:
        if not auth_manager.check_roles(current_user, list(roles)):
            raise AuthorizationException(f"需要角色: {', '.join(roles)}")
        return current_user
    
    return role_dependency


# 权限验证中间件
class PermissionMiddleware:
    """权限验证中间件"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)

            # 检查是否需要权限验证
            path = request.url.path
            method = request.method

            # 跳过不需要验证的路径
            skip_paths = ["/docs", "/redoc", "/openapi.json", "/health", "/api/v1/auth/login", "/api/v1/auth/register"]
            if any(path.startswith(skip_path) for skip_path in skip_paths):
                await self.app(scope, receive, send)
                return

            # 验证权限
            try:
                credentials = None
                auth_header = request.headers.get("authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

                user = await auth_manager.get_current_user(request, credentials, None)
                if not user:
                    response = JSONResponse(
                        status_code=401,
                        content={"detail": "未提供有效的认证凭据"}
                    )
                    await response(scope, receive, send)
                    return

                # 将用户信息添加到请求中
                scope["user"] = user

            except Exception as e:
                response = JSONResponse(
                    status_code=401,
                    content={"detail": f"认证失败: {str(e)}"}
                )
                await response(scope, receive, send)
                return

        await self.app(scope, receive, send)


# 导出
__all__ = [
    "AuthManager", "auth_manager", "PermissionMiddleware",
    "get_current_user", "get_current_active_user", "get_current_superuser",
    "require_permissions", "require_roles",
    "require_permission_dependency", "require_role_dependency"
]
