"""FastAPI dependency assembly for patient HTTP v1."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.patients.application import PatientApplicationService
from app.contexts.patients.infrastructure import SqlAlchemyPatientRepository
from app.shared.database import get_async_db


def get_patient_service(
    session: AsyncSession = Depends(get_async_db),
) -> PatientApplicationService:
    return PatientApplicationService(SqlAlchemyPatientRepository(session))
