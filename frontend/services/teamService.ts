import { createAuthenticatedClient } from '@/store/authStore';
import { handleApiError } from './errorService';

export interface TeamSummary {
  id: number;
  name: string;
  description?: string | null;
  hospital?: string | null;
  department?: string | null;
  leader_name?: string | null;
  member_count: number;
  max_members?: number | null;
  is_member: boolean;
  join_status?: string | null;
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
  user_id: number;
  username: string;
  real_name?: string | null;
  email?: string | null;
  role: string;
  status: string;
  department?: string | null;
  is_leader: boolean;
  joined_at?: string | null;
}

export interface TeamMembersResponse {
  team: TeamSummary;
  members: TeamMember[];
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

export async function applyToJoinTeam(teamId: number, message?: string): Promise<string> {
  try {
    const response = await client.post<{ message: string }>(
      `/api/v1/permissions/teams/${teamId}/apply`,
      { message }
    );
    return response.data.message;
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
