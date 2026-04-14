import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE_URL } from '../config';
import { sessionStoreLogging } from '@/lib/logger/sessionLogging';
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
import { createApiEnvelopeError } from '../client/errors';
import {
  clearPersistedAuthState,
  redirectToLogin,
} from './sessionEffects';

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
  forceLogout: (context?: Record<string, unknown>) => void;
  fetchUserInfo: () => Promise<boolean>;
  fetchUserInfoStatus: () => Promise<'success' | 'unauthorized' | 'error'>;
  updateUserInfo: (userData: Partial<SessionUser>) => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  clearError: () => void;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

export function hasUsableSession(
  session: UserSession | null | undefined
): boolean {
  return Boolean(session?.accessToken && session?.refreshToken);
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
          sessionStoreLogging.loginRequested({
            username: credentials.username.trim(),
            rememberMe: credentials.remember_me ?? false,
          });
          const normalizedCredentials = {
            ...credentials,
            username: credentials.username.trim(),
          };
          const response = await axios.post(
            `${API_BASE_URL}/api/v1/auth/login`,
            normalizedCredentials
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

          sessionStoreLogging.loginSucceeded(result.user);
          return true;
        } catch (error: any) {
          sessionStoreLogging.loginFailed(error);
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
          sessionStoreLogging.registerFailed(error);
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
          sessionStoreLogging.logoutRequested(get().session);
          if (accessToken) {
            await axios.post(
              `${API_BASE_URL}/api/v1/auth/logout`,
              {},
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
          }
        } catch (error) {
          sessionStoreLogging.logoutRequestFailed(error);
        } finally {
          set({
            isAuthenticated: false,
            user: null,
            session: null,
            error: null,
            isLoading: false,
          });

          clearPersistedAuthState();
        }
      },

      refreshAccessToken: async () => {
        try {
          const refreshToken = get().session?.refreshToken;
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          sessionStoreLogging.refreshRequested(get().session);
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
            tokens?: {
              access_token?: string;
              refresh_token?: string;
            };
          }>(response);
          const nextAccessToken = result.tokens?.access_token;
          const nextRefreshToken = result.tokens?.refresh_token;

          if (!nextAccessToken) {
            throw new Error('Refresh response does not contain data.tokens.access_token');
          }

          set(state => ({
            session: createUserSession({
              accessToken: nextAccessToken,
              refreshToken:
                nextRefreshToken || state.session?.refreshToken || refreshToken,
            }),
          }));

          sessionStoreLogging.refreshSucceeded(get().session);
          return true;
        } catch (error) {
          sessionStoreLogging.refreshFailed({
            error,
            session: get().session,
          });
          const status = getStatusCode(error);
          if (status === 401 || status === 403) {
            return false;
          }
          throw error;
        }
      },

      forceLogout: context => {
        sessionStoreLogging.forceLogout({
          context,
          session: get().session,
        });
        set({
          isAuthenticated: false,
          user: null,
          session: null,
          error: '认证已过期，请重新登录',
        });

        clearPersistedAuthState();
        redirectToLogin();
      },

      fetchUserInfo: async () => {
        const result = await get().fetchUserInfoStatus();
        return result === 'success';
      },

      fetchUserInfoStatus: async () => {
        try {
          const session = get().session;
          if (!hasUsableSession(session)) {
            sessionStoreLogging.fetchUserInfoSkipped({
              isAuthenticated: get().isAuthenticated,
              session,
            });
            return 'unauthorized';
          }

          if (!get().isAuthenticated) {
            sessionStoreLogging.fetchUserInfoRestoredAuthenticatedFlag();
            set({ isAuthenticated: true });
          }

          const { apiClient } = await import('../authenticatedApiClient');
          const response = await apiClient.get('/api/v1/auth/me');
          const user = extractData<SessionUser>(response);
          set({ user });
          sessionStoreLogging.fetchUserInfoSucceeded(user);
          return 'success';
        } catch (error) {
          sessionStoreLogging.fetchUserInfoFailed({
            error,
            session: get().session,
          });
          const status = getStatusCode(error);
          if (status === 401 || status === 403) {
            return 'unauthorized';
          }
          return 'error';
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
          sessionStoreLogging.updateUserInfoFailed(error);
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
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<SessionState>),
        };
        const isAuthenticated = hasUsableSession(merged.session);
        sessionStoreLogging.rehydrateMerged({
          persistedSession: (persistedState as Partial<SessionState>)?.session,
          mergedSession: merged.session,
          mergedIsAuthenticated: isAuthenticated,
        });

        return {
          ...merged,
          isAuthenticated,
          user: isAuthenticated ? merged.user : null,
        };
      },
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
    session,
    user,
    fetchUserInfo,
    fetchUserInfoStatus,
    updateUserInfo,
    hasPermission,
    hasRole,
    hasAnyPermission,
  } = useSessionStore();

  return {
    isAuthenticated: hasUsableSession(session) || isAuthenticated,
    user,
    fetchUserInfo,
    fetchUserInfoStatus,
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
