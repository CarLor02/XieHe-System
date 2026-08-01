"""Patient-domain failures independent from FastAPI and SQLAlchemy."""


class PatientDomainError(Exception):
    """Base class for expected patient business failures."""


class PatientNotFound(PatientDomainError):
    def __init__(self, patient_id: int) -> None:
        self.patient_id = patient_id
        super().__init__(f"患者 ID {patient_id} 不存在")


class DuplicatePatientId(PatientDomainError):
    def __init__(self, patient_id: str) -> None:
        self.patient_id = patient_id
        super().__init__(f"患者ID {patient_id} 已存在")
