export interface SessionUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  real_name?: string;
  employee_id?: string;
  department?: string;
  department_id?: number;
  position?: string;
  title?: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  is_superuser?: boolean;
  is_system_admin?: boolean;
  system_admin_level?: number;
  avatar_url?: string | null;
  avatar_storage_bucket?: string | null;
  avatar_object_key?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  full_name: string;
  phone?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: SessionUser;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  tokens?: {
    access_token?: string;
    refresh_token?: string;
  };
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  real_name?: string;
  employee_id?: string;
  department?: string;
  department_id?: number;
  position?: string;
  title?: string;
  is_active: boolean;
  roles: string[];
  is_system_admin: boolean;
  system_admin_level: number;
  avatar_url?: string | null;
  avatar_storage_bucket?: string | null;
  avatar_object_key?: string | null;
}

export interface UserUpdateRequest {
  phone?: string;
  real_name?: string;
  department_id?: number;
  position?: string;
  title?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AvatarUploadSessionRequest {
  filename: string;
  size: number;
  mime_type: string;
}

export interface AvatarUploadPartUrl {
  part_number: number;
  url: string;
}

export interface AvatarUploadSession {
  storage_bucket: string;
  object_key: string;
  upload_id: string;
  part_size: number;
  expires_in: number;
  parts: AvatarUploadPartUrl[];
}

export interface AvatarCompletedUploadPart {
  part_number: number;
  etag: string;
}

export interface CompleteAvatarUploadRequest {
  upload_id: string;
  parts: AvatarCompletedUploadPart[];
}
