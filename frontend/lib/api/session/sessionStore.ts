import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sessionStoreLogging } from '@/lib/logger/sessionLogging';
import {
  apiSdk,
  configureWebSessionBridge,
  getApiErrorMessage,
  getApiErrorStatus,
} from '@/infrastructure/http';
import type {
  LoginCredentials,
  RegisterRequest,
  SessionUser,
} from '@xiehe/api-contracts';
import { UserSession, createUserSession } from './userSession';
import { clearPersistedAuthState, redirectToLogin } from './sessionEffects';

export type { LoginCredentials } from '@xiehe/api-contracts';
export type RegisterData = RegisterRequest;

interface LogoutOptions {
  redirectToLogin?: boolean;
}

interface SessionState {
  isAuthenticated: boolean;
  user: SessionUser | null;
  session: UserSession | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: (options?: LogoutOptions) => Promise<void>;
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
      isLoggingOut: false,
      error: null,

      login: async credentials => {
        try {
          set({ isLoading: true, isLoggingOut: false, error: null });
          sessionStoreLogging.loginRequested({
            username: credentials.username.trim(),
            rememberMe: credentials.remember_me ?? false,
          });
          const normalizedCredentials = {
            ...credentials,
            username: credentials.username.trim(),
          };
          const result = await apiSdk.auth.login(normalizedCredentials);

          set({
            isAuthenticated: true,
            user: result.user,
            session: createUserSession({
              accessToken: result.access_token,
              refreshToken: result.refresh_token,
            }),
            isLoading: false,
            isLoggingOut: false,
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
            isLoggingOut: false,
            error: getApiErrorMessage(error, '登录失败，请检查用户名和密码'),
          });
          return false;
        }
      },

      register: async userData => {
        try {
          set({ isLoading: true, error: null });
          await apiSdk.auth.register(userData);
          set({ isLoading: false, error: null });
          return true;
        } catch (error: any) {
          sessionStoreLogging.registerFailed(error);
          set({
            isLoading: false,
            error: getApiErrorMessage(error, '注册失败，请稍后重试'),
          });
          return false;
        }
      },

      logout: async (options = {}) => {
        // 立即标记登出中，让任何同步权限检查的页面可以提前停止渲染受限页
        set({ isLoggingOut: true });
        const accessToken = get().session?.accessToken;
        sessionStoreLogging.logoutRequested(get().session);

        if (options.redirectToLogin && typeof window !== 'undefined') {
          set({
            isAuthenticated: false,
            user: null,
            session: null,
            error: null,
            isLoading: false,
          });

          clearPersistedAuthState();

          if (accessToken) {
            void apiSdk.auth
              .logout({
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                timeout: 1500,
              })
              .catch(error => {
                sessionStoreLogging.logoutRequestFailed(error);
              });
          }

          redirectToLogin(0, 'replace');
          return;
        }

        try {
          if (accessToken) {
            await apiSdk.auth.logout({
              headers: { Authorization: `Bearer ${accessToken}` },
              timeout: 1500,
            });
          }
        } catch (error) {
          sessionStoreLogging.logoutRequestFailed(error);
        } finally {
          // 维持 isLoggingOut=true 直到浏览器完成跳转，避免清空 user 后闪现"访问受限"
          set({
            isAuthenticated: false,
            user: null,
            session: null,
            error: null,
            isLoading: false,
            isLoggingOut: true,
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
          const result = await apiSdk.auth.refresh(refreshToken);
          const nextAccessToken = result.tokens?.access_token;
          const nextRefreshToken = result.tokens?.refresh_token;

          if (!nextAccessToken) {
            throw new Error(
              'Refresh response does not contain data.tokens.access_token'
            );
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
          const status = getApiErrorStatus(error);
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
          isLoggingOut: true,
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

          const user = await apiSdk.auth.getSessionUser();
          set({ user });
          sessionStoreLogging.fetchUserInfoSucceeded(user);
          return 'success';
        } catch (error) {
          sessionStoreLogging.fetchUserInfoFailed({
            error,
            session: get().session,
          });
          const status = getApiErrorStatus(error);
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

          const user = await apiSdk.auth.updateSessionUser(userData);
          set({ user });
          return true;
        } catch (error) {
          sessionStoreLogging.updateUserInfoFailed(error);
          return false;
        }
      },

      hasPermission: permission =>
        get().user?.permissions?.includes(permission) || false,
      hasRole: role => get().user?.role === role,
      hasAnyPermission: permissions =>
        permissions.some(permission =>
          get().user?.permissions?.includes(permission)
        ),
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

configureWebSessionBridge({
  getAccessToken: () => useSessionStore.getState().session?.accessToken ?? null,
  refreshAccessToken: async () => {
    const refreshed = await useSessionStore.getState().refreshAccessToken();
    return refreshed
      ? (useSessionStore.getState().session?.accessToken ?? null)
      : null;
  },
  handleUnauthorized: error => {
    useSessionStore.getState().forceLogout({
      source: 'sharedAxiosClient',
      status: getApiErrorStatus(error),
    });
  },
});

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
    isLoggingOut,
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
    isLoggingOut,
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
