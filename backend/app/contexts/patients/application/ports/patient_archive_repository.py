"""Read-model port for the patient archive use cases."""

from __future__ import annotations

from typing import Any, Protocol


class PatientArchiveRepository(Protocol):
    """Read-only archive port; its HTTP routes remain intentionally unmounted."""

    async def get_summary(self, patient_id: int) -> dict[str, Any] | None: ...

    async def get_full_archive(self, patient_id: int) -> dict[str, Any] | None: ...
