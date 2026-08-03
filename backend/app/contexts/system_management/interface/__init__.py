"""系统管理接口层公开入口。"""

from .http.v1 import router

__all__ = ["router"]
