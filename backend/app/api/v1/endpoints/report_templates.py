"""
报告模板管理API端点

提供报告模板的创建、编辑、版本管理、模板分类等功能

@author XieHe Medical System
@created 2025-09-24
"""

from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.report import ReportTemplate, TemplateTypeEnum, ReportTypeEnum
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Pydantic模型
class TemplateContentSection(BaseModel):
    """模板内容段落"""
    name: str = Field(..., description="段落名称")
    type: str = Field(..., description="段落类型: textarea, select, checklist, structured")
    required: bool = Field(False, description="是否必填")
    placeholder: Optional[str] = Field(None, description="占位符文本")
    options: Optional[List[str]] = Field(None, description="选项列表")
    fields: Optional[List[Dict[str, Any]]] = Field(None, description="子字段列表")

class TemplateContent(BaseModel):
    """模板内容"""
    sections: List[TemplateContentSection] = Field(..., description="模板段落列表")

class ReportTemplateCreate(BaseModel):
    """创建报告模板请求"""
    template_name: str = Field(..., min_length=1, max_length=100, description="模板名称")
    template_code: str = Field(..., min_length=1, max_length=50, description="模板编码")
    template_type: TemplateTypeEnum = Field(..., description="模板类型")
    report_type: ReportTypeEnum = Field(..., description="报告类型")
    modality: Optional[str] = Field(None, max_length=20, description="适用模态")
    body_part: Optional[str] = Field(None, max_length=50, description="适用部位")
    template_content: TemplateContent = Field(..., description="模板内容")
    default_values: Optional[Dict[str, Any]] = Field(None, description="默认值")
    validation_rules: Optional[Dict[str, Any]] = Field(None, description="验证规则")
    description: Optional[str] = Field(None, description="模板描述")
    is_active: bool = Field(True, description="是否启用")
    is_default: bool = Field(False, description="是否默认模板")

class ReportTemplateUpdate(BaseModel):
    """更新报告模板请求"""
    template_name: Optional[str] = Field(None, min_length=1, max_length=100, description="模板名称")
    template_type: Optional[TemplateTypeEnum] = Field(None, description="模板类型")
    report_type: Optional[ReportTypeEnum] = Field(None, description="报告类型")
    modality: Optional[str] = Field(None, max_length=20, description="适用模态")
    body_part: Optional[str] = Field(None, max_length=50, description="适用部位")
    template_content: Optional[TemplateContent] = Field(None, description="模板内容")
    default_values: Optional[Dict[str, Any]] = Field(None, description="默认值")
    validation_rules: Optional[Dict[str, Any]] = Field(None, description="验证规则")
    description: Optional[str] = Field(None, description="模板描述")
    is_active: Optional[bool] = Field(None, description="是否启用")
    is_default: Optional[bool] = Field(None, description="是否默认模板")

class ReportTemplateResponse(BaseModel):
    """报告模板响应"""
    id: int
    template_name: str
    template_code: str
    template_type: TemplateTypeEnum
    report_type: ReportTypeEnum
    modality: Optional[str]
    body_part: Optional[str]
    template_content: Dict[str, Any]
    default_values: Optional[Dict[str, Any]]
    validation_rules: Optional[Dict[str, Any]]
    is_active: bool
    is_default: bool
    version: str
    description: Optional[str]
    usage_count: int
    last_used_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]

    class Config:
        from_attributes = True

