"""Read model required by the offline dataset export use case."""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.application.dto import DatasetExportCandidate


class DatasetExportRepository(Protocol):
    def find_active_team_ids_by_exact_name(self, team_name: str) -> list[int]: ...

    def find_candidates(
        self,
        *,
        filenames: list[str],
        exam_type: str,
        team_id: int | None,
    ) -> list[DatasetExportCandidate]: ...
