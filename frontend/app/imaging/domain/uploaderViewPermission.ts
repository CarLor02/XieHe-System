import type { SessionUser } from '@/lib/api/session/userSession';

type TeamUploaderPermissionSource = {
  my_role?: string | null;
  my_status?: string | null;
  is_creator?: boolean | null;
  is_member?: boolean | null;
};

const DIRECT_ADMIN_ROLES = new Set([
  'admin',
  'system_admin',
  'team_admin',
  'ADMIN',
  'SYSTEM_ADMIN',
  'TEAM_ADMIN',
]);

function hasDirectUploaderPermission(user: SessionUser | null | undefined) {
  const role = user?.role;
  return Boolean(
    user?.is_superuser ||
      user?.is_system_admin ||
      (role && DIRECT_ADMIN_ROLES.has(role))
  );
}

function isActiveTeamAdmin(team: TeamUploaderPermissionSource) {
  const isActiveMember = team.my_status === 'ACTIVE' || team.is_member === true;
  return isActiveMember && (team.my_role === 'ADMIN' || team.is_creator === true);
}

export function canUseUploaderView(
  user: SessionUser | null | undefined,
  teams: TeamUploaderPermissionSource[] = []
) {
  if (!user) return false;
  return hasDirectUploaderPermission(user) || teams.some(isActiveTeamAdmin);
}
