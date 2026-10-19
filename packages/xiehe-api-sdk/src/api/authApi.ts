import type { HttpApi } from '@stellarmesh/sdk';
import type {
  LoginResult,
  PasswordChange,
  RefreshTokenResult,
  RegisterResult,
  RequestGetUsers,
  TokenRefresh,
  UserDirectoryResult,
  UserLogin,
  UserRegister,
} from '@xiehe/api-contracts/generated';

export function createAuthApi(http: HttpApi) {
  return {
    requestLogin: http.post<UserLogin, LoginResult>('/api/v1/auth/login', {
      auth: false,
    }),
    requestLogout: http.post<void, null>('/api/v1/auth/logout', {
      auth: false,
    }),
    requestChangePassword: http.post<PasswordChange, null>(
      '/api/v1/auth/password/change'
    ),
    requestRefreshToken: http.post<TokenRefresh, RefreshTokenResult>(
      '/api/v1/auth/refresh',
      { auth: false }
    ),
    requestRegister: http.post<UserRegister, RegisterResult>(
      '/api/v1/auth/register',
      { auth: false }
    ),
    requestGetUsers: http.post<RequestGetUsers, UserDirectoryResult>(
      '/api/v1/permissions/users/list'
    ),
  };
}
