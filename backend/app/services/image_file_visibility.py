"""Image file visibility helpers shared by API handlers."""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import false
from sqlalchemy.orm import Query, Session

from app.models.image_file import ImageFile
from app.models.team import TeamMembership, TeamMembershipRole, TeamMembershipStatus


def _extract_user_id(current_user: dict[str, Any]) -> Optional[int]:
    """Return the current user id as an int when possible."""

    value = current_user.get("id") or current_user.get("user_id")
    if value is None:
        return None

    if isinstance(value, int):
        return value

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def get_visible_image_uploader_ids(
    db: Session,
    current_user: dict[str, Any],
) -> Optional[list[int]]:
    """
    Return uploader ids visible to the user.

    `None` means unrestricted visibility for superusers.
    """

    if current_user.get("is_superuser", False):
        return None

    user_id = _extract_user_id(current_user)
    if user_id is None:
        return []

    admin_team_ids = [
        team_id
        for (team_id,) in db.query(TeamMembership.team_id)
        .filter(
            TeamMembership.user_id == user_id,
            TeamMembership.role == TeamMembershipRole.ADMIN,
            TeamMembership.status == TeamMembershipStatus.ACTIVE,
        )
        .all()
    ]

    if not admin_team_ids:
        return [user_id]

    member_ids = [
        member_id
        for (member_id,) in db.query(TeamMembership.user_id)
        .filter(
            TeamMembership.team_id.in_(admin_team_ids),
            TeamMembership.status == TeamMembershipStatus.ACTIVE,
        )
        .distinct()
        .all()
    ]

    return sorted({user_id, *member_ids})


def build_image_visibility_filter(db: Session, current_user: dict[str, Any]):
    """Build a SQLAlchemy filter condition for visible image files."""

    visible_uploader_ids = get_visible_image_uploader_ids(db, current_user)
    if visible_uploader_ids is None:
        return None

    if not visible_uploader_ids:
        return false()

    return ImageFile.uploaded_by.in_(visible_uploader_ids)


def apply_image_visibility_filter(
    query: Query,
    db: Session,
    current_user: dict[str, Any],
) -> Query:
    """Apply the shared image visibility filter to an ImageFile query."""

    visibility_filter = build_image_visibility_filter(db, current_user)
    if visibility_filter is None:
        return query

    return query.filter(visibility_filter)


def get_visible_image_file(
    db: Session,
    file_id: int,
    current_user: dict[str, Any],
) -> Optional[ImageFile]:
    """Return a non-deleted image file only when it is visible to the user."""

    query = db.query(ImageFile).filter(
        ImageFile.id == file_id,
        ImageFile.is_deleted == False,
    )
    return apply_image_visibility_filter(query, db, current_user).first()
