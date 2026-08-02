"""影像 HTTP v1 路由组合。"""

from fastapi import APIRouter

from .routes import (
    annotations_router,
    delivery_router,
    imports_router,
    mutations_router,
    predictions_router,
    queries_router,
    selectors_router,
    uploads_router,
)

router = APIRouter()
# 所有静态路由必须先于 /{file_id} 详情路由注册。
router.include_router(annotations_router, prefix="/image-files", tags=["影像文件管理"])
router.include_router(selectors_router, prefix="/image-files", tags=["影像文件管理"])
router.include_router(delivery_router, prefix="/image-files", tags=["影像文件管理"])
router.include_router(predictions_router, prefix="/image-files", tags=["影像文件管理"])
router.include_router(mutations_router, prefix="/image-files", tags=["影像文件管理"])
router.include_router(queries_router, prefix="/image-files", tags=["影像文件管理"])
router.include_router(imports_router, prefix="/upload", tags=["文件上传"])
router.include_router(uploads_router, prefix="/upload", tags=["文件上传"])
