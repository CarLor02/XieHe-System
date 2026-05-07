type ViewerUser = {
  is_superuser?: boolean;
  is_system_admin?: boolean;
  role?: string | null;
  title?: string | null;
  position?: string | null;
} | null | undefined;

const KEYPOINT_TOOL_ROLES = new Set([
  'admin',
  'system_admin',
  'team_admin',
  'senior_doctor',
]);

export function canUseKeypointTools(user: ViewerUser): boolean {
  if (!user) return false;
  if (user.is_superuser === true || user.is_system_admin === true) return true;
  if (user.role && KEYPOINT_TOOL_ROLES.has(user.role)) return true;

  const title = user.title?.trim();
  const position = user.position?.trim();
  return title === '主任医师' || position === '主任医师';
}
