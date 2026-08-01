"""Async SQLAlchemy implementation of patient persistence ports."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import Select, exists, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.patients.domain import (
    DuplicatePatientId,
    PatientGender,
    PatientListQuery,
    PatientSnapshot,
    calculate_age,
    gender_from_input,
    gender_to_display,
)
from app.models.image_file import ImageFile
from app.models.patient import GenderEnum, Patient, PatientStatusEnum


def _birth_date_for_age(years: int, *, extra_year: int = 0) -> date:
    today = date.today()
    target_year = today.year - years - extra_year
    try:
        return date(target_year, today.month, today.day)
    except ValueError:
        return date(target_year, 2, 28)


def _snapshot(patient: Patient) -> PatientSnapshot:
    return PatientSnapshot(
        id=patient.id,
        patient_id=patient.patient_id,
        name=patient.name,
        gender=gender_to_display(PatientGender(patient.gender.value)),
        birth_date=patient.birth_date,
        age=patient.age,
        phone=patient.phone,
        email=patient.email,
        address=patient.address,
        emergency_contact_name=patient.emergency_contact_name,
        emergency_contact_phone=patient.emergency_contact_phone,
        id_card=patient.id_card,
        insurance_number=patient.insurance_number,
        status=patient.status.value,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
    )


class SqlAlchemyPatientRepository:
    """Persist the patient aggregate using one request-scoped AsyncSession."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    @staticmethod
    def _filtered_statement(query: PatientListQuery) -> Select[tuple[Patient]]:
        statement = select(Patient).where(Patient.is_deleted.is_(False))
        if query.search:
            pattern = f"%{query.search}%"
            statement = statement.where(
                or_(
                    Patient.name.like(pattern),
                    Patient.patient_id.like(pattern),
                    Patient.phone.like(pattern),
                )
            )
        if query.gender:
            statement = statement.where(
                Patient.gender == GenderEnum(gender_from_input(query.gender).value)
            )
        if query.age_min is not None:
            statement = statement.where(
                Patient.birth_date <= _birth_date_for_age(query.age_min)
            )
        if query.age_max is not None:
            statement = statement.where(
                Patient.birth_date
                >= _birth_date_for_age(query.age_max, extra_year=1)
            )
        if query.status:
            status_map = {
                "active": PatientStatusEnum.ACTIVE,
                "inactive": PatientStatusEnum.INACTIVE,
            }
            if status_value := status_map.get(query.status.lower()):
                statement = statement.where(Patient.status == status_value)
        if query.has_images is not None:
            image_exists = exists().where(
                ImageFile.patient_id == Patient.id,
                ImageFile.is_deleted.is_(False),
            )
            statement = statement.where(image_exists if query.has_images else ~image_exists)
        return statement

    async def list(self, query: PatientListQuery) -> tuple[list[PatientSnapshot], int]:
        filtered = self._filtered_statement(query)
        count_statement = filtered.with_only_columns(
            func.count(Patient.id),
            maintain_column_froms=True,
        ).order_by(None)
        total = int(await self._session.scalar(count_statement) or 0)
        sort_columns = {
            "name": Patient.name,
            "age": Patient.age,
            "created_at": Patient.created_at,
        }
        sort_column = sort_columns.get(query.sort_by, Patient.created_at)
        order = sort_column.asc() if query.sort_order == "asc" else sort_column.desc()
        result = await self._session.scalars(
            filtered.order_by(order, Patient.id.desc())
            .offset(query.offset)
            .limit(query.page_size)
        )
        return [_snapshot(patient) for patient in result.all()], total

    async def get(self, patient_id: int) -> PatientSnapshot | None:
        patient = await self._session.scalar(
            select(Patient).where(
                Patient.id == patient_id,
                Patient.is_deleted.is_(False),
            )
        )
        return _snapshot(patient) if patient else None

    async def create(self, data: dict[str, Any], *, actor_id: int | None) -> PatientSnapshot:
        external_id = str(data["patient_id"])
        duplicate = await self._session.scalar(
            select(Patient.id).where(
                Patient.patient_id == external_id,
                Patient.is_deleted.is_(False),
            )
        )
        if duplicate is not None:
            raise DuplicatePatientId(external_id)

        patient = Patient(
            **self._normalize_write_data(data),
            status=PatientStatusEnum.ACTIVE,
            created_by=actor_id,
        )
        self._session.add(patient)
        try:
            await self._session.commit()
            await self._session.refresh(patient)
        except IntegrityError as exc:
            await self._session.rollback()
            raise DuplicatePatientId(external_id) from exc
        return _snapshot(patient)

    async def update(
        self,
        patient_id: int,
        data: dict[str, Any],
        *,
        actor_id: int | None,
    ) -> PatientSnapshot | None:
        patient = await self._session.scalar(
            select(Patient).where(
                Patient.id == patient_id,
                Patient.is_deleted.is_(False),
            )
        )
        if patient is None:
            return None
        normalized = self._normalize_write_data(data)
        for field, value in normalized.items():
            setattr(patient, field, value)
        patient.updated_by = actor_id
        patient.updated_at = datetime.now()
        await self._session.commit()
        await self._session.refresh(patient)
        return _snapshot(patient)

    async def soft_delete(self, patient_id: int, *, actor_id: int | None) -> bool:
        patient = await self._session.scalar(
            select(Patient).where(
                Patient.id == patient_id,
                Patient.is_deleted.is_(False),
            )
        )
        if patient is None:
            return False
        patient.is_deleted = True
        patient.deleted_at = datetime.now()
        patient.deleted_by = actor_id
        patient.updated_by = actor_id
        patient.updated_at = datetime.now()
        await self._session.commit()
        return True

    @staticmethod
    def _normalize_write_data(data: dict[str, Any]) -> dict[str, Any]:
        normalized = dict(data)
        if "gender" in normalized:
            normalized["gender"] = GenderEnum(
                gender_from_input(normalized["gender"]).value
            )
        if "birth_date" in normalized:
            normalized["age"] = calculate_age(normalized["birth_date"])
        return normalized
