"""
影像文件管理API

提供影像文件的查询、列表、下载等功能
支持按用户、患者、日期等条件查询

作者: XieHe Medical System
创建时间: 2026-01-05
"""

from typing import Optional
from datetime import datetime, date
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.config import settings
from app.core.logging import get_logger
from app.core.response import success_response, paginated_response
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum
from app.models.user import User
from app.models.image import ImageAnnotation
from app.services.image_file_visibility import (
    apply_image_visibility_filter,
    get_visible_image_file,
)
from ..schemas.files import (
    ImageFileResponse,
    ImageFileStatsResponse,
    UpdateExamTypeRequest,
    UpdateAnnotationRequest,
)

logger = get_logger(__name__)
router = APIRouter()


# API 端点
@router.get("", response_model=dict, summary="获取影像文件列表")
async def get_image_files_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    file_type: Optional[ImageFileTypeEnum] = Query(None, description="文件类型"),
    file_status: Optional[ImageFileStatusEnum] = Query(None, description="文件状态（UPLOADED/PROCESSING/PROCESSED/FAILED）"),
    status: Optional[str] = Query(None, description="兼容参数：pending=待处理"),
    pending_only: Optional[bool] = Query(None, description="仅显示待处理（状态不是PROCESSED 或 没有测量数据）"),
    review_status: Optional[str] = Query(None, description="审核状态(reviewed/unreviewed)"),
    description: Optional[str] = Query(None, description="检查类型"),
    start_date: Optional[date] = Query(None, description="开始日期"),
    end_date: Optional[date] = Query(None, description="结束日期"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取影像文件列表

    支持多种筛选条件：
    - status=pending 或 pending_only=true: 仅显示待处理（状态不是PROCESSED 或 没有ImageAnnotation）
    - review_status=reviewed: 已审核（有ImageAnnotation）
    - review_status=unreviewed: 未审核（没有ImageAnnotation）
    - file_status: 按具体状态筛选（UPLOADED/PROCESSING/PROCESSED/FAILED）
    - file_type: 按文件类型筛选
    - search: 搜索文件名、患者姓名、检查类型

    权限控制：
    - 普通用户：只能看到自己上传的影像
    - 团队负责人(ADMIN)：能看到团队所有成员上传的影像
    - 超级管理员(is_superuser)：能看到全部影像
    """
    try:
        from app.models.patient import Patient

        # 构建查询
        query = db.query(ImageFile).outerjoin(
            Patient, ImageFile.patient_id == Patient.id
        ).filter(ImageFile.is_deleted == False)
        query = apply_image_visibility_filter(query, db, current_user)

        # 待处理筛选 - 优先级最高
        # 支持 status=pending（兼容旧接口）或 pending_only=true
        if status == 'pending' or pending_only:
            # 待处理 = 状态不是PROCESSED 或 没有ImageAnnotation
            # 使用子查询避免 JOIN 导致的重复
            subquery = db.query(ImageAnnotation.image_file_id).distinct().subquery()
            query = query.outerjoin(
                subquery,
                ImageFile.id == subquery.c.image_file_id
            ).filter(
                or_(
                    ImageFile.status != ImageFileStatusEnum.PROCESSED,
                    subquery.c.image_file_id == None
                )
            )
        elif review_status:
            # 审核状态筛选
            subquery = db.query(ImageAnnotation.image_file_id).distinct().subquery()
            if review_status == 'reviewed':
                # 已审核：有ImageAnnotation记录
                query = query.join(
                    subquery,
                    ImageFile.id == subquery.c.image_file_id
                )
            elif review_status == 'unreviewed':
                # 未审核：没有ImageAnnotation记录
                query = query.outerjoin(
                    subquery,
                    ImageFile.id == subquery.c.image_file_id
                ).filter(subquery.c.image_file_id == None)
        elif file_status:
            # 按具体状态筛选
            query = query.filter(ImageFile.status == file_status)

        # 其他筛选条件
        if file_type:
            query = query.filter(ImageFile.file_type == file_type)

        if description:
            query = query.filter(ImageFile.description == description)

        if start_date:
            query = query.filter(ImageFile.created_at >= start_date)

        if end_date:
            query = query.filter(ImageFile.created_at <= end_date)

        # 搜索
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    ImageFile.original_filename.ilike(search_pattern),
                    ImageFile.description.ilike(search_pattern),
                    Patient.name.ilike(search_pattern)
                )
            )

        # 分页
        total = query.count()
        images = query.order_by(ImageFile.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

        # 转换为响应格式
        items = []
        for img in images:
            items.append(ImageFileResponse(
                id=img.id,
                file_uuid=img.file_uuid,
                original_filename=img.original_filename,
                file_type=img.file_type.value,
                mime_type=img.mime_type,
                file_size=img.file_size,
                storage_path=img.storage_path,
                thumbnail_path=img.thumbnail_path,
                uploaded_by=img.uploaded_by,
                uploader_name=None,  # 可以后续优化
                patient_id=img.patient_id,
                modality=img.modality,
                body_part=img.body_part,
                study_date=img.study_date,
                description=img.description,
                annotation=img.annotation,  # 添加标注数据
                status=img.status.value,
                upload_progress=img.upload_progress,
                created_at=img.created_at,
                uploaded_at=img.uploaded_at
            ).dict())

        return paginated_response(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            message="影像文件列表查询成功"
        )

    except Exception as e:
        logger.error(f"获取影像列表失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取影像列表失败: {str(e)}"
        )


@router.get("/patient/{patient_id}", response_model=dict, summary="获取患者的影像文件")
async def get_patient_images(
    patient_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定患者的所有影像文件
    """
    try:
        # 构建查询
        query = db.query(ImageFile).filter(
            ImageFile.patient_id == patient_id,
            ImageFile.is_deleted == False
        )
        query = apply_image_visibility_filter(query, db, current_user)

        total = query.count()
        images = query.order_by(ImageFile.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        
        items = []
        for img in images:
            img_dict = {
                "id": img.id,
                "file_uuid": img.file_uuid,
                "original_filename": img.original_filename,
                "file_type": img.file_type.value,
                "mime_type": img.mime_type,
                "file_size": img.file_size,
                "storage_path": img.storage_path,
                "thumbnail_path": img.thumbnail_path,
                "uploaded_by": img.uploaded_by,
                "patient_id": img.patient_id,
                "modality": img.modality,
                "body_part": img.body_part,
                "study_date": img.study_date,
                "description": img.description,
                "status": img.status.value,
                "upload_progress": img.upload_progress,
                "created_at": img.created_at,
                "uploaded_at": img.uploaded_at
            }
            items.append(ImageFileResponse(**img_dict).dict())

        return paginated_response(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            message="患者影像文件查询成功"
        )
        
    except Exception as e:
        logger.error(f"获取患者影像文件失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取患者影像文件失败"
        )


@router.get("/{file_id}", response_model=dict, summary="获取影像文件详情")
async def get_image_file(
    file_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定影像文件的详细信息
    """
    try:
        image = get_visible_image_file(db, file_id, current_user)

        if not image:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )
        
        # 构建响应
        img_dict = {
            "id": image.id,
            "file_uuid": image.file_uuid,
            "original_filename": image.original_filename,
            "file_type": image.file_type.value,
            "mime_type": image.mime_type,
            "file_size": image.file_size,
            "storage_path": image.storage_path,
            "thumbnail_path": image.thumbnail_path,
            "uploaded_by": image.uploaded_by,
            "patient_id": image.patient_id,
            "modality": image.modality,
            "body_part": image.body_part,
            "study_date": image.study_date,
            "description": image.description,
            "annotation": image.annotation,
            "status": image.status.value,
            "upload_progress": image.upload_progress,
            "created_at": image.created_at,
            "uploaded_at": image.uploaded_at
        }

        # 获取上传者信息
        if image.uploaded_by:
            uploader = db.query(User).filter(User.id == image.uploaded_by).first()
            if uploader:
                img_dict["uploader_name"] = uploader.username

        return success_response(
            data=ImageFileResponse(**img_dict).dict(),
            message="影像文件详情查询成功"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取影像文件详情失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像文件详情失败"
        )


@router.get("/{file_id}/download", summary="下载影像文件")
async def download_image_file(
    file_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    下载指定的影像文件
    """
    try:
        image = get_visible_image_file(db, file_id, current_user)
        
        if not image:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )

        # 构建文件路径
        file_path = Path(settings.UPLOAD_DIR) / image.storage_path

        if not file_path.exists():
            logger.error(f"文件不存在: {file_path}")
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="文件不存在"
            )
        
        return FileResponse(
            path=str(file_path),
            filename=image.original_filename,
            media_type=image.mime_type or "application/octet-stream"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"下载影像文件失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="下载影像文件失败"
        )


@router.delete("/{file_id}", summary="删除影像文件")
async def delete_image_file(
    file_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    软删除指定的影像文件
    """
    try:
        image = db.query(ImageFile).filter(
            ImageFile.id == file_id,
            ImageFile.is_deleted == False
        ).first()
        
        if not image:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )

        # 检查权限：只能删除自己上传的文件
        if image.uploaded_by != current_user.get('id'):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="无权删除此文件"
            )
        
        # 软删除
        image.is_deleted = True
        image.deleted_at = datetime.now()
        image.deleted_by = current_user.get('id')

        db.commit()

        return success_response(
            data={"file_id": file_id},
            message="影像文件已删除"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除影像文件失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除影像文件失败"
        )


@router.get("/stats/summary", response_model=dict, summary="获取影像文件统计")
async def get_image_stats(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户可见范围内的影像文件统计信息
    """
    try:
        # 总文件数和总大小
        query = db.query(ImageFile).filter(
            ImageFile.is_deleted == False
        )
        images = apply_image_visibility_filter(query, db, current_user).all()
        
        total_files = len(images)
        total_size = sum(img.file_size for img in images)
        
        # 按类型统计
        by_type = {}
        for img in images:
            file_type = img.file_type.value
            by_type[file_type] = by_type.get(file_type, 0) + 1
        
        # 按状态统计
        by_status = {}
        for img in images:
            img_status = img.status.value
            by_status[img_status] = by_status.get(img_status, 0) + 1
        
        # 按模态统计
        by_modality = {}
        for img in images:
            if img.modality:
                by_modality[img.modality] = by_modality.get(img.modality, 0) + 1

        return success_response(
            data=ImageFileStatsResponse(
                total_files=total_files,
                total_size=total_size,
                by_type=by_type,
                by_status=by_status,
                by_modality=by_modality
            ).dict(),
            message="影像统计查询成功"
        )
        
    except Exception as e:
        logger.error(f"获取影像统计失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像统计失败"
        )


@router.patch("/{file_id}/exam-type", response_model=dict, summary="修改影像检查类型")
async def update_exam_type(
    file_id: int,
    request: UpdateExamTypeRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    修改影像检查类型（description 字段，如正位/侧位）。
    已处理或有标注的影像仍可修改，但会在响应中附带警告提示。
    """
    try:
        image = db.query(ImageFile).filter(
            ImageFile.id == file_id,
            ImageFile.is_deleted == False
        ).first()

        if not image:
            raise HTTPException(status_code=404, detail="影像文件不存在")

        warning = None
        if image.status == ImageFileStatusEnum.PROCESSED:
            warning = "该影像已完成AI分析，修改检查类型可能影响结果解读"
        elif image.annotation:
            warning = "该影像已有标注数据，修改检查类型可能影响标注关联"

        image.description = request.description
        image.updated_at = func.now()
        db.commit()
        db.refresh(image)

        logger.info(f"用户 {current_user.get('username')} 将影像 {file_id} 检查类型修改为 {request.description}")
        return success_response(
            data={"id": image.id, "description": image.description, "warning": warning},
            message="检查类型修改成功"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"修改检查类型失败: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="修改检查类型失败")


@router.patch("/{file_id}/annotation", response_model=dict, summary="更新影像文件的标注数据")
async def update_annotation(
    file_id: int,
    request: UpdateAnnotationRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    更新指定影像文件的标注数据
    
    标注数据以JSON字符串格式存储
    """
    try:
        # 查询影像文件
        image = db.query(ImageFile).filter(
            ImageFile.id == file_id,
            ImageFile.is_deleted == False
        ).first()
        
        if not image:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )
        
        # 更新标注数据
        image.annotation = request.annotation
        image.updated_at = func.now()
        db.commit()
        db.refresh(image)
        
        logger.info(f"用户 {current_user.get('username')} 更新了影像文件 {file_id} 的标注数据")
        
        # 构建响应
        img_dict = {
            "id": image.id,
            "file_uuid": image.file_uuid,
            "original_filename": image.original_filename,
            "file_type": image.file_type.value,
            "mime_type": image.mime_type,
            "file_size": image.file_size,
            "storage_path": image.storage_path,
            "thumbnail_path": image.thumbnail_path,
            "uploaded_by": image.uploaded_by,
            "patient_id": image.patient_id,
            "modality": image.modality,
            "body_part": image.body_part,
            "study_date": image.study_date,
            "description": image.description,
            "annotation": image.annotation,
            "status": image.status.value,
            "upload_progress": image.upload_progress,
            "created_at": image.created_at,
            "uploaded_at": image.uploaded_at
        }
        
        # 获取上传者信息
        if image.uploaded_by:
            uploader = db.query(User).filter(User.id == image.uploaded_by).first()
            if uploader:
                img_dict["uploader_name"] = uploader.username

        return success_response(
            data=ImageFileResponse(**img_dict).dict(),
            message="标注数据更新成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新标注数据失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新标注数据失败"
        )