class TemplateListResponse(BaseModel):
    """模板列表响应"""
    templates: List[ReportTemplateResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class TemplateVersionCreate(BaseModel):
    """创建模板版本请求"""
    version_notes: str = Field(..., description="版本说明")
    template_content: TemplateContent = Field(..., description="模板内容")
    default_values: Optional[Dict[str, Any]] = Field(None, description="默认值")
    validation_rules: Optional[Dict[str, Any]] = Field(None, description="验证规则")

@router.get("/templates", response_model=TemplateListResponse)
async def get_templates(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    template_type: Optional[TemplateTypeEnum] = Query(None, description="模板类型筛选"),
    report_type: Optional[ReportTypeEnum] = Query(None, description="报告类型筛选"),
    modality: Optional[str] = Query(None, description="模态筛选"),
    body_part: Optional[str] = Query(None, description="部位筛选"),
    is_active: Optional[bool] = Query(None, description="是否启用筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    sort_by: str = Query("updated_at", description="排序字段"),
    sort_order: str = Query("desc", description="排序方向: asc, desc"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取报告模板列表
    """
    try:
        # 构建查询条件
        query = db.query(ReportTemplate).filter(ReportTemplate.is_deleted == False)
        
        # 筛选条件
        if template_type:
            query = query.filter(ReportTemplate.template_type == template_type)
        if report_type:
            query = query.filter(ReportTemplate.report_type == report_type)
        if modality:
            query = query.filter(ReportTemplate.modality == modality)
        if body_part:
            query = query.filter(ReportTemplate.body_part == body_part)
        if is_active is not None:
            query = query.filter(ReportTemplate.is_active == is_active)
        
        # 搜索条件
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    ReportTemplate.template_name.like(search_pattern),
                    ReportTemplate.template_code.like(search_pattern),
                    ReportTemplate.description.like(search_pattern)
                )
            )
        
        # 排序
        if hasattr(ReportTemplate, sort_by):
            order_column = getattr(ReportTemplate, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(order_column))
            else:
                query = query.order_by(asc(order_column))
        
        # 分页
        total = query.count()
        offset = (page - 1) * page_size
        templates = query.offset(offset).limit(page_size).all()
        
        total_pages = (total + page_size - 1) // page_size
        
        logger.info(f"获取报告模板列表: {len(templates)} 个模板")
        
        return TemplateListResponse(
            templates=templates,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"获取报告模板列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取报告模板列表失败"
        )

@router.get("/templates/{template_id}", response_model=ReportTemplateResponse)
async def get_template(
    template_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定报告模板详情
    """
    try:
        template = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.id == template_id,
                ReportTemplate.is_deleted == False
            )
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="报告模板不存在"
            )
        
        logger.info(f"获取报告模板详情: {template.template_name}")
        return template
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取报告模板详情失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取报告模板详情失败"
        )

@router.post("/templates", response_model=ReportTemplateResponse)
async def create_template(
    template_data: ReportTemplateCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    创建新的报告模板
    """
    try:
        # 检查模板编码是否已存在
        existing_template = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.template_code == template_data.template_code,
                ReportTemplate.is_deleted == False
            )
        ).first()
        
        if existing_template:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="模板编码已存在"
            )
        
        # 如果设置为默认模板，需要取消其他同类型的默认模板
        if template_data.is_default:
            db.query(ReportTemplate).filter(
                and_(
                    ReportTemplate.report_type == template_data.report_type,
                    ReportTemplate.modality == template_data.modality,
                    ReportTemplate.body_part == template_data.body_part,
                    ReportTemplate.is_deleted == False
                )
            ).update({"is_default": False})
        
        # 创建新模板
        template = ReportTemplate(
            template_name=template_data.template_name,
            template_code=template_data.template_code,
            template_type=template_data.template_type,
            report_type=template_data.report_type,
            modality=template_data.modality,
            body_part=template_data.body_part,
            template_content=template_data.template_content.dict(),
            default_values=template_data.default_values,
            validation_rules=template_data.validation_rules,
            description=template_data.description,
            is_active=template_data.is_active,
            is_default=template_data.is_default,
            version="1.0",
            created_by=current_user.get("user_id")
        )
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        logger.info(f"创建报告模板成功: {template.template_name} ({template.template_code})")
        return template
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建报告模板失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建报告模板失败"
        )

@router.put("/templates/{template_id}", response_model=ReportTemplateResponse)
async def update_template(
    template_id: int,
    template_data: ReportTemplateUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    更新报告模板
    """
    try:
        template = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.id == template_id,
                ReportTemplate.is_deleted == False
            )
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="报告模板不存在"
            )
        
        # 如果设置为默认模板，需要取消其他同类型的默认模板
        if template_data.is_default:
            report_type = template_data.report_type or template.report_type
            modality = template_data.modality or template.modality
            body_part = template_data.body_part or template.body_part
            
            db.query(ReportTemplate).filter(
                and_(
                    ReportTemplate.id != template_id,
                    ReportTemplate.report_type == report_type,
                    ReportTemplate.modality == modality,
                    ReportTemplate.body_part == body_part,
                    ReportTemplate.is_deleted == False
                )
            ).update({"is_default": False})
        
        # 更新模板字段
        update_data = template_data.dict(exclude_unset=True)
        if "template_content" in update_data:
            update_data["template_content"] = update_data["template_content"].dict()
        
        update_data["updated_by"] = current_user.get("user_id")
        
        for field, value in update_data.items():
            setattr(template, field, value)
        
        db.commit()
        db.refresh(template)
        
        logger.info(f"更新报告模板成功: {template.template_name}")
        return template

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新报告模板失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新报告模板失败"
        )

