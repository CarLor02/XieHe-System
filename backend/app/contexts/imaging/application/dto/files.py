"""影像文件操作和选择器 DTO。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from .query import ImageDetail


@dataclass(frozen=True, slots=True)
class ImageUploader:
    id: int
    username: str
    email: str | None
    real_name: str | None
    department: str | None
    position: str | None
    title: str | None
    is_system_admin: bool
    system_admin_level: int


@dataclass(frozen=True, slots=True)
class AssignableTeam:
    id: int
    name: str
    description: str | None
    hospital: str | None
    department: str | None
    creator_name: str | None
    member_count: int
    max_members: int
    is_member: bool
    my_role: str | None
    my_status: str | None
    is_creator: bool
    join_status: str | None
    join_request_id: int | None
    created_at: datetime


@dataclass(frozen=True, slots=True)
class DownloadUrl:
    url: str
    expires_in: int
    expires_at: str
    filename: str
    mime_type: str | None
    etag: str | None


@dataclass(frozen=True, slots=True)
class DownloadError:
    code: str
    message: str


@dataclass(frozen=True, slots=True)
class BatchDownloadUrls:
    items: dict[int, DownloadUrl]
    errors: dict[int, DownloadError]


@dataclass(frozen=True, slots=True)
class ImageInfoUpdate:
    description: str | None
    team_ids: list[int] | None


@dataclass(frozen=True, slots=True)
class ImageContentReplacement:
    filename: str
    content_type: str
    content: bytes
    description: str | None
    team_ids: list[int] | None


@dataclass(frozen=True, slots=True)
class ImageMutationResult:
    image: ImageDetail
    warning: str | None = None


@dataclass(frozen=True, slots=True)
class BatchExamTypeMutationResult:
    updated_ids: tuple[int, ...]
    unchanged_ids: tuple[int, ...]
    exam_type: str
