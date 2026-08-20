"""Read model required by the offline dataset export use case."""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.application.dto import DatasetExportCandidate


class DatasetExportRepository(Protocol):
    def find_candidates(
        self,
        *,
        filenames: list[str],
        exam_type: str,
    ) -> list[DatasetExportCandidate]: ...
