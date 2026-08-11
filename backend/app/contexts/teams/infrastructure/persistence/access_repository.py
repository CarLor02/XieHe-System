"""Synchronous team visibility adapter for cross-context consumers."""

from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.contexts.teams.domain import TeamAccessPage, TeamAccessSnapshot

from .models import (
    Team,
    TeamMembership,
    TeamMembershipRole,
    TeamMembershipStatus,
)


class SqlAlchemyTeamAccessRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_active_admin_team_ids(self, user_id: int) -> set[int]:
        rows = (
            self._session.query(TeamMembership.team_id)
            .join(Team, Team.id == TeamMembership.team_id)
            .filter(
                TeamMembership.user_id == user_id,
                TeamMembership.role == TeamMembershipRole.ADMIN,
                TeamMembership.status == TeamMembershipStatus.ACTIVE,
                Team.is_active.is_(True),
            )
            .distinct()
            .all()
        )
        return {team_id for (team_id,) in rows}

    def find_assignable_active_team_ids(
        self,
        *,
        actor_id: int | None,
        unrestricted: bool,
        requested_team_ids: list[int],
    ) -> set[int]:
        if not requested_team_ids:
            return set()
        query = self._session.query(Team.id).filter(
            Team.id.in_(requested_team_ids),
            Team.is_active.is_(True),
        )
        if not unrestricted:
            if actor_id is None:
                return set()
            query = query.join(
                TeamMembership,
                TeamMembership.team_id == Team.id,
            ).filter(
                TeamMembership.user_id == actor_id,
                TeamMembership.status == TeamMembershipStatus.ACTIVE,
            )
        return {team_id for (team_id,) in query.distinct().all()}

    def list_assignable(
        self,
        *,
        actor_id: int | None,
        unrestricted: bool,
        page: int,
        page_size: int,
        search: str | None,
    ) -> TeamAccessPage:
        query: Any
        if unrestricted:
            query = self._session.query(Team).filter(Team.is_active.is_(True))
        elif actor_id is None:
            return TeamAccessPage(items=(), total=0)
        else:
            query = (
                self._session.query(Team, TeamMembership)
                .join(TeamMembership, TeamMembership.team_id == Team.id)
                .filter(
                    Team.is_active.is_(True),
                    TeamMembership.user_id == actor_id,
                    TeamMembership.status == TeamMembershipStatus.ACTIVE,
                )
            )
        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Team.name.ilike(pattern),
                    Team.description.ilike(pattern),
                    Team.hospital.ilike(pattern),
                    Team.department.ilike(pattern),
                )
            )
        total = query.count()
        rows = (
            query.order_by(Team.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        items = []
        for row in rows:
            if unrestricted:
                team = row
                membership = None
            else:
                team, membership = row
            items.append(self._snapshot(team, actor_id, membership))
        return TeamAccessPage(items=tuple(items), total=total)

    @staticmethod
    def _snapshot(
        team: Team,
        actor_id: int | None,
        membership: TeamMembership | None,
    ) -> TeamAccessSnapshot:
        active_memberships = [
            item
            for item in team.memberships
            if item.status == TeamMembershipStatus.ACTIVE
        ]
        current_membership = membership
        if current_membership is None and actor_id is not None:
            current_membership = next(
                (item for item in active_memberships if item.user_id == actor_id),
                None,
            )
        return TeamAccessSnapshot(
            id=team.id,
            name=team.name,
            description=team.description,
            hospital=team.hospital,
            department=team.department,
            creator_name=team.creator.real_name if team.creator else None,
            member_count=len(active_memberships),
            max_members=team.max_members,
            is_member=current_membership is not None,
            my_role=current_membership.role.value if current_membership else None,
            my_status=current_membership.status.value if current_membership else None,
            is_creator=actor_id is not None and team.creator_id == actor_id,
            created_at=team.created_at,
        )
