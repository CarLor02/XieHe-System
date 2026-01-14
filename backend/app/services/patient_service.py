# backend/app/services/patient_service.py
from typing import Optional, List
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.dao.patient_dao import PatientDAO
from app.models.patient import Patient, GenderEnum, PatientStatusEnum

class PatientService:
    @staticmethod
    def list_patients(
        db: Session,
        *,
        search: Optional[str] = None,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        gender: Optional[str] = None,
        age_min: Optional[int] = None,
        age_max: Optional[int] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Patient]:
        q = PatientDAO.query(db).filter(Patient.is_deleted == False)
        
        # 搜索筛选
        if search:
            q = q.filter(
                or_(
                    Patient.name.contains(search),
                    Patient.patient_id.contains(search),
                    Patient.phone.contains(search)
                )
            )
        if name:
            q = q.filter(Patient.name.contains(name))
        if phone:
            q = q.filter(Patient.phone.contains(phone))
        if gender:
            # 转换性别字符串为枚举
            gender_map = {
                "男": GenderEnum.MALE,
                "女": GenderEnum.FEMALE,
                "其他": GenderEnum.OTHER,
                "未知": GenderEnum.UNKNOWN,
                "male": GenderEnum.MALE,
                "female": GenderEnum.FEMALE,
                "other": GenderEnum.OTHER,
                "unknown": GenderEnum.UNKNOWN
            }
            gender_enum = gender_map.get(gender, GenderEnum.UNKNOWN)
            q = q.filter(Patient.gender == gender_enum)
        if status:
            if status == "active":
                q = q.filter(Patient.status == PatientStatusEnum.ACTIVE)
            elif status == "inactive":
                q = q.filter(Patient.status == PatientStatusEnum.INACTIVE)

        # 年龄区间 → 出生日期反向推算
        today = date.today()
        if age_min is not None:
            # 最小年龄：出生日期应该 <= (今天 - age_min年)
            try:
                dob_max = date(today.year - age_min, today.month, today.day)
            except ValueError:
                # 如果不是有效日期（如2月29日），则使用2月28日
                dob_max = date(today.year - age_min, 2, 28)
            q = q.filter(Patient.birth_date <= dob_max)
        if age_max is not None:
            # 最大年龄：出生日期应该 >= (今天 - age_max - 1年)
            # 例如：如果age_max=20，那么出生日期应该 >= (今天 - 21年)，这样年龄 <= 20
            try:
                dob_min = date(today.year - age_max - 1, today.month, today.day)
            except ValueError:
                # 如果不是有效日期（如2月29日），则使用2月28日
                dob_min = date(today.year - age_max - 1, 2, 28)
            q = q.filter(Patient.birth_date >= dob_min)

        return q.order_by(Patient.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def count_patients(
        db: Session,
        *,
        search: Optional[str] = None,
        gender: Optional[str] = None,
        age_min: Optional[int] = None,
        age_max: Optional[int] = None,
        status: Optional[str] = None,
    ) -> int:
        q = PatientDAO.query(db).filter(Patient.is_deleted == False)
        if search:
            q = q.filter(
                or_(
                    Patient.name.contains(search),
                    Patient.patient_id.contains(search),
                    Patient.phone.contains(search)
                )
            )
        if gender:
            # 转换性别字符串为枚举
            gender_map = {
                "男": GenderEnum.MALE,
                "女": GenderEnum.FEMALE,
                "其他": GenderEnum.OTHER,
                "未知": GenderEnum.UNKNOWN,
                "male": GenderEnum.MALE,
                "female": GenderEnum.FEMALE,
                "other": GenderEnum.OTHER,
                "unknown": GenderEnum.UNKNOWN
            }
            gender_enum = gender_map.get(gender, GenderEnum.UNKNOWN)
            q = q.filter(Patient.gender == gender_enum)
        if age_min is not None:
            # 最小年龄：出生日期应该 <= (今天 - age_min年)
            today = date.today()
            try:
                dob_max = date(today.year - age_min, today.month, today.day)
            except ValueError:
                # 如果不是有效日期（如2月29日），则使用2月28日
                dob_max = date(today.year - age_min, 2, 28)
            q = q.filter(Patient.birth_date <= dob_max)
        if age_max is not None:
            # 最大年龄：出生日期应该 >= (今天 - age_max - 1年)
            today = date.today()
            try:
                dob_min = date(today.year - age_max - 1, today.month, today.day)
            except ValueError:
                # 如果不是有效日期（如2月29日），则使用2月28日
                dob_min = date(today.year - age_max - 1, 2, 28)
            q = q.filter(Patient.birth_date >= dob_min)
        if status:
            if status == "active":
                q = q.filter(Patient.status == PatientStatusEnum.ACTIVE)
            elif status == "inactive":
                q = q.filter(Patient.status == PatientStatusEnum.INACTIVE)
        return q.count()