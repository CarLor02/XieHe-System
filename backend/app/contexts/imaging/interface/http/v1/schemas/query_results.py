"""HTTP 返回模型；与应用 DTO 分离，固定对外字段及 JSON 类型。"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, JsonValue

from app.contexts.teams.domain import MembershipStatus, TeamRole


class AnnotationHistoryItemResult(BaseModel):
    version: int
    source: str
    reason: str
    actor_id: int | None
    created_at: datetime
    event_count: int


class AnnotationEventItemResult(BaseModel):
    item_kind: str
    item_id: str
    action: str
    before_payload: dict[str, JsonValue] | None
    after_payload: dict[str, JsonValue] | None


class AnnotationHistoryVersionResult(BaseModel):
    version: int
    snapshot: dict[str, JsonValue]
    source: str
    reason: str
    actor_id: int | None
    created_at: datetime
    events: list[AnnotationEventItemResult]


class ImageStatisticsResult(BaseModel):
    total_files: int
    total_size: int
    by_type: dict[str, int]
    by_status: dict[str, int]


class ImageUploaderResult(BaseModel):
    id: int
    username: str
    email: str | None
    real_name: str | None
    department: str | None
    position: str | None
    title: str | None
    is_system_admin: bool
    system_admin_level: int


class AssignableTeamResult(BaseModel):
    id: int
    name: str
    description: str | None
    hospital: str | None
    department: str | None
    creator_name: str | None
    member_count: int
    max_members: int
    is_member: bool
    my_role: TeamRole | None
    my_status: MembershipStatus | None
    is_creator: bool
    join_status: str | None
    join_request_id: int | None
    created_at: datetime
