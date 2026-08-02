"""影像接口层公开入口。"""

from .http.v1 import image_access_actor, router

__all__ = ["image_access_actor", "router"]
