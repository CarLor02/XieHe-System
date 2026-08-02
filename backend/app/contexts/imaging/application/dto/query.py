"""影像查询用例的输入条件和只读结果。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

from app.contexts.imaging.domain import JsonObject


@dataclass(frozen=True, slots=True)
class ImageListFilters:
    file_type: str | None = None
    file_status: str | None = None
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    search: str | None = None
    uploaded_by: int | None = None
    patient_id: int | None = None
    team_ids: tuple[int, ...] = ()


@dataclass(frozen=True, slots=True)
class ImageSummary:
    id: int
    file_uuid: str
    original_filename: str
    file_type: str
    mime_type: str | None
    file_size: int
    storage_bucket: str
    object_key: str
    storage_etag: str | None
    thumbnail_path: str | None
    uploaded_by: int
    uploader_name: str | None
    patient_id: int | None
    patient_name: str | None
    patient_identifier: str | None
    team_ids: list[int]
    team_names: list[str]
    study_date: datetime | None
    description: str | None
    status: str
    upload_progress: int
    created_at: datetime
    uploaded_at: datetime | None
    has_annotation: bool


@dataclass(frozen=True, slots=True)
class ImageDetail:
    summary: ImageSummary
    patient_gender: str | None
    patient_age: int | None
    annotation: JsonObject | None
    annotation_version: int
    annotation_created_at: datetime | None
    annotation_created_by: int | None
    annotation_updated_at: datetime | None
    annotation_updated_by: int | None


@dataclass(frozen=True, slots=True)
class AnnotationBatchItem:
    id: int
    annotation: JsonObject | None
    annotation_version: int


@dataclass(frozen=True, slots=True)
class AnnotationHistoryItem:
    version: int
    source: str
    reason: str
    actor_id: int | None
    created_at: datetime
    event_count: int


@dataclass(frozen=True, slots=True)
class AnnotationEventItem:
    item_kind: str
    item_id: str
    action: str
    before_payload: JsonObject | None
    after_payload: JsonObject | None


@dataclass(frozen=True, slots=True)
class AnnotationHistoryVersion:
    version: int
    snapshot: JsonObject
    source: str
    reason: str
    actor_id: int | None
    created_at: datetime
    events: list[AnnotationEventItem]


@dataclass(frozen=True, slots=True)
class ImageStatistics:
    total_files: int
    total_size: int
    by_type: dict[str, int]
    by_status: dict[str, int]


@dataclass(frozen=True, slots=True)
class DashboardImageCounts:
    total: int
    today: int
    week: int
    pending: int
    processed: int


@dataclass(frozen=True, slots=True)
class RecentImage:
    id: int
    original_filename: str
    created_at: datetime
    status: str
