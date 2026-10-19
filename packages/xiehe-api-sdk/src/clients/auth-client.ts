import type { UserResponse } from '@xiehe/api-contracts/generated';
import type { HttpApi } from '@stellarmesh/sdk';
import { createAuthApi } from '../api/authApi';
import type { HttpClient, HttpRequestOptions } from '@xiehe/api-client';
import type {
  AvatarUploadSession,
  AvatarUploadSessionRequest,
  CompleteAvatarUploadRequest,
  LoginCredentials,
  PasswordChangeRequest,
  RegisterRequest,
  UserInfo,
  UserUpdateRequest,
} from '@xiehe/api-contracts';

export function createAuthClient(http: HttpApi, apiClient: HttpClient) {
  const authApi = createAuthApi(http);
  return {
    login: (credentials: LoginCredentials) =>
      authApi.requestLogin({ remember_me: false, ...credentials }),
    register: (request: RegisterRequest) => authApi.requestRegister(request),
    refresh: (refresh_token: string) =>
      authApi.requestRefreshToken({ refresh_token }),
    logout: (options?: HttpRequestOptions) =>
      authApi.requestLogout(undefined, {
        headers: options?.headers,
        timeout: options?.timeout,
        signal: options?.signal,
      }),
    getSessionUser: () => apiClient.get<UserResponse>('/api/v1/auth/me'),
    updateSessionUser: (request: UserUpdateRequest) =>
      apiClient.put<UserResponse, UserUpdateRequest>(
        '/api/v1/auth/me',
        request
      ),
    getCurrentUser: () => apiClient.get<UserResponse>('/api/v1/auth/me'),
    updateCurrentUser: (request: UserUpdateRequest) =>
      apiClient.put<UserResponse, UserUpdateRequest>(
        '/api/v1/auth/me',
        request
      ),
    changePassword: (request: PasswordChangeRequest) =>
      authApi.requestChangePassword(request),
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