@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    删除报告模板（软删除）
    """
    try:
        template = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.id == template_id,
                ReportTemplate.is_deleted == False
            )
        ).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="报告模板不存在"
            )

        # 检查是否有报告在使用此模板
        from app.models.report import DiagnosticReport
        reports_using_template = db.query(DiagnosticReport).filter(
            and_(
                DiagnosticReport.template_id == template_id,
                DiagnosticReport.is_deleted == False
            )
        ).count()

        if reports_using_template > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无法删除模板，有 {reports_using_template} 个报告正在使用此模板"
            )

        # 软删除
        template.is_deleted = True
        template.deleted_at = datetime.now()
        template.deleted_by = current_user.get("user_id")

        db.commit()

        logger.info(f"删除报告模板成功: {template.template_name}")
        return {"message": "报告模板删除成功"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除报告模板失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除报告模板失败"
        )

@router.post("/templates/{template_id}/duplicate", response_model=ReportTemplateResponse)
async def duplicate_template(
    template_id: int,
    new_name: str = Query(..., description="新模板名称"),
    new_code: str = Query(..., description="新模板编码"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    复制报告模板
    """
    try:
        # 获取原模板
        original_template = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.id == template_id,
                ReportTemplate.is_deleted == False
            )
        ).first()

        if not original_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="原报告模板不存在"
            )

        # 检查新编码是否已存在
        existing_template = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.template_code == new_code,
                ReportTemplate.is_deleted == False
            )
        ).first()

        if existing_template:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="新模板编码已存在"
            )

        # 创建新模板
        new_template = ReportTemplate(
            template_name=new_name,
            template_code=new_code,
            template_type=original_template.template_type,
            report_type=original_template.report_type,
            modality=original_template.modality,
            body_part=original_template.body_part,
            template_content=original_template.template_content,
            default_values=original_template.default_values,
            validation_rules=original_template.validation_rules,
            description=f"复制自: {original_template.template_name}",
            is_active=True,
            is_default=False,  # 复制的模板不设为默认
            version="1.0",
            created_by=current_user.get("user_id")
        )

        db.add(new_template)
        db.commit()
        db.refresh(new_template)

        logger.info(f"复制报告模板成功: {new_template.template_name}")
        return new_template

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"复制报告模板失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="复制报告模板失败"
        )

