import type {
  TeamSummary as WireTeamSummary,
  TeamMember as WireTeamMember,
  TeamCreateRequest as WireTeamCreateRequest,
  RequestUpdateTeam as WireTeamUpdateRequest,
} from '../../generated';
export type {
  TeamRole,
  MyTeamsResult as TeamListResponse,
  TeamSearchResult as TeamSearchResponse,
  TeamMembersResult as TeamMembersResponse,
  TeamJoinRequestItem,
  TeamJoinRequestsResult as TeamJoinRequestListResponse,
  TeamJoinRequestActionResult as TeamJoinRequestActionResponse,
  ApplyToTeamResult as TeamJoinRequestSubmitResponse,
  TeamInvitationItem,
  MyInvitationsResult as TeamInvitationListResponse,
  InvitationRespondResult as TeamInvitationRespondResponse,
} from '../../generated';

export type TeamSummary = WireTeamSummary;
export type TeamMember = WireTeamMember;
export type TeamCreateRequest = Omit<WireTeamCreateRequest, 'max_members'> &
  Partial<Pick<WireTeamCreateRequest, 'max_members'>>;
export type TeamUpdateRequest = Omit<WireTeamUpdateRequest, 'team_id'>;
