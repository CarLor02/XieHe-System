import type {
  UserResponse,
  UserLogin,
  UserRegister,
  LoginResult,
  RefreshTokenResult,
  UserUpdate,
  PasswordChange,
} from '../../generated';

// UI 状态允许只加载部分资料；字段类型始终来自生成的 wire DTO。
type RequiredSessionFields =
  | 'id'
  | 'username'
  | 'email'
  | 'full_name'
  | 'role'
  | 'permissions'
  | 'is_active';
export type SessionUser = Pick<UserResponse, RequiredSessionFields> &
  Partial<Omit<UserResponse, RequiredSessionFields>>;
export type UserInfo = Pick<
  UserResponse,
  'id' | 'username' | 'email' | 'full_name' | 'is_active'
> &
  Partial<UserResponse>;
export type LoginCredentials = Omit<UserLogin, 'remember_me'> &
  Partial<Pick<UserLogin, 'remember_me'>>;
export type RegisterRequest = UserRegister;
export type LoginResponse = Omit<LoginResult, 'user'> & { user: SessionUser };
export type RefreshTokenRequest = { refresh_token: string };
export type RefreshTokenResponse = RefreshTokenResult;
export type UserUpdateRequest = UserUpdate;
export type PasswordChangeRequest = PasswordChange;

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