@router.post("/templates/{template_id}/version", response_model=ReportTemplateResponse)
async def create_template_version(
    template_id: int,
    version_data: TemplateVersionCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    创建模板新版本
    """
    try:
        template = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.id == template_id,
                ReportTemplate.is_deleted == False
            )
        ).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="报告模板不存在"
            )

        # 生成新版本号
        current_version = template.version or "1.0"
        version_parts = current_version.split(".")
        major = int(version_parts[0])
        minor = int(version_parts[1]) if len(version_parts) > 1 else 0
        new_version = f"{major}.{minor + 1}"

        # 更新模板内容和版本
        template.template_content = version_data.template_content.dict()
        template.default_values = version_data.default_values
        template.validation_rules = version_data.validation_rules
        template.version = new_version
        template.updated_by = current_user.get("user_id")

        # 记录版本说明（可以扩展为版本历史表）
        if not template.description:
            template.description = ""
        template.description += f"\n\n版本 {new_version}: {version_data.version_notes}"

        db.commit()
        db.refresh(template)

        logger.info(f"创建模板版本成功: {template.template_name} v{new_version}")
        return template

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建模板版本失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建模板版本失败"
        )

@router.get("/templates/categories")
async def get_template_categories(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取模板分类统计
    """
    try:
        from sqlalchemy import func

        # 按报告类型分组统计
        report_type_stats = db.query(
            ReportTemplate.report_type,
            func.count(ReportTemplate.id).label('count')
        ).filter(
            and_(
                ReportTemplate.is_deleted == False,
                ReportTemplate.is_active == True
            )
        ).group_by(ReportTemplate.report_type).all()

        # 按模态分组统计
        modality_stats = db.query(
            ReportTemplate.modality,
            func.count(ReportTemplate.id).label('count')
        ).filter(
            and_(
                ReportTemplate.is_deleted == False,
                ReportTemplate.is_active == True,
                ReportTemplate.modality.isnot(None)
            )
        ).group_by(ReportTemplate.modality).all()

        # 按部位分组统计
        body_part_stats = db.query(
            ReportTemplate.body_part,
            func.count(ReportTemplate.id).label('count')
        ).filter(
            and_(
                ReportTemplate.is_deleted == False,
                ReportTemplate.is_active == True,
                ReportTemplate.body_part.isnot(None)
            )
        ).group_by(ReportTemplate.body_part).all()

        # 按模板类型分组统计
        template_type_stats = db.query(
            ReportTemplate.template_type,
            func.count(ReportTemplate.id).label('count')
        ).filter(
            and_(
                ReportTemplate.is_deleted == False,
                ReportTemplate.is_active == True
            )
        ).group_by(ReportTemplate.template_type).all()

        result = {
            "report_types": [{"type": item.report_type.value, "count": item.count} for item in report_type_stats],
            "modalities": [{"modality": item.modality, "count": item.count} for item in modality_stats],
            "body_parts": [{"body_part": item.body_part, "count": item.count} for item in body_part_stats],
            "template_types": [{"type": item.template_type.value, "count": item.count} for item in template_type_stats]
        }

        logger.info("获取模板分类统计成功")
        return result

    except Exception as e:
        logger.error(f"获取模板分类统计失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取模板分类统计失败"
        )

@router.get("/templates/default")
async def get_default_templates(
    report_type: Optional[ReportTypeEnum] = Query(None, description="报告类型"),
    modality: Optional[str] = Query(None, description="模态"),
    body_part: Optional[str] = Query(None, description="部位"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取默认模板
    """
    try:
        query = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.is_deleted == False,
                ReportTemplate.is_active == True,
                ReportTemplate.is_default == True
            )
        )

        if report_type:
            query = query.filter(ReportTemplate.report_type == report_type)
        if modality:
            query = query.filter(ReportTemplate.modality == modality)
        if body_part:
            query = query.filter(ReportTemplate.body_part == body_part)

        templates = query.all()

        logger.info(f"获取默认模板: {len(templates)} 个")
        return {"templates": templates}

    except Exception as e:
        logger.error(f"获取默认模板失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取默认模板失败"
        )

@router.post("/templates/{template_id}/set-default")
async def set_default_template(
    template_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    设置默认模板
    """
    try:
        template = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.id == template_id,
                ReportTemplate.is_deleted == False
            )
        ).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="报告模板不存在"
            )

        # 取消同类型的其他默认模板
        db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.id != template_id,
                ReportTemplate.report_type == template.report_type,
                ReportTemplate.modality == template.modality,
                ReportTemplate.body_part == template.body_part,
                ReportTemplate.is_deleted == False
            )
        ).update({"is_default": False})

        # 设置为默认模板
        template.is_default = True
        template.updated_by = current_user.get("user_id")

        db.commit()

        logger.info(f"设置默认模板成功: {template.template_name}")
        return {"message": "设置默认模板成功"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"设置默认模板失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="设置默认模板失败"
        )

