import { apiSdk, getApiErrorStatus } from '@/infrastructure/http';
import { handleApiError } from './errorService';
import type {
  TeamCreateRequest,
  TeamInvitationListResponse,
  TeamInvitationRespondResponse,
  TeamJoinRequestActionResponse,
  TeamJoinRequestItem,
  TeamJoinRequestListResponse,
  TeamJoinRequestSubmitResponse,
  TeamListResponse,
  TeamMembersResponse,
  TeamRole,
  TeamSearchResponse,
  TeamSummary,
  TeamUpdateRequest,
} from '@xiehe/api-contracts';

export type {
  TeamCreateRequest,
  TeamInvitationItem,
  TeamInvitationListResponse,
  TeamInvitationRespondResponse,
  TeamJoinRequestActionResponse,
  TeamJoinRequestItem,
  TeamJoinRequestListResponse,
  TeamJoinRequestSubmitResponse,
  TeamListResponse,
  TeamMember,
  TeamMembersResponse,
  TeamSearchResponse,
  TeamSummary,
  TeamUpdateRequest,
} from '@xiehe/api-contracts';

async function withTeamError<T>(
  operation: string,
  request: () => Promise<T>
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    handleApiError(error, operation);
    throw error;
  }
}

export function searchTeams(keyword: string): Promise<TeamSearchResponse> {
  return withTeamError('team_search', () => apiSdk.teams.search(keyword));
}

export function getMyTeams(): Promise<TeamListResponse> {
  return withTeamError('team_my_list', () => apiSdk.teams.listMine());
}

export function applyToJoinTeam(
  teamId: number,
  message?: string
): Promise<TeamJoinRequestSubmitResponse> {
  return withTeamError('team_apply', () => apiSdk.teams.apply(teamId, message));
}

export function getTeamMembers(teamId: number): Promise<TeamMembersResponse> {
  return withTeamError('team_members', () => apiSdk.teams.getMembers(teamId));
}

export function getTeamJoinRequests(
  teamId: number,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<TeamJoinRequestListResponse> {
  return withTeamError('team_join_requests', () =>
    apiSdk.teams.getJoinRequests(teamId, status)
  );
}

export function reviewTeamJoinRequest(
  teamId: number,
  requestId: number,
  decision: 'approve' | 'reject'
): Promise<TeamJoinRequestActionResponse> {
  return withTeamError('team_join_request_review', () =>
    apiSdk.teams.reviewJoinRequest(teamId, requestId, decision)
  );
}

export function cancelTeamJoinRequest(
  teamId: number,
  requestId: number
): Promise<TeamJoinRequestActionResponse> {
  return withTeamError('team_join_request_cancel', () =>
    apiSdk.teams.cancelJoinRequest(teamId, requestId)
  );
}

export async function inviteTeamMember(
  teamId: number,
  email: string,
  role: string,
  message?: string
): Promise<string> {
  const result = await withTeamError('team_invite', () =>
    apiSdk.teams.invite(teamId, email, role, message)
  );
  return result.message;
}

export function createTeam(request: TeamCreateRequest): Promise<TeamSummary> {
  return withTeamError('team_create', () => apiSdk.teams.create(request));
}

export function updateTeam(
  teamId: number,
  request: TeamUpdateRequest
): Promise<TeamSummary> {
  return withTeamError('team_update', () =>
    apiSdk.teams.update(teamId, request)
  );
}

export async function getMyApplications(): Promise<TeamJoinRequestItem[]> {
  try {
    return await apiSdk.teams.listMyApplications();
  } catch (error) {
    if (getApiErrorStatus(error) === 404) return [];
    handleApiError(error, 'team_my_applications');
    throw error;
  }
}

export function updateMemberRole(
  teamId: number,
  userId: number,
  newRole: TeamRole
): Promise<{ message: string }> {
  return withTeamError('team_update_member_role', () =>
    apiSdk.teams.updateMemberRole(teamId, userId, newRole)
  );
}

export function removeMember(
  teamId: number,
  userId: number
): Promise<{ message: string }> {
  return withTeamError('team_remove_member', () =>
    apiSdk.teams.removeMember(teamId, userId)
  );
}

export function getMyInvitations(): Promise<TeamInvitationListResponse> {
  return withTeamError('team_invitations_get', () =>
    apiSdk.teams.listInvitations()
  );
}

export function respondToInvitation(
  invitationId: number,
  accept: boolean
): Promise<TeamInvitationRespondResponse> {
  return withTeamError('team_invitation_respond', () =>
    apiSdk.teams.respondToInvitation(invitationId, accept)
  );
}
