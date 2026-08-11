from app.contexts.teams.interface import router
from app.contexts.teams.interface.http.v1.schemas import TeamSummary


def test_team_summary_preserves_current_user_membership_fields() -> None:
    summary = TeamSummary(
        id=35,
        name="testTEAM",
        member_count=2,
        max_members=10,
        is_member=True,
        my_role="ADMIN",
        my_status="ACTIVE",
        is_creator=False,
    )

    payload = summary.dict()

    assert payload["my_role"] == "ADMIN"
    assert payload["my_status"] == "ACTIVE"
    assert payload["is_creator"] is False


def test_team_routes_preserve_public_paths() -> None:
    paths = {route.path for route in router.routes}

    assert paths == {
        "/permissions/teams",
        "/permissions/teams/{team_id}",
        "/permissions/teams/search",
        "/permissions/teams/my",
        "/permissions/teams/{team_id}/apply",
        "/permissions/teams/{team_id}/join-requests",
        "/permissions/teams/{team_id}/join-requests/{request_id}/review",
        "/permissions/teams/{team_id}/join-requests/{request_id}",
        "/permissions/teams/{team_id}/members",
        "/permissions/teams/{team_id}/members/{user_id}/role",
        "/permissions/teams/{team_id}/members/{user_id}",
        "/permissions/teams/{team_id}/invite",
        "/permissions/invitations/my",
        "/permissions/invitations/{invitation_id}/respond",
    }
