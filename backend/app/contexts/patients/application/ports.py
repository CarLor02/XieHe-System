"""Infrastructure ports required by patient application flows."""

from __future__ import annotations

from typing import Any, Protocol

from app.contexts.patients.domain import PatientListQuery, PatientSnapshot


class PatientRepository(Protocol):
    async def list(
        self, query: PatientListQuery
    ) -> tuple[list[PatientSnapshot], int]: ...

    async def get(self, patient_id: int) -> PatientSnapshot | None: ...

    async def create(
        self, data: dict[str, Any], *, actor_id: int | None
    ) -> PatientSnapshot: ...

    async def update(
        self,
        patient_id: int,
        data: dict[str, Any],
        *,
        actor_id: int | None,
    ) -> PatientSnapshot | None: ...

    async def soft_delete(self, patient_id: int, *, actor_id: int | None) -> bool: ...


class PatientArchiveRepository(Protocol):
    """Read-only archive port; its HTTP routes remain intentionally unmounted."""

    async def get_summary(self, patient_id: int) -> dict[str, Any] | None: ...

    async def get_full_archive(self, patient_id: int) -> dict[str, Any] | None: ...
