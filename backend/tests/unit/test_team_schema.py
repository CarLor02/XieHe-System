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


def test_team_routes_use_post_operations() -> None:
    paths = {route.path for route in router.routes}
    assert all(route.methods == {"POST"} for route in router.routes)

    assert paths == {
        "/permissions/teams/create",
        "/permissions/teams/update",
        "/permissions/teams/search",
        "/permissions/teams/my",
        "/permissions/teams/apply",
        "/permissions/teams/join-requests/list",
        "/permissions/teams/join-requests/review",
        "/permissions/teams/join-requests/cancel",
        "/permissions/teams/members/list",
        "/permissions/teams/members/update-role",
        "/permissions/teams/members/remove",
        "/permissions/teams/invite",
        "/permissions/invitations/my",
        "/permissions/invitations/respond",
    }
