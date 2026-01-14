# backend/app/db/dao/patient_dao.py
from sqlalchemy.orm import Session
from app.models.patient import Patient

class PatientDAO:
    @staticmethod
    def query(db: Session):
        return db.query(Patient)