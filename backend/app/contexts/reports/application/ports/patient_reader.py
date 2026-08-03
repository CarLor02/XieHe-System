"""Patient read port used by report use cases."""

from typing import Protocol


class ReportPatientReader(Protocol):
    def get_active_name(self, patient_id: int) -> str | None: ...
