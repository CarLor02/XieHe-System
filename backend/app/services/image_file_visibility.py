"""Image file visibility helpers shared by API handlers."""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import and_, exists, false, or_
from sqlalchemy.orm import Query, Session

from app.models.image_file import ImageFile, ImageFileTeamVisibility
from app.models.team import Team, TeamMembership, TeamMembershipRole, TeamMembershipStatus


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

    `None` means unrestricted visibility for superusers/system admins.
    """

    if current_user.get("is_superuser", False) or current_user.get(
        "is_system_admin",
        False,
    ):
        return None

    user_id = _extract_user_id(current_user)
    if user_id is None:
        return []

    visibility_filter = build_image_visibility_filter(db, current_user)
    if visibility_filter is None:
        query = db.query(ImageFile.uploaded_by)
    else:
        query = db.query(ImageFile.uploaded_by).filter(visibility_filter)

    uploader_ids = [
        uploader_id
        for (uploader_id,) in query.filter(ImageFile.is_deleted == False).distinct().all()
    ]
    return sorted(uploader_ids)


def build_image_visibility_filter(db: Session, current_user: dict[str, Any]):
    """Build a SQLAlchemy filter condition for visible image files."""

    if current_user.get("is_superuser", False) or current_user.get(
        "is_system_admin",
        False,
    ):
        return None

    user_id = _extract_user_id(current_user)
    if user_id is None:
        return false()

    team_admin_visibility = exists().where(
        and_(
            ImageFileTeamVisibility.image_file_id == ImageFile.id,
            ImageFileTeamVisibility.team_id == TeamMembership.team_id,
            TeamMembership.user_id == user_id,
            TeamMembership.role == TeamMembershipRole.ADMIN,
            TeamMembership.status == TeamMembershipStatus.ACTIVE,
        )
    )

    return or_(
        ImageFile.uploaded_by == user_id,
        team_admin_visibility,
    )


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


def normalize_team_ids(team_ids: list[int] | None) -> list[int]:
    """Return stable, positive, unique team ids."""

    if not team_ids:
        return []
    return sorted({int(team_id) for team_id in team_ids if int(team_id) > 0})


def validate_assignable_team_ids(
    db: Session,
    current_user: dict[str, Any],
    team_ids: list[int] | None,
) -> list[int]:
    """Validate that the current user can assign image visibility to teams."""

    normalized_ids = normalize_team_ids(team_ids)
    if not normalized_ids:
        return []

    query = db.query(Team.id).filter(Team.id.in_(normalized_ids), Team.is_active.is_(True))

    if not (
        current_user.get("is_superuser", False)
        or current_user.get("is_system_admin", False)
    ):
        user_id = _extract_user_id(current_user)
        if user_id is None:
            raise PermissionError("无权设置影像团队归属")
        query = query.join(TeamMembership, TeamMembership.team_id == Team.id).filter(
            TeamMembership.user_id == user_id,
            TeamMembership.status == TeamMembershipStatus.ACTIVE,
        )

    allowed_ids = {team_id for (team_id,) in query.distinct().all()}
    missing_ids = [team_id for team_id in normalized_ids if team_id not in allowed_ids]
    if missing_ids:
        raise PermissionError("无权设置影像团队归属")

    return normalized_ids


def replace_image_team_visibility(
    db: Session,
    image: ImageFile,
    team_ids: list[int],
) -> None:
    """Replace team visibility rows for an image."""

    image.team_visibilities = [
        ImageFileTeamVisibility(image_file_id=image.id, team_id=team_id)
        for team_id in team_ids
    ]
