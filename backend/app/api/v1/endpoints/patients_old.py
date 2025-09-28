"""
患者管理API端点

实现患者信息的增删改查功能

@author XieHe Medical System
@created 2025-09-24
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.exceptions import BusinessLogicException, ResourceNotFoundException
from app.core.logging import get_logger
from app.models.patient import Patient, GenderEnum, PatientStatusEnum
from sqlalchemy import and_, or_, desc, func
import uuid

logger = get_logger(__name__)

router = APIRouter()

# Pydantic模型定义
class PatientBase(BaseModel):
    """患者基础信息模型"""
    patient_id: str = Field(..., description="患者ID", max_length=50)
    name: str = Field(..., description="患者姓名", max_length=100)
    gender: str = Field(..., description="性别", pattern="^(男|女|未知)$")
    birth_date: date = Field(..., description="出生日期")
    phone: Optional[str] = Field(None, description="联系电话", max_length=20)
    email: Optional[str] = Field(None, description="邮箱地址", max_length=100)
    address: Optional[str] = Field(None, description="联系地址", max_length=200)
    emergency_contact: Optional[str] = Field(None, description="紧急联系人", max_length=100)
    emergency_phone: Optional[str] = Field(None, description="紧急联系电话", max_length=20)
    id_card: Optional[str] = Field(None, description="身份证号", max_length=18)
    medical_insurance: Optional[str] = Field(None, description="医保号", max_length=50)

    @validator('birth_date')
    def validate_birth_date(cls, v):
        if v > date.today():
            raise ValueError('出生日期不能大于当前日期')
        return v

    @validator('phone', 'emergency_phone')
    def validate_phone(cls, v):
        if v and not v.replace('-', '').replace(' ', '').isdigit():
            raise ValueError('电话号码格式不正确')
        return v

class PatientCreate(PatientBase):
    """创建患者模型"""
    pass

class PatientUpdate(BaseModel):
    """更新患者模型"""
    name: Optional[str] = Field(None, max_length=100)
    gender: Optional[str] = Field(None, pattern="^(男|女|未知)$")
    birth_date: Optional[date] = None
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=200)
    emergency_contact: Optional[str] = Field(None, max_length=100)
    emergency_phone: Optional[str] = Field(None, max_length=20)
    id_card: Optional[str] = Field(None, max_length=18)
    medical_insurance: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

class PatientResponse(PatientBase):
    """患者响应模型"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    age: int

    class Config:
        from_attributes = True

