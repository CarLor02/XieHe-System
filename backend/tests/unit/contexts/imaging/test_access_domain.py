import pytest

from app.contexts.imaging.domain import (
    ImageAccessActor,
    ImageAccessScope,
    ImageAccessTarget,
    ImageTeamAssignmentDeniedError,
    build_image_access_scope,
    can_choose_image_uploader,
    can_modify_image,
    can_view_image,
    normalize_team_ids,
    require_all_teams_assignable,
)


def test_unrestricted_actor_can_access_any_image() -> None:
    scope = build_image_access_scope(
        ImageAccessActor(user_id=99, unrestricted=True),
        set(),
    )
    target = ImageAccessTarget(uploader_id=10, team_ids=frozenset())

    assert can_view_image(scope, target)
    assert can_modify_image(scope, target)
    assert can_choose_image_uploader(scope)


def test_owner_can_access_personal_image() -> None:
    scope = ImageAccessScope(11, False, frozenset())
    target = ImageAccessTarget(uploader_id=11, team_ids=frozenset())

    assert can_view_image(scope, target)
    assert can_modify_image(scope, target)
    assert not can_choose_image_uploader(scope)


def test_team_admin_requires_explicit_image_team_assignment() -> None:
    scope = ImageAccessScope(10, False, frozenset({1}))

    assert can_view_image(
        scope,
        ImageAccessTarget(uploader_id=11, team_ids=frozenset({1})),
    )
    assert not can_view_image(
        scope,
        ImageAccessTarget(uploader_id=11, team_ids=frozenset()),
    )
    assert can_choose_image_uploader(scope)


def test_invalid_actor_has_no_image_access() -> None:
    scope = ImageAccessScope(None, False, frozenset())

    assert not can_view_image(
        scope,
        ImageAccessTarget(uploader_id=11, team_ids=frozenset({1})),
    )


def test_team_assignment_normalizes_and_requires_complete_allowed_set() -> None:
    normalized = normalize_team_ids([3, 1, 3, 0, -1])

    assert normalized == [1, 3]
    require_all_teams_assignable(normalized, {1, 3, 4})
    with pytest.raises(ImageTeamAssignmentDeniedError):
        require_all_teams_assignable(normalized, {1})
