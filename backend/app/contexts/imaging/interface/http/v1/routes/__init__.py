"""影像 HTTP v1 子路由。"""

from .annotations import router as annotations_router
from .delivery import router as delivery_router
from .imports import router as imports_router
from .mutations import router as mutations_router
from .predictions import router as predictions_router
from .queries import router as queries_router
from .selectors import router as selectors_router
from .uploads import router as uploads_router

__all__ = [
    "annotations_router",
    "delivery_router",
    "imports_router",
    "mutations_router",
    "predictions_router",
    "queries_router",
    "selectors_router",
    "uploads_router",
]
