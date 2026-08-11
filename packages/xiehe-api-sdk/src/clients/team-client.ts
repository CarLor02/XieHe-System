import type { HttpClient } from '@xiehe/api-client';
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

export function createTeamClient(client: HttpClient) {
  return {
    search: (keyword: string) =>
      client.get<TeamSearchResponse>('/api/v1/permissions/teams/search', {
        params: { keyword },
      }),
    listMine: () =>
      client.get<TeamListResponse>('/api/v1/permissions/teams/my'),
    apply: (teamId: number, message = '') =>
      client.post<TeamJoinRequestSubmitResponse>(
        `/api/v1/permissions/teams/${teamId}/apply`,
        { message }
      ),
    getMembers: (teamId: number) =>
      client.get<TeamMembersResponse>(
        `/api/v1/permissions/teams/${teamId}/members`
      ),
    getJoinRequests: (
      teamId: number,
      status?: 'pending' | 'approved' | 'rejected'
    ) =>
      client.get<TeamJoinRequestListResponse>(
        `/api/v1/permissions/teams/${teamId}/join-requests`,
        { params: status ? { status } : undefined }
      ),
    reviewJoinRequest: (
      teamId: number,
      requestId: number,
      decision: 'approve' | 'reject'
    ) =>
      client.post<TeamJoinRequestActionResponse>(
        `/api/v1/permissions/teams/${teamId}/join-requests/${requestId}/review`,
        { decision }
      ),
    cancelJoinRequest: (teamId: number, requestId: number) =>
      client.delete<TeamJoinRequestActionResponse>(
        `/api/v1/permissions/teams/${teamId}/join-requests/${requestId}`
      ),
    invite: (
      teamId: number,
      email: string,
      role: string,
      message?: string
    ) =>
      client.post<{ message: string }>(
        `/api/v1/permissions/teams/${teamId}/invite`,
        { email, role, message }
      ),
    create: (request: TeamCreateRequest) =>
      client.post<TeamSummary, TeamCreateRequest>(
        '/api/v1/permissions/teams',
        request
      ),
    update: (teamId: number, request: TeamUpdateRequest) =>
      client.patch<TeamSummary, TeamUpdateRequest>(
        `/api/v1/permissions/teams/${teamId}`,
        request
      ),
    async listMyApplications() {
      return (
        await client.get<{ items: TeamJoinRequestItem[] }>(
          '/api/v1/permissions/teams/my-applications'
        )
      ).items;
    },
    updateMemberRole: (teamId: number, userId: number, role: TeamRole) =>
      client.patch<{ message: string }>(
        `/api/v1/permissions/teams/${teamId}/members/${userId}/role`,
        { role }
      ),
    removeMember: (teamId: number, userId: number) =>
      client.delete<{ message: string }>(
        `/api/v1/permissions/teams/${teamId}/members/${userId}`
      ),
    listInvitations: () =>
      client.get<TeamInvitationListResponse>(
        '/api/v1/permissions/invitations/my'
      ),
    respondToInvitation: (invitationId: number, accept: boolean) =>
      client.post<TeamInvitationRespondResponse>(
        `/api/v1/permissions/invitations/${invitationId}/respond`,
        { accept }
      ),
  };
}
