"""Persistence-neutral values used by the offline dataset export."""

from __future__ import annotations

from dataclasses import dataclass

from app.contexts.imaging.domain import JsonObject


@dataclass(frozen=True, slots=True)
class DatasetExportCandidate:
    image_file_id: int
    original_filename: str
    description: str | None
    storage_bucket: str
    object_key: str
    file_size: int
    patient_identifier: str | None
    annotation: JsonObject | None


@dataclass(frozen=True, slots=True)
class DatasetExportItemResult:
    row_number: int
    requested_filename: str
    image_file_id: int | None
    patient_identifier: str | None
    candidate_count: int
    candidate_ids: tuple[int, ...]
    exam_type: str | None
    output_path: str | None
    keypoint_count: int
    measurement_coverage: int
    status: str
    detail: str


@dataclass(frozen=True, slots=True)
class DatasetExportSummary:
    requested: int
    succeeded: int
    empty_annotations: int
    not_found: int
    duplicate_overwrites: int
    object_missing: int
    failed: int


@dataclass(frozen=True, slots=True)
class DatasetExportRunResult:
    summary: DatasetExportSummary
    items: tuple[DatasetExportItemResult, ...]

    @property
    def has_failures(self) -> bool:
        return self.summary.failed > 0
