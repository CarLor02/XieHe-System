/**
 * 认证状态管理
 *
 * 使用 Zustand 管理用户认证状态、JWT令牌、权限等
 *
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import axios, { AxiosInstance } from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 用户信息接口
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 认证状态接口
interface AuthState {
  // 状态
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  // 认证操作
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;

  // 用户信息操作
  fetchUserInfo: () => Promise<boolean>;
  updateUserInfo: (userData: Partial<User>) => Promise<boolean>;

  // 权限检查
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;

  // 错误处理
  clearError: () => void;
  setError: (error: string) => void;

  // 加载状态
  setLoading: (loading: boolean) => void;
}

// 登录凭据接口
export interface LoginCredentials {
  username: string;
  password: string;
  remember_me?: boolean;
}

// 注册数据接口
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  full_name: string;
  phone?: string;
}

// API 基础URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 创建认证状态管理
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      // 登录
      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true, error: null });

          const response = await axios.post(
            `${API_BASE_URL}/api/v1/auth/login`,
            credentials
          );
          const { access_token, refresh_token, user } = response.data;

          set({
            isAuthenticated: true,
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            '登录失败，请检查用户名和密码';
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            isLoading: false,
            error: errorMessage,
          });
          return false;
        }
      },

      // 注册
      register: async (userData: RegisterData) => {
        try {
          set({ isLoading: true, error: null });

          await axios.post(`${API_BASE_URL}/api/v1/auth/register`, userData);

          set({ isLoading: false, error: null });
          return true;
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.detail || '注册失败，请稍后重试';
          set({ isLoading: false, error: errorMessage });
          return false;
        }
      },

      // 登出
      logout: async () => {
        try {
          const { accessToken } = get();
          if (accessToken) {
            await axios.post(
              `${API_BASE_URL}/api/v1/auth/logout`,
              {},
              {
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            error: null,
          });
        }
      },

      // 刷新访问令牌
      refreshAccessToken: async () => {
        try {
          const { refreshToken } = get();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await axios.post(
            `${API_BASE_URL}/api/v1/auth/refresh`,
            {
              refresh_token: refreshToken,
            }
          );

          const { access_token, refresh_token: newRefreshToken } =
            response.data;

          set({
            accessToken: access_token,
            refreshToken: newRefreshToken || refreshToken,
          });

          return true;
        } catch (error) {
          console.error('Token refresh error:', error);
          // 刷新失败，清除认证状态
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
          });
          return false;
        }
      },

      // 获取用户信息
      fetchUserInfo: async () => {
        try {
          const { accessToken } = get();
          if (!accessToken) {
            return false;
          }

          const response = await axios.get(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          set({ user: response.data });
          return true;
        } catch (error) {
          console.error('Fetch user info error:', error);
          return false;
        }
      },

      // 更新用户信息
      updateUserInfo: async (userData: Partial<User>) => {
        try {
          const { accessToken } = get();
          if (!accessToken) {
            return false;
          }

          const response = await axios.put(
            `${API_BASE_URL}/api/v1/auth/me`,
            userData,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          set({ user: response.data });
          return true;
        } catch (error) {
          console.error('Update user info error:', error);
          return false;
        }
      },

      // 权限检查
      hasPermission: (permission: string) => {
        const { user } = get();
        return user?.permissions?.includes(permission) || false;
      },

      // 角色检查
      hasRole: (role: string) => {
        const { user } = get();
        return user?.role === role;
      },

      // 检查是否有任一权限
      hasAnyPermission: (permissions: string[]) => {
        const { user } = get();
        if (!user?.permissions) return false;
        return permissions.some(permission =>
          user.permissions.includes(permission)
        );
      },

      // 清除错误
      clearError: () => set({ error: null }),

      // 设置错误
      setError: (error: string) => set({ error }),

      // 设置加载状态
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: state => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

// 创建带认证的 HTTP 客户端
export const createAuthenticatedClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
  });

  // 请求拦截器：自动添加认证头
  client.interceptors.request.use(
    config => {
      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    error => Promise.reject(error)
  );

  // 响应拦截器：自动处理令牌刷新
  client.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const { refreshAccessToken } = useAuthStore.getState();
        const success = await refreshAccessToken();

        if (success) {
          const { accessToken } = useAuthStore.getState();
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return client(originalRequest);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// 便捷的 Hooks
export const useAuth = () => {
  const {
    login,
    register,
    logout,
    refreshAccessToken,
    isLoading,
    error,
    clearError,
    setError,
    setLoading,
  } = useAuthStore();

  return {
    login,
    register,
    logout,
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
  } = useAuthStore();

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
  const { hasPermission, hasRole, hasAnyPermission, user } = useAuthStore();

  return {
    hasPermission,
    hasRole,
    hasAnyPermission,
    permissions: user?.permissions || [],
    role: user?.role,
  };
};
