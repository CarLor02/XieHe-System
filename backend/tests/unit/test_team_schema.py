from app.schemas.team import TeamSummary


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
