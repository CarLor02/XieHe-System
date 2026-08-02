"""影像 HTTP 接口。"""

from .actor import image_access_actor
from .router import router

__all__ = ["image_access_actor", "router"]
