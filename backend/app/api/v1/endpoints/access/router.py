"""Access-domain API router."""

from fastapi import APIRouter

from .handlers import auth, permissions, users

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["认证管理"])
router.include_router(users.router, prefix="/users", tags=["用户管理"])
router.include_router(permissions.router, prefix="/permissions", tags=["权限管理"])
