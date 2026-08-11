import type { HttpClient, HttpRequestOptions } from '@xiehe/api-client';
import type {
  AvatarUploadSession,
  AvatarUploadSessionRequest,
  CompleteAvatarUploadRequest,
  LoginCredentials,
  LoginResponse,
  PasswordChangeRequest,
  RefreshTokenResponse,
  RegisterRequest,
  SessionUser,
  UserInfo,
  UserUpdateRequest,
} from '@xiehe/api-contracts';

export function createAuthClient(
  apiClient: HttpClient,
  publicApiClient: HttpClient
) {
  return {
    login: (credentials: LoginCredentials) =>
      publicApiClient.post<LoginResponse, LoginCredentials>(
        '/api/v1/auth/login',
        credentials
      ),
    register: (request: RegisterRequest) =>
      publicApiClient.post<void, RegisterRequest>(
        '/api/v1/auth/register',
        request
      ),
    refresh: (refreshToken: string) =>
      publicApiClient.post<RefreshTokenResponse>(
        '/api/v1/auth/refresh',
        { refresh_token: refreshToken }
      ),
    logout: (options?: HttpRequestOptions) =>
      publicApiClient.post<void>('/api/v1/auth/logout', {}, options),
    getSessionUser: () => apiClient.get<SessionUser>('/api/v1/auth/me'),
    updateSessionUser: (request: Partial<SessionUser>) =>
      apiClient.put<SessionUser, Partial<SessionUser>>(
        '/api/v1/auth/me',
        request
      ),
    getCurrentUser: () => apiClient.get<UserInfo>('/api/v1/auth/me'),
    updateCurrentUser: (request: UserUpdateRequest) =>
      apiClient.put<UserInfo, UserUpdateRequest>('/api/v1/auth/me', request),
    changePassword: (request: PasswordChangeRequest) =>
      apiClient.post<void, PasswordChangeRequest>(
        '/api/v1/auth/password/change',
        request
      ),
    createAvatarUploadSession: (request: AvatarUploadSessionRequest) =>
      apiClient.post<AvatarUploadSession, AvatarUploadSessionRequest>(
        '/api/v1/auth/me/avatar/upload-session',
        request
      ),
    completeAvatarUpload: (request: CompleteAvatarUploadRequest) =>
      apiClient.post<UserInfo, CompleteAvatarUploadRequest>(
        '/api/v1/auth/me/avatar/complete',
        request
      ),
    deleteAvatar: () => apiClient.delete<UserInfo>('/api/v1/auth/me/avatar'),
  };
}
