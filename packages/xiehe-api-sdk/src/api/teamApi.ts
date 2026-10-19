import type { HttpApi } from '@stellarmesh/sdk';
import type {
  ApplyToTeamResult,
  InvitationRespondResult,
  InviteTeamMemberResult,
  MyInvitationsResult,
  MyTeamsResult,
  RequestApplyToTeam,
  RequestCancelTeamJoinRequest,
  RequestGetMyInvitations,
  RequestInviteTeamMember,
  RequestListMyTeams,
  RequestListTeamJoinRequests,
  RequestListTeamMembers,
  RequestRemoveTeamMember,
  RequestRespondToInvitation,
  RequestReviewTeamJoinRequest,
  RequestSearchTeams,
  RequestUpdateTeam,
  RequestUpdateTeamMemberRole,
  TeamCreateRequest,
  TeamJoinRequestActionResult,
  TeamJoinRequestsResult,
  TeamMembersResult,
  TeamSearchResult,
  TeamSummary,
} from '@xiehe/api-contracts/generated';

export function createTeamApi(http: HttpApi) {
  return {
    requestGetMyInvitations: http.post<
      RequestGetMyInvitations,
      MyInvitationsResult
    >('/api/v1/permissions/invitations/my'),
    requestRespondToInvitation: http.post<
      RequestRespondToInvitation,
      InvitationRespondResult
    >('/api/v1/permissions/invitations/respond'),
    requestApplyToTeam: http.post<RequestApplyToTeam, ApplyToTeamResult>(
      '/api/v1/permissions/teams/apply'
    ),
    requestCreateTeam: http.post<TeamCreateRequest, TeamSummary>(
      '/api/v1/permissions/teams/create'
    ),
    requestInviteTeamMember: http.post<
      RequestInviteTeamMember,
      InviteTeamMemberResult
    >('/api/v1/permissions/teams/invite'),
    requestCancelTeamJoinRequest: http.post<
      RequestCancelTeamJoinRequest,
      TeamJoinRequestActionResult
    >('/api/v1/permissions/teams/join-requests/cancel'),
    requestListTeamJoinRequests: http.post<
      RequestListTeamJoinRequests,
      TeamJoinRequestsResult
    >('/api/v1/permissions/teams/join-requests/list'),
    requestReviewTeamJoinRequest: http.post<
      RequestReviewTeamJoinRequest,
      TeamJoinRequestActionResult
    >('/api/v1/permissions/teams/join-requests/review'),
    requestListTeamMembers: http.post<
      RequestListTeamMembers,
      TeamMembersResult
    >('/api/v1/permissions/teams/members/list'),
    requestRemoveTeamMember: http.post<RequestRemoveTeamMember, null>(
      '/api/v1/permissions/teams/members/remove'
    ),
    requestUpdateTeamMemberRole: http.post<RequestUpdateTeamMemberRole, null>(
      '/api/v1/permissions/teams/members/update-role'
    ),
    requestListMyTeams: http.post<RequestListMyTeams, MyTeamsResult>(
      '/api/v1/permissions/teams/my'
    ),
    requestSearchTeams: http.post<RequestSearchTeams, TeamSearchResult>(
      '/api/v1/permissions/teams/search'
    ),
    requestUpdateTeam: http.post<RequestUpdateTeam, TeamSummary>(
      '/api/v1/permissions/teams/update'
    ),
  };
}