class PatientListResponse(BaseModel):
    """患者列表响应模型"""
    patients: List[PatientResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

# 工具函数
def calculate_age(birth_date: date) -> int:
    """计算年龄"""
    today = date.today()
    age = today.year - birth_date.year
    if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
        age -= 1
    return age

# 模拟数据库操作（实际项目中应该使用真实的数据库模型）
MOCK_PATIENTS = []

# 生成更多模拟患者数据
def generate_mock_patients():
    """生成模拟患者数据"""
    import random
    from datetime import timedelta

    if MOCK_PATIENTS:  # 如果已经生成过，直接返回
        return

    patient_names = [
        "张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十",
        "郑十一", "王十二", "冯十三", "陈十四", "褚十五", "卫十六", "蒋十七", "沈十八",
        "韩十九", "杨二十", "朱二十一", "秦二十二", "尤二十三", "许二十四", "何二十五", "吕二十六",
        "张伟", "王伟", "王芳", "李伟", "李娜", "张敏", "李静", "王静", "刘伟", "王秀英",
        "陈伟", "李秀英", "张秀英", "刘洋", "李强", "王磊", "李军", "王勇", "张勇", "李勇"
    ]

    departments = ["内科", "外科", "儿科", "妇科", "骨科", "心内科", "神经内科", "呼吸内科", "消化内科", "泌尿外科"]
    addresses = [
        "北京市朝阳区", "上海市浦东新区", "广州市天河区", "深圳市南山区", "杭州市西湖区",
        "南京市玄武区", "武汉市武昌区", "成都市锦江区", "重庆市渝中区", "西安市雁塔区"
    ]

    for i in range(1, 51):  # 生成50个患者
        birth_year = random.randint(1950, 2010)
        birth_month = random.randint(1, 12)
        birth_day = random.randint(1, 28)
        birth_date = date(birth_year, birth_month, birth_day)

        patient = {
            "id": i,
            "patient_id": f"P{i:03d}",
            "name": random.choice(patient_names) + (f"_{i}" if i > 20 else ""),
            "gender": random.choice(["男", "女"]),
            "birth_date": birth_date,
            "phone": f"138{random.randint(10000000, 99999999)}",
            "email": f"patient{i}@example.com" if random.random() > 0.3 else None,
            "address": random.choice(addresses) + f"第{i}街道{random.randint(1, 999)}号",
            "emergency_contact": f"联系人{i}",
            "emergency_phone": f"139{random.randint(10000000, 99999999)}",
            "id_card": f"{random.choice(['110101', '310101', '440101'])}{birth_date.strftime('%Y%m%d')}{random.randint(1000, 9999)}",
            "medical_insurance": f"INS{random.randint(100000000, 999999999)}",
            "is_active": random.choice([True, True, True, False]),  # 大部分是活跃的
            "created_at": datetime.now() - timedelta(days=random.randint(1, 365)),
            "updated_at": datetime.now() - timedelta(days=random.randint(0, 30)),
            "age": calculate_age(birth_date),
            "last_visit": datetime.now() - timedelta(days=random.randint(1, 90)) if random.random() > 0.2 else None,
            "total_visits": random.randint(1, 20),
            "department": random.choice(departments),
            "blood_type": random.choice(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "未知"]),
            "height": random.randint(150, 190) if random.random() > 0.3 else None,
            "weight": random.randint(45, 90) if random.random() > 0.3 else None,
            "allergies": random.choice([None, ["青霉素"], ["海鲜", "花粉"], ["尘螨", "药物"]]),
            "chronic_diseases": random.choice([None, ["高血压"], ["糖尿病", "高血压"], ["冠心病"]]),
            "is_vip": random.choice([True, False]) if random.random() < 0.1 else False,
            "risk_level": random.choice(["低", "中", "高"]) if random.random() < 0.2 else "低"
        }
        MOCK_PATIENTS.append(patient)

# 初始化模拟数据
generate_mock_patients()

def get_patient_by_id(patient_id: int) -> Optional[Dict[str, Any]]:
    """根据ID获取患者"""
    for patient in MOCK_PATIENTS:
        if patient["id"] == patient_id:
            return patient
    return None

def get_patient_by_patient_id(patient_id: str) -> Optional[Dict[str, Any]]:
    """根据患者ID获取患者"""
    for patient in MOCK_PATIENTS:
        if patient["patient_id"] == patient_id:
            return patient
    return None

