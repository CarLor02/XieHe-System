export type TeamRole = 'ADMIN' | 'MEMBER';

export interface TeamSummary {
  id: number;
  name: string;
  description?: string | null;
  hospital?: string | null;
  department?: string | null;
  creator_name?: string | null;
  member_count: number;
  max_members?: number | null;
  is_member: boolean;
  my_role?: TeamRole | null;
  my_status?: 'ACTIVE' | 'INVITED' | 'PENDING' | 'INACTIVE' | null;
  is_creator?: boolean;
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
  user_id: number;
  username: string;
  real_name?: string | null;
  email?: string | null;
  role: TeamRole;
  status: string;
  department?: string | null;
  is_creator: boolean;
  is_system_admin: boolean;
  system_admin_level: number;
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

export interface TeamUpdateRequest extends Partial<TeamCreateRequest> {}

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
