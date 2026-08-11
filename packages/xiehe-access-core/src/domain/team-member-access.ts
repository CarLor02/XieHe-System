export interface TeamMemberAccessSubject {
  role?: string | null;
  isCreator?: boolean | null;
  isSystemAdmin?: boolean | null;
  systemAdminLevel?: number | null;
}

export function canEditTeamMember(input: {
  actorIsTeamAdmin: boolean;
  member: TeamMemberAccessSubject;
}): boolean {
  if (input.member.isSystemAdmin && input.member.systemAdminLevel === 1) {
    return false;
  }
  if (input.actorIsTeamAdmin) return true;
  return !(
    input.member.role?.toUpperCase() === 'ADMIN' || input.member.isSystemAdmin
  );
}

export function canRemoveTeamMember(input: {
  actorIsTeamAdmin: boolean;
  member: TeamMemberAccessSubject;
}): boolean {
  if (input.member.isCreator) return false;
  if (input.member.isSystemAdmin && input.member.systemAdminLevel === 1) {
    return false;
  }
  return input.actorIsTeamAdmin;
}
