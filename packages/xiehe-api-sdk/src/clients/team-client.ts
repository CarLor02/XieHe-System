import type { HttpApi } from '@stellarmesh/sdk';
import type {
  TeamCreateRequest,
  TeamUpdateRequest,
  TeamRole,
} from '@xiehe/api-contracts';
import { createTeamApi } from '../api/teamApi';

export function createTeamClient(http: HttpApi) {
  const teamApi = createTeamApi(http);
  return {
    search: (keyword: string) =>
      teamApi.requestSearchTeams({ keyword, limit: 20 }),
    listMine: () => teamApi.requestListMyTeams({}),
    apply: (team_id: number, message = '') =>
      teamApi.requestApplyToTeam({ team_id, message }),
    getMembers: (team_id: number) =>
      teamApi.requestListTeamMembers({ team_id }),
    getJoinRequests: (
      team_id: number,
      status?: 'pending' | 'approved' | 'rejected'
    ) => teamApi.requestListTeamJoinRequests({ team_id, status }),
    reviewJoinRequest: (
      team_id: number,
      request_id: number,
      decision: 'approve' | 'reject'
    ) =>
      teamApi.requestReviewTeamJoinRequest({ team_id, request_id, decision }),
    cancelJoinRequest: (team_id: number, request_id: number) =>
      teamApi.requestCancelTeamJoinRequest({ team_id, request_id }),
    invite: (team_id: number, email: string, role: string, message?: string) =>
      teamApi.requestInviteTeamMember({ team_id, email, role, message }),
    create: (request: TeamCreateRequest) =>
      teamApi.requestCreateTeam({ max_members: 50, ...request }),
    update: (team_id: number, changes: TeamUpdateRequest) =>
      teamApi.requestUpdateTeam({ ...changes, team_id }),
    updateMemberRole: (team_id: number, user_id: number, role: TeamRole) =>
      teamApi.requestUpdateTeamMemberRole({ team_id, user_id, role }),
    removeMember: (team_id: number, user_id: number) =>
      teamApi.requestRemoveTeamMember({ team_id, user_id }),
    listInvitations: () => teamApi.requestGetMyInvitations({}),
    respondToInvitation: (invitation_id: number, accept: boolean) =>
      teamApi.requestRespondToInvitation({ invitation_id, accept }),
  };
}
