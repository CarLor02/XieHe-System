"""Async persistence adapter for patient archive read models."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.patient import (
    Patient,
    PatientAllergy,
    PatientMedicalHistory,
    PatientVisit,
    SeverityEnum,
)


def _enum_value(value):
    return value.value if value is not None else None


def _iso(value):
    return value.isoformat() if value is not None else None


class SqlAlchemyPatientArchiveRepository:
    """Build JSON-native archive projections from normalized patient tables."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _patient(self, patient_id: int) -> Patient | None:
        return await self._session.scalar(
            select(Patient).where(Patient.id == patient_id, Patient.is_deleted.is_(False))
        )

    async def get_summary(self, patient_id: int) -> dict[str, Any] | None:
        patient = await self._patient(patient_id)
        if patient is None:
            return None
        total_visits, last_visit = (
            await self._session.execute(
                select(func.count(PatientVisit.id), func.max(PatientVisit.visit_date)).where(
                    PatientVisit.patient_id == patient_id,
                    PatientVisit.is_deleted.is_(False),
                )
            )
        ).one()
        total_allergies, active_allergies = (
            await self._session.execute(
                select(
                    func.count(PatientAllergy.id),
                    func.sum(func.if_(PatientAllergy.is_active.is_(True), 1, 0)),
                ).where(
                    PatientAllergy.patient_id == patient_id,
                    PatientAllergy.is_deleted.is_(False),
                )
            )
        ).one()
        total_history, chronic, high_risk = (
            await self._session.execute(
                select(
                    func.count(PatientMedicalHistory.id),
                    func.sum(func.if_(PatientMedicalHistory.is_chronic.is_(True), 1, 0)),
                    func.sum(
                        func.if_(
                            PatientMedicalHistory.severity.in_(
                                [SeverityEnum.SEVERE, SeverityEnum.CRITICAL]
                            ),
                            1,
                            0,
                        )
                    ),
                ).where(
                    PatientMedicalHistory.patient_id == patient_id,
                    PatientMedicalHistory.is_deleted.is_(False),
                )
            )
        ).one()
        return {
            "patient_id": patient.id,
            "patient_name": patient.name,
            "total_visits": int(total_visits or 0),
            "last_visit_date": _iso(last_visit),
            "total_allergies": int(total_allergies or 0),
            "active_allergies": int(active_allergies or 0),
            "total_medical_history": int(total_history or 0),
            "chronic_conditions": int(chronic or 0),
            "high_risk_conditions": int(high_risk or 0),
        }

    async def get_full_archive(self, patient_id: int) -> dict[str, Any] | None:
        patient = await self._patient(patient_id)
        if patient is None:
            return None
        visits = (
            await self._session.scalars(
                select(PatientVisit)
                .where(PatientVisit.patient_id == patient_id, PatientVisit.is_deleted.is_(False))
                .order_by(PatientVisit.visit_date.desc())
            )
        ).all()
        allergies = (
            await self._session.scalars(
                select(PatientAllergy)
                .where(
                    PatientAllergy.patient_id == patient_id,
                    PatientAllergy.is_deleted.is_(False),
                )
                .order_by(PatientAllergy.created_at.desc())
            )
        ).all()
        history = (
            await self._session.scalars(
                select(PatientMedicalHistory)
                .where(
                    PatientMedicalHistory.patient_id == patient_id,
                    PatientMedicalHistory.is_deleted.is_(False),
                )
                .order_by(PatientMedicalHistory.onset_date.desc())
            )
        ).all()
        return {
            "patient": {
                "id": patient.id,
                "patient_id": patient.patient_id,
                "name": patient.name,
                "gender": _enum_value(patient.gender),
                "birth_date": _iso(patient.birth_date),
                "age": patient.age,
                "phone": patient.phone,
                "email": patient.email,
            },
            "visits": [
                {
                    "id": item.id,
                    "visit_number": item.visit_number,
                    "visit_type": _enum_value(item.visit_type),
                    "visit_date": _iso(item.visit_date),
                    "chief_complaint": item.chief_complaint,
                    "diagnosis_preliminary": item.diagnosis_preliminary,
                    "diagnosis_final": item.diagnosis_final,
                    "treatment_plan": item.treatment_plan,
                    "notes": item.notes,
                }
                for item in visits
            ],
            "allergies": [
                {
                    "id": item.id,
                    "allergen": item.allergen,
                    "allergen_type": item.allergen_type,
                    "reaction": item.reaction,
                    "severity": _enum_value(item.severity),
                    "is_active": item.is_active,
                    "verified": item.verified,
                    "notes": item.notes,
                }
                for item in allergies
            ],
            "medical_history": [
                {
                    "id": item.id,
                    "condition": item.condition,
                    "condition_code": item.condition_code,
                    "category": item.category,
                    "onset_date": _iso(item.onset_date),
                    "resolution_date": _iso(item.resolution_date),
                    "is_chronic": item.is_chronic,
                    "is_hereditary": item.is_hereditary,
                    "severity": _enum_value(item.severity),
                    "notes": item.notes,
                }
                for item in history
            ],
        }
