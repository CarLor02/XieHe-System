import type { SessionUser } from '@/lib/api/session/userSession';
import type { TeamSummary } from '@/services/teamService';

type ManageableTeam = Pick<TeamSummary, 'is_member' | 'my_role' | 'my_status'>;
type ManageTeamUser = Pick<SessionUser, 'role' | 'is_superuser' | 'is_system_admin'> | null | undefined;

const DIRECT_ADMIN_ROLES = new Set(['admin', 'system_admin', 'super_admin']);

export function canManageTeam(user: ManageTeamUser, team: ManageableTeam | null | undefined): boolean {
  if (!user || !team) return false;

  const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
  const isDirectAdmin =
    Boolean(user.is_superuser) ||
    Boolean(user.is_system_admin) ||
    DIRECT_ADMIN_ROLES.has(role);
  if (isDirectAdmin) return true;

  const teamStatus = typeof team.my_status === 'string' ? team.my_status.toUpperCase() : '';
  const isActiveMember =
    team.is_member === true && (teamStatus === 'ACTIVE' || teamStatus === '');
  if (!isActiveMember) return false;

  const teamRole = typeof team.my_role === 'string' ? team.my_role.toUpperCase() : '';
  return teamRole === 'ADMIN';
}
