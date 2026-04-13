import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE_URL } from '../config';
import { createLogger } from '@/lib/logger';
import {
  extractApiMessage,
  extractData,
  getStatusCode,
  isApiEnvelope,
  isApiSuccessCode,
} from '../types';
import {
  SessionUser,
  UserSession,
  createUserSession,
} from './userSession';

const logger = createLogger('api.sessionStore');

function createApiEnvelopeError(data: any, response?: any) {
  const error = new Error(
    extractApiMessage(data) || '请求失败'
  ) as Error & {
    data?: any;
    response?: any;
    apiCode?: number;
  };
  error.data = data;
  error.response = response;
  error.apiCode = data?.code;
  return error;
}

export interface LoginCredentials {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  full_name: string;
  phone?: string;
}

interface SessionState {
  isAuthenticated: boolean;
  user: SessionUser | null;
  session: UserSession | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  forceLogout: () => void;
  fetchUserInfo: () => Promise<boolean>;
  updateUserInfo: (userData: Partial<SessionUser>) => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  clearError: () => void;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      session: null,
      isLoading: false,
      error: null,

      login: async credentials => {
        try {
          set({ isLoading: true, error: null });
          logger.info('login request');
          const response = await axios.post(
            `${API_BASE_URL}/api/v1/auth/login`,
            credentials
          );

          if (
            isApiEnvelope(response.data) &&
            !isApiSuccessCode(response.data.code)
          ) {
            throw createApiEnvelopeError(response.data, response);
          }

          const result = extractData<{
            access_token: string;
            refresh_token: string;
            user: SessionUser;
          }>(response);

          set({
            isAuthenticated: true,
            user: result.user,
            session: createUserSession({
              accessToken: result.access_token,
              refreshToken: result.refresh_token,
            }),
            isLoading: false,
            error: null,
          });

          logger.info('login success', result.user.username);
          return true;
        } catch (error: any) {
          logger.warn('login failed', error);
          set({
            isAuthenticated: false,
            user: null,
            session: null,
            isLoading: false,
            error:
              extractApiMessage(error?.response?.data) ||
              error.message ||
              '登录失败，请检查用户名和密码',
          });
          return false;
        }
      },

      register: async userData => {
        try {
          set({ isLoading: true, error: null });
          const response = await axios.post(
            `${API_BASE_URL}/api/v1/auth/register`,
            userData
          );

          if (
            isApiEnvelope(response.data) &&
            !isApiSuccessCode(response.data.code)
          ) {
            throw createApiEnvelopeError(response.data, response);
          }

          extractData(response);
          set({ isLoading: false, error: null });
          return true;
        } catch (error: any) {
          logger.warn('register failed', error);
          set({
            isLoading: false,
            error:
              extractApiMessage(error?.response?.data) ||
              error.message ||
              '注册失败，请稍后重试',
          });
          return false;
        }
      },

      logout: async () => {
        try {
          const accessToken = get().session?.accessToken;
          if (accessToken) {
            await axios.post(
              `${API_BASE_URL}/api/v1/auth/logout`,
              {},
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
          }
        } catch (error) {
          logger.warn('logout request failed', error);
        } finally {
          set({
            isAuthenticated: false,
            user: null,
            session: null,
            error: null,
            isLoading: false,
          });

          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage');
          }
        }
      },

      refreshAccessToken: async () => {
        try {
          const refreshToken = get().session?.refreshToken;
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          logger.info('refresh token request');
          const { apiClient } = await import('../authenticatedApiClient');
          const response = await apiClient.post(
            '/api/v1/auth/refresh',
            { refresh_token: refreshToken },
            { _skipAuthRefresh: true } as any
          );

          if (
            isApiEnvelope(response.data) &&
            !isApiSuccessCode(response.data.code)
          ) {
            throw createApiEnvelopeError(response.data, response);
          }

          const result = extractData<{
            access_token: string;
            refresh_token?: string;
          }>(response);

          set(state => ({
            session: createUserSession({
              accessToken: result.access_token,
              refreshToken: result.refresh_token || state.session?.refreshToken || refreshToken,
            }),
          }));

          logger.info('refresh token success');
          return true;
        } catch (error) {
          logger.warn('refresh token failed', error);
          const status = getStatusCode(error);
          if (status === 401 || status === 403) {
            return false;
          }
          throw error;
        }
      },

      forceLogout: () => {
        logger.warn('force logout');
        set({
          isAuthenticated: false,
          user: null,
          session: null,
          error: '认证已过期，请重新登录',
        });

        if (typeof window !== 'undefined') {
          window.setTimeout(() => {
            window.location.href = '/auth/login';
          }, 500);
        }
      },

      fetchUserInfo: async () => {
        try {
          if (!get().session?.accessToken || !get().isAuthenticated) {
            return false;
          }

          const { apiClient } = await import('../authenticatedApiClient');
          const response = await apiClient.get('/api/v1/auth/me');
          const user = extractData<SessionUser>(response);
          set({ user });
          return true;
        } catch (error) {
          logger.warn('fetchUserInfo failed', error);
          return false;
        }
      },

      updateUserInfo: async userData => {
        try {
          if (!get().session?.accessToken) {
            return false;
          }

          const { apiClient } = await import('../authenticatedApiClient');
          const response = await apiClient.put('/api/v1/auth/me', userData);
          const user = extractData<SessionUser>(response);
          set({ user });
          return true;
        } catch (error) {
          logger.warn('updateUserInfo failed', error);
          return false;
        }
      },

      hasPermission: permission => get().user?.permissions?.includes(permission) || false,
      hasRole: role => get().user?.role === role,
      hasAnyPermission: permissions =>
        permissions.some(permission => get().user?.permissions?.includes(permission)),
      clearError: () => set({ error: null }),
      setError: error => set({ error }),
      setLoading: isLoading => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      partialize: state => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        session: state.session,
      }),
    }
  )
);

export const useAuth = () => {
  const {
    login,
    register,
    logout,
    refreshAccessToken,
    forceLogout,
    isLoading,
    error,
    clearError,
    setError,
    setLoading,
  } = useSessionStore();

  return {
    login,
    register,
    logout,
    forceLogout,
    refreshAccessToken,
    isLoading,
    error,
    clearError,
    setError,
    setLoading,
  };
};

export const useUser = () => {
  const {
    isAuthenticated,
    user,
    fetchUserInfo,
    updateUserInfo,
    hasPermission,
    hasRole,
    hasAnyPermission,
  } = useSessionStore();

  return {
    isAuthenticated,
    user,
    fetchUserInfo,
    updateUserInfo,
    hasPermission,
    hasRole,
    hasAnyPermission,
  };
};

export const usePermissions = () => {
  const { hasPermission, hasRole, hasAnyPermission, user } = useSessionStore();

  return {
    hasPermission,
    hasRole,
    hasAnyPermission,
    permissions: user?.permissions || [],
    role: user?.role,
  };
};
