"""Patient query values and read snapshots."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, datetime
from typing import Any


@dataclass(frozen=True, slots=True)
class PatientListQuery:
    page: int = 1
    page_size: int = 20
    search: str | None = None
    gender: str | None = None
    age_min: int | None = None
    age_max: int | None = None
    status: str | None = None
    has_images: bool | None = None
    sort_by: str = "created_at"
    sort_order: str = "desc"

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    def cache_parameters(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class PatientSnapshot:
    id: int
    patient_id: str
    name: str
    gender: str
    birth_date: date | None
    age: int | None
    phone: str | None
    email: str | None
    address: str | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    id_card: str | None
    insurance_number: str | None
    status: str
    created_at: datetime
    updated_at: datetime | None

    def to_json_dict(self) -> dict[str, Any]:
        """Return a JSON-native representation accepted by the interface schema."""

        result = asdict(self)
        result["birth_date"] = self.birth_date.isoformat() if self.birth_date else None
        result["created_at"] = self.created_at.isoformat()
        result["updated_at"] = self.updated_at.isoformat() if self.updated_at else None
        return result
