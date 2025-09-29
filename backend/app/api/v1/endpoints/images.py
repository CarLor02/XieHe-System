"""
影像预览API端点

实现影像文件预览、缩略图生成、格式转换API

@author XieHe Medical System
@created 2025-09-24
"""

import io
from typing import Optional, List
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.storage import storage_manager
from app.core.dicom_processor import dicom_processor
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

# 简单的影像列表响应模型
class ImageListItem(BaseModel):
    """影像列表项"""
    id: str
    study_id: str
    patient_name: str
    study_description: str
    modality: str
    study_date: str
    status: str

class ImageListResponse(BaseModel):
    """影像列表响应"""
    images: List[ImageListItem]
    total: int
    page: int
    page_size: int

# Pydantic模型
class ImageInfo(BaseModel):
    """影像信息"""
    file_id: str
    filename: str
    file_path: str
    size: int
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    is_dicom: bool = False
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None

class DICOMMetadata(BaseModel):
    """DICOM元数据"""
    patient_id: str = ""
    patient_name: str = ""
    study_date: str = ""
    study_description: str = ""
    series_description: str = ""
    modality: str = ""
    rows: int = 0
    columns: int = 0
    pixel_spacing: List[float] = []
    window_center: Optional[float] = None
    window_width: Optional[float] = None

class ImageProcessRequest(BaseModel):
    """影像处理请求"""
    file_id: str
    operation: str = Field(..., description="操作类型: thumbnail, convert, preview")
    format: Optional[str] = Field("PNG", description="输出格式")
    width: Optional[int] = Field(None, description="输出宽度")
    height: Optional[int] = Field(None, description="输出高度")
    quality: Optional[int] = Field(85, description="JPEG质量")

# 工具函数
def get_file_info(file_path: str) -> Optional[dict]:
    """获取文件信息"""
    try:
        if not storage_manager.file_exists(file_path):
            return None

        # 获取文件内容
        content = storage_manager.load_file(file_path)
        if not content:
            return None

        # 检查是否为DICOM文件
        temp_path = Path(f"/tmp/{Path(file_path).name}")
        with open(temp_path, 'wb') as f:
            f.write(content)

        try:
            is_dicom = dicom_processor.validate_dicom_file(temp_path) if dicom_processor else False

            info = {
                'file_path': file_path,
                'size': len(content),
                'is_dicom': is_dicom
            }

            if is_dicom and dicom_processor:
                dicom_info = dicom_processor.get_dicom_info(temp_path)
                if 'metadata' in dicom_info:
                    metadata = dicom_info['metadata']
                    info.update({
                        'width': metadata.get('columns', 0),
                        'height': metadata.get('rows', 0),
                        'metadata': metadata
                    })

            return info

        finally:
            if temp_path.exists():
                temp_path.unlink()

    except Exception as e:
        logger.error(f"获取文件信息失败 {file_path}: {e}")
        return None

@router.get("/", response_model=ImageListResponse, summary="获取影像列表")
async def get_images_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取影像列表

    返回影像检查的列表，包含基本信息
    """
    try:
        from app.models.image import Study
        from app.models.patient import Patient
        from sqlalchemy import desc

        # 计算偏移量
        offset = (page - 1) * page_size

        # 查询影像检查，关联患者信息
        query = db.query(Study, Patient.name).join(
            Patient, Study.patient_id == Patient.id
        ).filter(
            Patient.is_deleted == False
        ).order_by(desc(Study.created_at))

        # 获取总数
        total = query.count()

        # 分页查询
        results = query.offset(offset).limit(page_size).all()

        # 构建响应数据
        images = []
        for study, patient_name in results:
            images.append(ImageListItem(
                id=str(study.id),
                study_id=study.study_id or f"ST{study.id:03d}",
                patient_name=patient_name,
                study_description=study.study_description or "影像检查",
                modality=study.modality.value if study.modality else "XR",
                study_date=study.study_date.strftime("%Y-%m-%d") if study.study_date else "",
                status="completed"
            ))

        return ImageListResponse(
            images=images,
            total=total,
            page=page,
            page_size=page_size
        )

    except Exception as e:
        logger.error(f"获取影像列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像列表失败"
        )

@router.get("/images/{file_id}/info", response_model=ImageInfo)
async def get_image_info(
    file_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取影像文件信息
    """
    try:
        # 这里应该从数据库查询文件记录
        # 暂时使用模拟数据
        file_path = f"images/{file_id}"

        file_info = get_file_info(file_path)
        if not file_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )

        return ImageInfo(
            file_id=file_id,
            filename=Path(file_path).name,
            file_path=file_path,
            size=file_info['size'],
            mime_type="application/dicom" if file_info['is_dicom'] else "image/jpeg",
            width=file_info.get('width'),
            height=file_info.get('height'),
            is_dicom=file_info['is_dicom'],
            thumbnail_url=f"/api/v1/images/{file_id}/thumbnail",
            preview_url=f"/api/v1/images/{file_id}/preview"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取影像信息失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像信息失败"
        )

