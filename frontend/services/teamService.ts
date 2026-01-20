import { createAuthenticatedClient } from '@/store/authStore';
import { handleApiError } from './errorService';

export interface TeamSummary {
  id: number;
  name: string;
  description?: string | null;
  hospital?: string | null;
  department?: string | null;
  creator_name?: string | null;  // 改为creator_name
  member_count: number;
  max_members?: number | null;
  is_member: boolean;
  join_status?: string | null;
  join_request_id?: number | null;
  created_at?: string | null;
}

export interface TeamListResponse {
  items: TeamSummary[];
  total: number;
}

export interface TeamSearchResponse {
  results: TeamSummary[];
  total: number;
}

export interface TeamMember {
  user_id: number; // 后端返回的字段名是 user_id
  username: string;
  real_name?: string | null;
  email?: string | null;
  role: 'ADMIN' | 'MEMBER'; // 移除GUEST角色
  status: string;
  department?: string | null;
  is_creator: boolean; // 改为is_creator，是否是团队创建者
  is_system_admin: boolean; // 是否系统管理员
  system_admin_level: number; // 系统管理员级别：0-非系统管理员，1-超级系统管理员，2-二级系统管理员
  joined_at?: string | null;
}

export interface TeamMembersResponse {
  team: TeamSummary;
  members: TeamMember[];
}

export interface TeamJoinRequestItem {
  id: number;
  team_id: number;
  applicant_id: number;
  applicant_username: string;
  applicant_real_name?: string | null;
  applicant_email?: string | null;
  message: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requested_at: string;
  reviewed_at?: string | null;
  reviewer_id?: number | null;
}

export interface TeamJoinRequestListResponse {
  items: TeamJoinRequestItem[];
  total: number;
  pending_count: number;
}

export interface TeamJoinRequestActionResponse {
  message: string;
  status: 'approved' | 'rejected' | 'pending';
  request: TeamJoinRequestItem;
}

export interface TeamJoinRequestSubmitResponse {
  request_id: number;
  message: string;
  status: string;
  requested_at: string;
}

export interface TeamCreateRequest {
  name: string;
  description?: string;
  hospital?: string;
  department?: string;
  max_members?: number;
}

const client = createAuthenticatedClient();

export async function searchTeams(keyword: string): Promise<TeamSearchResponse> {
  try {
    const response = await client.get<TeamSearchResponse>(
      '/api/v1/permissions/teams/search',
      {
        params: { keyword },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'team_search');
    throw error;
  }
}

export async function getMyTeams(): Promise<TeamListResponse> {
  try {
    const response = await client.get<TeamListResponse>('/api/v1/permissions/teams/my');
    return response.data;
  } catch (error) {
    handleApiError(error, 'team_my_list');
    throw error;
  }
}

export async function applyToJoinTeam(
  teamId: number,
  message?: string
): Promise<TeamJoinRequestSubmitResponse> {
  try {
    const response = await client.post<TeamJoinRequestSubmitResponse>(
      `/api/v1/permissions/teams/${teamId}/apply`,
      { message: message || '' }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'team_apply');
    throw error;
  }
}

export async function getTeamMembers(teamId: number): Promise<TeamMembersResponse> {
  try {
    const response = await client.get<TeamMembersResponse>(
      `/api/v1/permissions/teams/${teamId}/members`
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'team_members');
    throw error;
  }
}

export async function getTeamJoinRequests(
  teamId: number,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<TeamJoinRequestListResponse> {
  try {
    const response = await client.get<TeamJoinRequestListResponse>(
      `/api/v1/permissions/teams/${teamId}/join-requests`,
      {
        params: status ? { status } : undefined,
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'team_join_requests');
    throw error;
  }
}

export async function reviewTeamJoinRequest(
  teamId: number,
  requestId: number,
  decision: 'approve' | 'reject'
): Promise<TeamJoinRequestActionResponse> {
  try {
    const response = await client.post<TeamJoinRequestActionResponse>(
      `/api/v1/permissions/teams/${teamId}/join-requests/${requestId}/review`,
      { decision }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'team_join_request_review');
    throw error;
  }
}

export async function cancelTeamJoinRequest(
  teamId: number,
  requestId: number
): Promise<TeamJoinRequestActionResponse> {
  try {
    const response = await client.delete<TeamJoinRequestActionResponse>(
      `/api/v1/permissions/teams/${teamId}/join-requests/${requestId}`
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'team_join_request_cancel');
    throw error;
  }
}

export async function inviteTeamMember(
  teamId: number,
  email: string,
  role: string,
  message?: string
): Promise<string> {
  try {
    const response = await client.post<{ message: string }>(
      `/api/v1/permissions/teams/${teamId}/invite`,
      { email, role, message }
    );
    return response.data.message;
  } catch (error) {
    handleApiError(error, 'team_invite');
    throw error;
  }
}

export async function createTeam(payload: TeamCreateRequest): Promise<TeamSummary> {
  try {
    const response = await client.post<TeamSummary>('/api/v1/permissions/teams', payload);
    return response.data;
  } catch (error) {
    handleApiError(error, 'team_create');
    throw error;
  }
}

// 获取用户的申请记录
export async function getMyApplications(): Promise<TeamJoinRequestItem[]> {
  try {
    const response = await client.get<{ items: TeamJoinRequestItem[] }>(
      '/api/v1/permissions/teams/my-applications'
    );
    return response.data.items;
  } catch (error) {
    // 如果接口不存在，返回空数组
    if ((error as any)?.response?.status === 404) {
      return [];
    }
    handleApiError(error, 'team_my_applications');
    throw error;
  }
}

// 修改团队成员角色
export async function updateMemberRole(
  teamId: number,
  userId: number,
  newRole: 'ADMIN' | 'MEMBER' // 移除GUEST角色
): Promise<{ message: string }> {
  try {
    const response = await client.patch<{ message: string }>(
      `/api/v1/permissions/teams/${teamId}/members/${userId}/role`,
      { role: newRole }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'team_update_member_role');
    throw error;
  }
}

// 删除团队成员
export async function removeMember(
  teamId: number,
  userId: number
): Promise<{ message: string }> {
  try {
    const response = await client.delete<{ message: string }>(
      `/api/v1/permissions/teams/${teamId}/members/${userId}`
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'team_remove_member');
    throw error;
  }
}

// 团队邀请相关接口

export interface TeamInvitationItem {
  id: number;
  team_id: number;
  team_name?: string | null;
  team_description?: string | null;
  inviter_id: number;
  inviter_name?: string | null;
  role: string;
  message?: string | null;
  created_at: string;
  expires_at: string;
  status: string;
}

export interface TeamInvitationListResponse {
  items: TeamInvitationItem[];
  total: number;
}

export interface TeamInvitationRespondResponse {
  message: string;
  status: string;
  team_id: number;
  team_name: string;
}

// 获取我的团队邀请
export async function getMyInvitations(): Promise<TeamInvitationListResponse> {
  try {
    const response = await client.get<TeamInvitationListResponse>(
      '/api/v1/permissions/invitations/my'
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'team_invitations_get');
    throw error;
  }
}

// 响应团队邀请（接受或拒绝）
export async function respondToInvitation(
  invitationId: number,
  accept: boolean
): Promise<TeamInvitationRespondResponse> {
  try {
    const response = await client.post<TeamInvitationRespondResponse>(
      `/api/v1/permissions/invitations/${invitationId}/respond`,
      { accept }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'team_invitation_respond');
    throw error;
  }
}
