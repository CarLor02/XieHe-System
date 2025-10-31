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
  is_system_admin?: boolean; // 是否系统管理员（可创建团队）
  system_admin_level?: number; // 系统管理员级别：0-非系统管理员，1-超级系统管理员，2-二级系统管理员
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
  forceLogout: () => void;

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
// 开发环境：使用 NEXT_PUBLIC_API_URL 直接访问后端 (http://127.0.0.1:8000)
// 生产环境：使用环境变量或空字符串（相对路径）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
          let errorMessage = '登录失败，请检查用户名和密码';

          if (error.response) {
            // 服务器返回了错误响应
            errorMessage = error.response.data?.message ||
                          error.response.data?.detail ||
                          `服务器错误 (${error.response.status})`;
          } else if (error.request) {
            // 请求已发出但没有收到响应
            errorMessage = '无法连接到服务器，请检查网络连接';
          } else {
            // 请求配置出错
            errorMessage = error.message || '登录请求失败';
          }

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

          // 处理嵌套的tokens结构
          const tokens = response.data.tokens || response.data;
          const { access_token, refresh_token: newRefreshToken } = tokens;

          set({
            accessToken: access_token,
            refreshToken: newRefreshToken || refreshToken,
          });

          return true;
        } catch (error) {
          console.error('Token refresh error:', error);
          // 刷新失败，强制退出登录并跳转到登录页
          get().forceLogout();
          return false;
        }
      },

      // 强制退出登录并跳转到登录页
      forceLogout: () => {
        // 清除认证状态
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          error: '认证已过期，请重新登录',
        });

        // 跳转到登录页
        if (typeof window !== 'undefined') {
          // 使用 window.location.href 确保完全刷新页面
          // 这样可以清除所有缓存的数据
          setTimeout(() => {
            window.location.href = '/auth/login';
          }, 500);
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
    baseURL: API_BASE_URL, // 使用与登录相同的 API_BASE_URL
    maxRedirects: 0, // 禁用自动重定向，避免 308 重定向问题
    validateStatus: status => status < 500, // 不要在 3xx 和 4xx 时抛出错误
  });

  // 请求拦截器：自动添加认证头，并移除末尾斜杠
  client.interceptors.request.use(
    config => {
      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      // 移除 URL 中的末尾斜杠（在查询参数之前）
      if (config.url && config.url.includes('?')) {
        const [path, query] = config.url.split('?');
        if (path.endsWith('/') && path !== '/') {
          config.url = path.slice(0, -1) + '?' + query;
        }
      } else if (config.url && config.url.endsWith('/') && config.url !== '/') {
        config.url = config.url.slice(0, -1);
      }

      return config;
    },
    error => Promise.reject(error)
  );

  // 响应拦截器：自动处理令牌刷新和重定向
  client.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      // 处理 404 错误 - 尝试添加末尾斜杠重试
      if (
        error.response?.status === 404 &&
        !originalRequest._trailingSlashRetried
      ) {
        originalRequest._trailingSlashRetried = true;
        const url = originalRequest.url;

        // 如果 URL 不以斜杠结尾，尝试添加斜杠重试
        if (url && !url.endsWith('/') && !url.includes('?')) {
          try {
            const retryConfig = {
              ...originalRequest,
              url: url + '/',
            };
            console.warn(
              `404 on ${url}, retrying with trailing slash: ${url}/`
            );
            return client(retryConfig);
          } catch (retryError) {
            console.error('Trailing slash retry error:', retryError);
            return Promise.reject(retryError);
          }
        }
      }

      // 处理 307 临时重定向 - 保留认证头
      if (error.response?.status === 307 && !originalRequest._redirected) {
        originalRequest._redirected = true;
        const redirectUrl = error.response.headers.location;

        if (redirectUrl) {
          try {
            // 重新发送请求到重定向的 URL，保留认证头
            const { accessToken } = useAuthStore.getState();
            const redirectConfig = {
              ...originalRequest,
              url: redirectUrl,
            };

            if (accessToken) {
              redirectConfig.headers.Authorization = `Bearer ${accessToken}`;
            }

            return client(redirectConfig);
          } catch (redirectError) {
            console.error('Redirect error:', redirectError);
            return Promise.reject(redirectError);
          }
        }
      }

      // 处理 401 未授权错误
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const { refreshAccessToken, isAuthenticated } =
            useAuthStore.getState();

          // 如果还没有认证，不要尝试刷新令牌
          if (!isAuthenticated) {
            return Promise.reject(error);
          }

          const success = await refreshAccessToken();

          if (success) {
            const { accessToken } = useAuthStore.getState();
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return client(originalRequest);
          } else {
            // 刷新失败，强制退出登录
            const { forceLogout } = useAuthStore.getState();
            forceLogout();
            return Promise.reject(
              new Error('Authentication failed, redirecting to login')
            );
          }
        } catch (refreshError) {
          console.error('Token refresh error:', refreshError);
          // 刷新异常，强制退出登录
          const { forceLogout } = useAuthStore.getState();
          forceLogout();
          return Promise.reject(refreshError);
        }
      }

      // 处理其他 401 错误（没有重试机会的情况）
      if (error.response?.status === 401 && originalRequest._retry) {
        const { forceLogout } = useAuthStore.getState();
        forceLogout();
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
    forceLogout,
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