@router.get("/images/{file_id}/metadata", response_model=DICOMMetadata)
async def get_dicom_metadata(
    file_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    获取DICOM元数据
    """
    try:
        file_path = f"images/{file_id}"

        file_info = get_file_info(file_path)
        if not file_info or not file_info['is_dicom']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件不是DICOM格式"
            )

        metadata = file_info.get('metadata', {})

        return DICOMMetadata(
            patient_id=metadata.get('patient_id', ''),
            patient_name=metadata.get('patient_name', ''),
            study_date=metadata.get('study_date', ''),
            study_description=metadata.get('study_description', ''),
            series_description=metadata.get('series_description', ''),
            modality=metadata.get('modality', ''),
            rows=metadata.get('rows', 0),
            columns=metadata.get('columns', 0),
            pixel_spacing=metadata.get('pixel_spacing', []),
            window_center=metadata.get('window_center'),
            window_width=metadata.get('window_width')
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取DICOM元数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取DICOM元数据失败"
        )

@router.get("/images/{file_id}/thumbnail")
async def get_image_thumbnail(
    file_id: str,
    size: int = Query(256, description="缩略图尺寸"),
    current_user: dict = Depends(get_current_active_user)
):
    """
    获取影像缩略图
    """
    try:
        file_path = f"images/{file_id}"

        # 检查缓存的缩略图
        thumbnail_path = f"thumbnails/{file_id}_{size}.jpg"
        thumbnail_content = storage_manager.load_file(thumbnail_path)

        if not thumbnail_content:
            # 生成缩略图
            file_content = storage_manager.load_file(file_path)
            if not file_content:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="影像文件不存在"
                )

            # 保存到临时文件
            temp_path = Path(f"/tmp/{Path(file_path).name}")
            with open(temp_path, 'wb') as f:
                f.write(file_content)

            try:
                # 检查是否为DICOM文件
                if dicom_processor and dicom_processor.validate_dicom_file(temp_path):
                    thumbnail_content = dicom_processor.generate_thumbnail(temp_path, (size, size))
                else:
                    # 处理普通图像文件
                    from PIL import Image
                    with Image.open(temp_path) as img:
                        img.thumbnail((size, size), Image.Resampling.LANCZOS)
                        output_buffer = io.BytesIO()
                        img.save(output_buffer, format='JPEG', quality=85)
                        thumbnail_content = output_buffer.getvalue()

                if thumbnail_content:
                    # 缓存缩略图
                    storage_manager.save_file(
                        thumbnail_content,
                        f"{file_id}_{size}.jpg",
                        category="thumbnails"
                    )

            finally:
                if temp_path.exists():
                    temp_path.unlink()

        if not thumbnail_content:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="缩略图生成失败"
            )

        return StreamingResponse(
            io.BytesIO(thumbnail_content),
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=3600"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取缩略图失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取缩略图失败"
        )

@router.get("/images/{file_id}/preview")
async def get_image_preview(
    file_id: str,
    format: str = Query("PNG", description="输出格式"),
    width: Optional[int] = Query(None, description="输出宽度"),
    height: Optional[int] = Query(None, description="输出高度"),
    current_user: dict = Depends(get_current_active_user)
):
    """
    获取影像预览
    """
    try:
        file_path = f"images/{file_id}"

        # 生成预览缓存键
        cache_key = f"{file_id}_{format}_{width or 'auto'}_{height or 'auto'}"
        preview_path = f"previews/{cache_key}.{format.lower()}"

        # 检查缓存
        preview_content = storage_manager.load_file(preview_path)

        if not preview_content:
            # 生成预览
            file_content = storage_manager.load_file(file_path)
            if not file_content:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="影像文件不存在"
                )

            # 保存到临时文件
            temp_path = Path(f"/tmp/{Path(file_path).name}")
            with open(temp_path, 'wb') as f:
                f.write(file_content)

            try:
                # 检查是否为DICOM文件
                if dicom_processor and dicom_processor.validate_dicom_file(temp_path):
                    preview_content = dicom_processor.convert_to_image(temp_path, format)
                else:
                    # 处理普通图像文件
                    from PIL import Image
                    with Image.open(temp_path) as img:
                        # 调整尺寸
                        if width or height:
                            if width and height:
                                img = img.resize((width, height), Image.Resampling.LANCZOS)
                            elif width:
                                ratio = width / img.width
                                new_height = int(img.height * ratio)
                                img = img.resize((width, new_height), Image.Resampling.LANCZOS)
                            elif height:
                                ratio = height / img.height
                                new_width = int(img.width * ratio)
                                img = img.resize((new_width, height), Image.Resampling.LANCZOS)

                        output_buffer = io.BytesIO()
                        img.save(output_buffer, format=format.upper())
                        preview_content = output_buffer.getvalue()

                if preview_content:
                    # 缓存预览
                    storage_manager.save_file(
                        preview_content,
                        f"{cache_key}.{format.lower()}",
                        category="previews"
                    )

            finally:
                if temp_path.exists():
                    temp_path.unlink()

        if not preview_content:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="预览生成失败"
            )

        media_type = f"image/{format.lower()}"
        if format.upper() == "JPEG":
            media_type = "image/jpeg"

        return StreamingResponse(
            io.BytesIO(preview_content),
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=1800"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取预览失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取预览失败"
        )

@router.post("/images/process")
async def process_image(
    request: ImageProcessRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    处理影像文件
    """
    try:
        file_path = f"images/{request.file_id}"

        if request.operation == "thumbnail":
            size = request.width or request.height or 256
            thumbnail_url = f"/api/v1/images/{request.file_id}/thumbnail?size={size}"
            return {"operation": "thumbnail", "url": thumbnail_url}

        elif request.operation == "convert":
            preview_url = f"/api/v1/images/{request.file_id}/preview?format={request.format}"
            if request.width:
                preview_url += f"&width={request.width}"
            if request.height:
                preview_url += f"&height={request.height}"
            return {"operation": "convert", "url": preview_url}

        elif request.operation == "preview":
            preview_url = f"/api/v1/images/{request.file_id}/preview"
            return {"operation": "preview", "url": preview_url}

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不支持的操作类型"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"处理影像失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="处理影像失败"
        )