@router.post("/templates/{template_id}/activate")
async def activate_template(
    template_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    激活模板
    """
    try:
        template = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.id == template_id,
                ReportTemplate.is_deleted == False
            )
        ).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="报告模板不存在"
            )

        template.is_active = True
        template.updated_by = current_user.get("user_id")

        db.commit()

        logger.info(f"激活模板成功: {template.template_name}")
        return {"message": "激活模板成功"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"激活模板失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="激活模板失败"
        )

@router.post("/templates/{template_id}/deactivate")
async def deactivate_template(
    template_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    停用模板
    """
    try:
        template = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.id == template_id,
                ReportTemplate.is_deleted == False
            )
        ).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="报告模板不存在"
            )

        template.is_active = False
        template.is_default = False  # 停用时同时取消默认状态
        template.updated_by = current_user.get("user_id")

        db.commit()

        logger.info(f"停用模板成功: {template.template_name}")
        return {"message": "停用模板成功"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"停用模板失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="停用模板失败"
        )

@router.get("/templates/{template_id}/usage-stats")
async def get_template_usage_stats(
    template_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取模板使用统计
    """
    try:
        template = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.id == template_id,
                ReportTemplate.is_deleted == False
            )
        ).first()

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="报告模板不存在"
            )

        from app.models.report import DiagnosticReport
        from sqlalchemy import func, extract

        # 总使用次数
        total_usage = db.query(func.count(DiagnosticReport.id)).filter(
            and_(
                DiagnosticReport.template_id == template_id,
                DiagnosticReport.is_deleted == False
            )
        ).scalar()

        # 最近30天使用次数
        from datetime import datetime, timedelta
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_usage = db.query(func.count(DiagnosticReport.id)).filter(
            and_(
                DiagnosticReport.template_id == template_id,
                DiagnosticReport.created_at >= thirty_days_ago,
                DiagnosticReport.is_deleted == False
            )
        ).scalar()

        # 按月统计使用次数（最近12个月）
        monthly_usage = db.query(
            extract('year', DiagnosticReport.created_at).label('year'),
            extract('month', DiagnosticReport.created_at).label('month'),
            func.count(DiagnosticReport.id).label('count')
        ).filter(
            and_(
                DiagnosticReport.template_id == template_id,
                DiagnosticReport.created_at >= datetime.now() - timedelta(days=365),
                DiagnosticReport.is_deleted == False
            )
        ).group_by(
            extract('year', DiagnosticReport.created_at),
            extract('month', DiagnosticReport.created_at)
        ).order_by(
            extract('year', DiagnosticReport.created_at),
            extract('month', DiagnosticReport.created_at)
        ).all()

        # 更新模板使用统计
        template.usage_count = total_usage
        if total_usage > 0:
            template.last_used_at = db.query(func.max(DiagnosticReport.created_at)).filter(
                and_(
                    DiagnosticReport.template_id == template_id,
                    DiagnosticReport.is_deleted == False
                )
            ).scalar()

        db.commit()

        result = {
            "template_id": template_id,
            "template_name": template.template_name,
            "total_usage": total_usage,
            "recent_usage": recent_usage,
            "last_used_at": template.last_used_at,
            "monthly_usage": [
                {
                    "year": int(item.year),
                    "month": int(item.month),
                    "count": item.count
                } for item in monthly_usage
            ]
        }

        logger.info(f"获取模板使用统计成功: {template.template_name}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取模板使用统计失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取模板使用统计失败"
        )