@router.post("/", response_model=PatientResponse, summary="创建患者")
async def create_patient(
    patient_data: PatientCreate,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    创建新患者

    - **patient_id**: 患者ID（唯一）
    - **name**: 患者姓名
    - **gender**: 性别（男/女/未知）
    - **birth_date**: 出生日期
    - **phone**: 联系电话（可选）
    - **email**: 邮箱地址（可选）
    - **address**: 联系地址（可选）
    - **emergency_contact**: 紧急联系人（可选）
    - **emergency_phone**: 紧急联系电话（可选）
    - **id_card**: 身份证号（可选）
    - **medical_insurance**: 医保号（可选）
    """
    try:
        # 检查患者ID是否已存在
        existing_patient = get_patient_by_patient_id(patient_data.patient_id)
        if existing_patient:
            raise BusinessLogicException(f"患者ID {patient_data.patient_id} 已存在")

        # 创建新患者
        new_patient = {
            "id": len(MOCK_PATIENTS) + 1,
            **patient_data.dict(),
            "is_active": True,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "age": calculate_age(patient_data.birth_date)
        }

        MOCK_PATIENTS.append(new_patient)

        logger.info(f"患者创建成功: {patient_data.patient_id} - {patient_data.name}")

        return PatientResponse(**new_patient)

    except BusinessLogicException:
        raise
    except Exception as e:
        logger.error(f"患者创建失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="患者创建过程中发生错误"
        )

@router.get("/", response_model=PatientListResponse, summary="获取患者列表")
async def get_patients(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索关键词（姓名、患者ID、电话）"),
    gender: Optional[str] = Query(None, description="性别筛选"),
    is_active: Optional[bool] = Query(None, description="状态筛选"),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取患者列表

    支持分页、搜索和筛选功能
    """
    try:
        # 筛选患者
        filtered_patients = MOCK_PATIENTS.copy()

        # 状态筛选
        if is_active is not None:
            filtered_patients = [p for p in filtered_patients if p["is_active"] == is_active]

        # 性别筛选
        if gender:
            filtered_patients = [p for p in filtered_patients if p["gender"] == gender]

        # 搜索筛选
        if search:
            search_lower = search.lower()
            filtered_patients = [
                p for p in filtered_patients
                if (search_lower in p["name"].lower() or
                    search_lower in p["patient_id"].lower() or
                    (p["phone"] and search_lower in p["phone"]))
            ]

        # 计算分页
        total = len(filtered_patients)
        total_pages = (total + page_size - 1) // page_size
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        patients = filtered_patients[start_idx:end_idx]

        logger.info(f"患者列表查询成功: 总数 {total}, 页码 {page}/{total_pages}")

        return PatientListResponse(
            patients=[PatientResponse(**p) for p in patients],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except Exception as e:
        logger.error(f"患者列表查询失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="患者列表查询过程中发生错误"
        )

@router.get("/{patient_id}", response_model=PatientResponse, summary="获取患者详情")
async def get_patient(
    patient_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    根据ID获取患者详情
    """
    try:
        patient = get_patient_by_id(patient_id)
        if not patient:
            raise ResourceNotFoundException(f"患者 ID {patient_id} 不存在")

        logger.info(f"患者详情查询成功: {patient['patient_id']} - {patient['name']}")

        return PatientResponse(**patient)

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"患者详情查询失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="患者详情查询过程中发生错误"
        )

@router.put("/{patient_id}", response_model=PatientResponse, summary="更新患者信息")
async def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    更新患者信息
    """
    try:
        patient = get_patient_by_id(patient_id)
        if not patient:
            raise ResourceNotFoundException(f"患者 ID {patient_id} 不存在")

        # 更新患者信息
        update_data = patient_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            patient[field] = value

        patient["updated_at"] = datetime.now()

        # 重新计算年龄
        if "birth_date" in update_data:
            patient["age"] = calculate_age(patient["birth_date"])

        logger.info(f"患者信息更新成功: {patient['patient_id']} - {patient['name']}")

        return PatientResponse(**patient)

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"患者信息更新失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="患者信息更新过程中发生错误"
        )

@router.delete("/{patient_id}", response_model=Dict[str, Any], summary="删除患者")
async def delete_patient(
    patient_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    删除患者（软删除，设置为非活跃状态）
    """
    try:
        patient = get_patient_by_id(patient_id)
        if not patient:
            raise ResourceNotFoundException(f"患者 ID {patient_id} 不存在")

        # 软删除：设置为非活跃状态
        patient["is_active"] = False
        patient["updated_at"] = datetime.now()

        logger.info(f"患者删除成功: {patient['patient_id']} - {patient['name']}")

        return {
            "message": "患者删除成功",
            "patient_id": patient["patient_id"],
            "name": patient["name"]
        }

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"患者删除失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="患者删除过程中发生错误"
        )

@router.get("/search", response_model=PatientListResponse, summary="高级搜索患者")
async def search_patients(
    q: Optional[str] = Query(None, description="搜索关键词"),
    gender: Optional[str] = Query(None, description="性别筛选"),
    age_min: Optional[int] = Query(None, ge=0, le=150, description="最小年龄"),
    age_max: Optional[int] = Query(None, ge=0, le=150, description="最大年龄"),
    department: Optional[str] = Query(None, description="科室筛选"),
    blood_type: Optional[str] = Query(None, description="血型筛选"),
    has_allergies: Optional[bool] = Query(None, description="是否有过敏史"),
    has_chronic_disease: Optional[bool] = Query(None, description="是否有慢性病"),
    is_vip: Optional[bool] = Query(None, description="是否VIP"),
    risk_level: Optional[str] = Query(None, description="风险等级"),
    visit_date_start: Optional[date] = Query(None, description="就诊开始日期"),
    visit_date_end: Optional[date] = Query(None, description="就诊结束日期"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    sort_by: str = Query("created_at", description="排序字段"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="排序方向"),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    高级搜索患者

    支持多条件组合搜索和排序
    """
    try:
        # 筛选患者
        filtered_patients = [p for p in MOCK_PATIENTS if p["is_active"]]

        # 关键词搜索
        if q:
            q_lower = q.lower()
            filtered_patients = [
                p for p in filtered_patients
                if (q_lower in p["name"].lower() or
                    q_lower in p["patient_id"].lower() or
                    (p["phone"] and q_lower in p["phone"]) or
                    (p["id_card"] and q_lower in p["id_card"]) or
                    (p["address"] and q_lower in p["address"].lower()))
            ]

        # 性别筛选
        if gender:
            filtered_patients = [p for p in filtered_patients if p["gender"] == gender]

        # 年龄筛选
        if age_min is not None:
            filtered_patients = [p for p in filtered_patients if p["age"] >= age_min]
        if age_max is not None:
            filtered_patients = [p for p in filtered_patients if p["age"] <= age_max]

        # 科室筛选
        if department:
            filtered_patients = [p for p in filtered_patients if p.get("department") == department]

        # 血型筛选
        if blood_type:
            filtered_patients = [p for p in filtered_patients if p.get("blood_type") == blood_type]

        # 过敏史筛选
        if has_allergies is not None:
            if has_allergies:
                filtered_patients = [p for p in filtered_patients if p.get("allergies")]
            else:
                filtered_patients = [p for p in filtered_patients if not p.get("allergies")]

        # 慢性病筛选
        if has_chronic_disease is not None:
            if has_chronic_disease:
                filtered_patients = [p for p in filtered_patients if p.get("chronic_diseases")]
            else:
                filtered_patients = [p for p in filtered_patients if not p.get("chronic_diseases")]

        # VIP筛选
        if is_vip is not None:
            filtered_patients = [p for p in filtered_patients if p.get("is_vip", False) == is_vip]

        # 风险等级筛选
        if risk_level:
            filtered_patients = [p for p in filtered_patients if p.get("risk_level") == risk_level]

        # 就诊日期筛选
        if visit_date_start:
            filtered_patients = [p for p in filtered_patients
                               if p.get("last_visit") and p["last_visit"].date() >= visit_date_start]
        if visit_date_end:
            filtered_patients = [p for p in filtered_patients
                               if p.get("last_visit") and p["last_visit"].date() <= visit_date_end]

        # 排序
        reverse = sort_order == "desc"
        if sort_by == "name":
            filtered_patients.sort(key=lambda x: x["name"], reverse=reverse)
        elif sort_by == "age":
            filtered_patients.sort(key=lambda x: x["age"], reverse=reverse)
        elif sort_by == "created_at":
            filtered_patients.sort(key=lambda x: x["created_at"], reverse=reverse)
        elif sort_by == "last_visit":
            filtered_patients.sort(key=lambda x: x.get("last_visit") or datetime.min, reverse=reverse)

        # 计算分页
        total = len(filtered_patients)
        total_pages = (total + page_size - 1) // page_size
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        patients = filtered_patients[start_idx:end_idx]

        logger.info(f"患者高级搜索成功: 总数 {total}, 页码 {page}/{total_pages}")

        return PatientListResponse(
            patients=[PatientResponse(**p) for p in patients],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except Exception as e:
        logger.error(f"患者高级搜索失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="患者高级搜索过程中发生错误"
        )

@router.get("/statistics", response_model=Dict[str, Any], summary="获取患者统计信息")
async def get_patient_statistics(
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取患者统计信息
    """
    try:
        active_patients = [p for p in MOCK_PATIENTS if p["is_active"]]

        # 基础统计
        total_patients = len(MOCK_PATIENTS)
        active_count = len(active_patients)
        inactive_count = total_patients - active_count

        # 今日新增患者
        today = date.today()
        new_today = len([p for p in active_patients if p["created_at"].date() == today])

        # 本月新增患者
        this_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_this_month = len([p for p in active_patients if p["created_at"] >= this_month])

        # 性别分布
        gender_stats = {"男": 0, "女": 0, "未知": 0}
        for patient in active_patients:
            gender_stats[patient["gender"]] = gender_stats.get(patient["gender"], 0) + 1

        # 年龄分布
        age_groups = {"0-18": 0, "19-35": 0, "36-50": 0, "51-65": 0, "65+": 0}
        for patient in active_patients:
            age = patient["age"]
            if age <= 18:
                age_groups["0-18"] += 1
            elif age <= 35:
                age_groups["19-35"] += 1
            elif age <= 50:
                age_groups["36-50"] += 1
            elif age <= 65:
                age_groups["51-65"] += 1
            else:
                age_groups["65+"] += 1

        # 科室分布
        department_stats = {}
        for patient in active_patients:
            dept = patient.get("department", "未知")
            department_stats[dept] = department_stats.get(dept, 0) + 1

        # 风险等级分布
        risk_stats = {"低": 0, "中": 0, "高": 0}
        for patient in active_patients:
            risk = patient.get("risk_level", "低")
            risk_stats[risk] = risk_stats.get(risk, 0) + 1

        # VIP患者统计
        vip_count = len([p for p in active_patients if p.get("is_vip", False)])

        # 有过敏史患者统计
        allergy_count = len([p for p in active_patients if p.get("allergies")])

        # 慢性病患者统计
        chronic_count = len([p for p in active_patients if p.get("chronic_diseases")])

        statistics = {
            "total_patients": total_patients,
            "active_patients": active_count,
            "inactive_patients": inactive_count,
            "new_patients_today": new_today,
            "new_patients_this_month": new_this_month,
            "gender_distribution": gender_stats,
            "age_distribution": age_groups,
            "department_distribution": department_stats,
            "risk_level_distribution": risk_stats,
            "vip_patients": vip_count,
            "patients_with_allergies": allergy_count,
            "patients_with_chronic_diseases": chronic_count,
            "statistics_generated_at": datetime.now().isoformat()
        }

        logger.info("患者统计信息查询成功")

        return statistics

    except Exception as e:
        logger.error(f"患者统计信息查询失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="患者统计信息查询过程中发生错误"
        )

# 患者档案管理相关模型
class MedicalHistory(BaseModel):
    """病史记录模型"""
    id: Optional[int] = None
    patient_id: int
    disease_name: str = Field(..., description="疾病名称", max_length=100)
    diagnosis_date: date = Field(..., description="诊断日期")
    treatment: Optional[str] = Field(None, description="治疗方案", max_length=500)
    status: str = Field(..., description="状态", pattern="^(治疗中|已治愈|慢性病|复发)$")
    notes: Optional[str] = Field(None, description="备注", max_length=1000)
    created_at: Optional[datetime] = None

class AllergyRecord(BaseModel):
    """过敏记录模型"""
    id: Optional[int] = None
    patient_id: int
    allergen: str = Field(..., description="过敏原", max_length=100)
    reaction: str = Field(..., description="过敏反应", max_length=200)
    severity: str = Field(..., description="严重程度", pattern="^(轻微|中等|严重|危及生命)$")
    notes: Optional[str] = Field(None, description="备注", max_length=500)
    created_at: Optional[datetime] = None

class VisitRecord(BaseModel):
    """就诊记录模型"""
    id: Optional[int] = None
    patient_id: int
    visit_date: datetime = Field(..., description="就诊日期")
    department: str = Field(..., description="科室", max_length=50)
    doctor: str = Field(..., description="医生", max_length=50)
    chief_complaint: str = Field(..., description="主诉", max_length=500)
    diagnosis: str = Field(..., description="诊断", max_length=500)
    treatment: Optional[str] = Field(None, description="治疗方案", max_length=1000)
    prescription: Optional[str] = Field(None, description="处方", max_length=1000)
    follow_up: Optional[date] = Field(None, description="复诊日期")
    notes: Optional[str] = Field(None, description="备注", max_length=1000)

# 模拟数据
MOCK_MEDICAL_HISTORY = [
    {
        "id": 1,
        "patient_id": 1,
        "disease_name": "高血压",
        "diagnosis_date": date(2020, 3, 15),
        "treatment": "降压药物治疗",
        "status": "慢性病",
        "notes": "需要长期服药控制",
        "created_at": datetime(2020, 3, 15, 10, 0, 0)
    }
]

MOCK_ALLERGIES = [
    {
        "id": 1,
        "patient_id": 1,
        "allergen": "青霉素",
        "reaction": "皮疹、呼吸困难",
        "severity": "严重",
        "notes": "严禁使用青霉素类药物",
        "created_at": datetime(2020, 1, 10, 10, 0, 0)
    }
]

MOCK_VISITS = [
    {
        "id": 1,
        "patient_id": 1,
        "visit_date": datetime(2024, 9, 20, 14, 30, 0),
        "department": "心内科",
        "doctor": "李医生",
        "chief_complaint": "胸闷气短",
        "diagnosis": "高血压病，心律不齐",
        "treatment": "调整降压药物剂量",
        "prescription": "氨氯地平片 5mg 每日一次",
        "follow_up": date(2024, 10, 20),
        "notes": "建议定期监测血压"
    }
]

@router.get("/{patient_id}/medical-history", response_model=List[MedicalHistory], summary="获取病史记录")
async def get_patient_medical_history(
    patient_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取患者病史记录
    """
    try:
        patient = get_patient_by_id(patient_id)
        if not patient:
            raise ResourceNotFoundException(f"患者 ID {patient_id} 不存在")

        # 获取病史记录
        history = [h for h in MOCK_MEDICAL_HISTORY if h["patient_id"] == patient_id]

        logger.info(f"病史记录查询成功: 患者 {patient_id}, 记录数 {len(history)}")

        return [MedicalHistory(**h) for h in history]

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"病史记录查询失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="病史记录查询过程中发生错误"
        )

@router.post("/{patient_id}/medical-history", response_model=MedicalHistory, summary="添加病史记录")
async def add_medical_history(
    patient_id: int,
    history_data: MedicalHistory,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    添加患者病史记录
    """
    try:
        patient = get_patient_by_id(patient_id)
        if not patient:
            raise ResourceNotFoundException(f"患者 ID {patient_id} 不存在")

        # 创建新病史记录
        new_history = {
            "id": len(MOCK_MEDICAL_HISTORY) + 1,
            **history_data.dict(),
            "patient_id": patient_id,
            "created_at": datetime.now()
        }

        MOCK_MEDICAL_HISTORY.append(new_history)

        logger.info(f"病史记录添加成功: 患者 {patient_id}, 疾病 {history_data.disease_name}")

        return MedicalHistory(**new_history)

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"病史记录添加失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="病史记录添加过程中发生错误"
        )

@router.get("/{patient_id}/allergies", response_model=List[AllergyRecord], summary="获取过敏记录")
async def get_patient_allergies(
    patient_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取患者过敏记录
    """
    try:
        patient = get_patient_by_id(patient_id)
        if not patient:
            raise ResourceNotFoundException(f"患者 ID {patient_id} 不存在")

        # 获取过敏记录
        allergies = [a for a in MOCK_ALLERGIES if a["patient_id"] == patient_id]

        logger.info(f"过敏记录查询成功: 患者 {patient_id}, 记录数 {len(allergies)}")

        return [AllergyRecord(**a) for a in allergies]

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"过敏记录查询失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="过敏记录查询过程中发生错误"
        )

@router.post("/{patient_id}/allergies", response_model=AllergyRecord, summary="添加过敏记录")
async def add_allergy_record(
    patient_id: int,
    allergy_data: AllergyRecord,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    添加患者过敏记录
    """
    try:
        patient = get_patient_by_id(patient_id)
        if not patient:
            raise ResourceNotFoundException(f"患者 ID {patient_id} 不存在")

        # 创建新过敏记录
        new_allergy = {
            "id": len(MOCK_ALLERGIES) + 1,
            **allergy_data.dict(),
            "patient_id": patient_id,
            "created_at": datetime.now()
        }

        MOCK_ALLERGIES.append(new_allergy)

        logger.info(f"过敏记录添加成功: 患者 {patient_id}, 过敏原 {allergy_data.allergen}")

        return AllergyRecord(**new_allergy)

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"过敏记录添加失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="过敏记录添加过程中发生错误"
        )

@router.get("/{patient_id}/visits", response_model=List[VisitRecord], summary="获取就诊记录")
async def get_patient_visits(
    patient_id: int,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="每页数量"),
    start_date: Optional[date] = Query(None, description="开始日期"),
    end_date: Optional[date] = Query(None, description="结束日期"),
    department: Optional[str] = Query(None, description="科室筛选"),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取患者就诊记录

    支持分页和筛选功能
    """
    try:
        patient = get_patient_by_id(patient_id)
        if not patient:
            raise ResourceNotFoundException(f"患者 ID {patient_id} 不存在")

        # 获取就诊记录
        visits = [v for v in MOCK_VISITS if v["patient_id"] == patient_id]

        # 日期筛选
        if start_date:
            visits = [v for v in visits if v["visit_date"].date() >= start_date]
        if end_date:
            visits = [v for v in visits if v["visit_date"].date() <= end_date]

        # 科室筛选
        if department:
            visits = [v for v in visits if department.lower() in v["department"].lower()]

        # 分页
        total = len(visits)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        visits = visits[start_idx:end_idx]

        logger.info(f"就诊记录查询成功: 患者 {patient_id}, 记录数 {len(visits)}")

        return [VisitRecord(**v) for v in visits]

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"就诊记录查询失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="就诊记录查询过程中发生错误"
        )

@router.post("/{patient_id}/visits", response_model=VisitRecord, summary="添加就诊记录")
async def add_visit_record(
    patient_id: int,
    visit_data: VisitRecord,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    添加患者就诊记录
    """
    try:
        patient = get_patient_by_id(patient_id)
        if not patient:
            raise ResourceNotFoundException(f"患者 ID {patient_id} 不存在")

        # 创建新就诊记录
        new_visit = {
            "id": len(MOCK_VISITS) + 1,
            **visit_data.dict(),
            "patient_id": patient_id
        }

        MOCK_VISITS.append(new_visit)

        logger.info(f"就诊记录添加成功: 患者 {patient_id}, 科室 {visit_data.department}")

        return VisitRecord(**new_visit)

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"就诊记录添加失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="就诊记录添加过程中发生错误"
        )

# 高级搜索和统计API
@router.get("/search/advanced", response_model=PatientListResponse, summary="高级搜索患者")
async def advanced_search_patients(
    name: Optional[str] = Query(None, description="姓名"),
    patient_id: Optional[str] = Query(None, description="患者ID"),
    phone: Optional[str] = Query(None, description="电话"),
    id_card: Optional[str] = Query(None, description="身份证号"),
    gender: Optional[str] = Query(None, description="性别"),
    age_min: Optional[int] = Query(None, ge=0, le=150, description="最小年龄"),
    age_max: Optional[int] = Query(None, ge=0, le=150, description="最大年龄"),
    has_allergies: Optional[bool] = Query(None, description="是否有过敏史"),
    has_chronic_disease: Optional[bool] = Query(None, description="是否有慢性病"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    高级搜索患者

    支持多条件组合搜索
    """
    try:
        filtered_patients = MOCK_PATIENTS.copy()

        # 基本信息筛选
        if name:
            filtered_patients = [p for p in filtered_patients if name.lower() in p["name"].lower()]

        if patient_id:
            filtered_patients = [p for p in filtered_patients if patient_id.lower() in p["patient_id"].lower()]

        if phone:
            filtered_patients = [p for p in filtered_patients if p["phone"] and phone in p["phone"]]

        if id_card:
            filtered_patients = [p for p in filtered_patients if p["id_card"] and id_card in p["id_card"]]

        if gender:
            filtered_patients = [p for p in filtered_patients if p["gender"] == gender]

        # 年龄筛选
        if age_min is not None:
            filtered_patients = [p for p in filtered_patients if p["age"] >= age_min]

        if age_max is not None:
            filtered_patients = [p for p in filtered_patients if p["age"] <= age_max]

        # 过敏史筛选
        if has_allergies is not None:
            patient_ids_with_allergies = {a["patient_id"] for a in MOCK_ALLERGIES}
            if has_allergies:
                filtered_patients = [p for p in filtered_patients if p["id"] in patient_ids_with_allergies]
            else:
                filtered_patients = [p for p in filtered_patients if p["id"] not in patient_ids_with_allergies]

        # 慢性病筛选
        if has_chronic_disease is not None:
            patient_ids_with_chronic = {h["patient_id"] for h in MOCK_MEDICAL_HISTORY if h["status"] == "慢性病"}
            if has_chronic_disease:
                filtered_patients = [p for p in filtered_patients if p["id"] in patient_ids_with_chronic]
            else:
                filtered_patients = [p for p in filtered_patients if p["id"] not in patient_ids_with_chronic]

        # 分页
        total = len(filtered_patients)
        total_pages = (total + page_size - 1) // page_size
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        patients = filtered_patients[start_idx:end_idx]

        logger.info(f"高级搜索完成: 总数 {total}, 页码 {page}/{total_pages}")

        return PatientListResponse(
            patients=[PatientResponse(**p) for p in patients],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except Exception as e:
        logger.error(f"高级搜索失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="高级搜索过程中发生错误"
        )


