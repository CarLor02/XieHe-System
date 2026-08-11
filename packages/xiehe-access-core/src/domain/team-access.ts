export interface AccessUser {
  role?: string | null;
  is_superuser?: boolean | null;
  is_system_admin?: boolean | null;
}

export interface TeamAccessMembership {
  is_member?: boolean | null;
  is_creator?: boolean | null;
  my_role?: string | null;
  my_status?: string | null;
}

const SYSTEM_ADMIN_ROLES = new Set(['admin', 'system_admin', 'super_admin']);
const UPLOADER_VIEW_ADMIN_ROLES = new Set([
  ...SYSTEM_ADMIN_ROLES,
  'team_admin',
]);

function hasDirectRole(user: AccessUser, roles: ReadonlySet<string>): boolean {
  const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
  return Boolean(user.is_superuser || user.is_system_admin || roles.has(role));
}

function isManageableTeamAdmin(team: TeamAccessMembership): boolean {
  const status = team.my_status?.toUpperCase() ?? '';
  const active =
    team.is_member === true && (status === '' || status === 'ACTIVE');
  return active && team.my_role?.toUpperCase() === 'ADMIN';
}

function isUploaderViewTeamAdmin(team: TeamAccessMembership): boolean {
  const status = team.my_status?.toUpperCase() ?? '';
  const active = status === 'ACTIVE' || team.is_member === true;
  return (
    active &&
    (team.my_role?.toUpperCase() === 'ADMIN' || team.is_creator === true)
  );
}

export function canManageTeam(
  user: AccessUser | null | undefined,
  team: TeamAccessMembership | null | undefined
): boolean {
  if (!user || !team) return false;
  return hasDirectRole(user, SYSTEM_ADMIN_ROLES) || isManageableTeamAdmin(team);
}

export function canUseUploaderView(
  user: AccessUser | null | undefined,
  teams: readonly TeamAccessMembership[] = []
): boolean {
  if (!user) return false;
  return (
    hasDirectRole(user, UPLOADER_VIEW_ADMIN_ROLES) ||
    teams.some(isUploaderViewTeamAdmin)
  );
}
