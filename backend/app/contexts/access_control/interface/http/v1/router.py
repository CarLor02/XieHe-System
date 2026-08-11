"""访问控制 HTTP v1 路由聚合。"""

from fastapi import APIRouter

from .routes import auth, permissions

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["认证管理"])
router.include_router(permissions.router, prefix="/permissions", tags=["权限管理"])
