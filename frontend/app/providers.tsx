'use client';

/**
 * 全局提供者组件
 *
 * 初始化全局状态、错误处理、认证等
 *
 * @author XieHe Medical System
 * @created 2025-10-16
 */

import { useAuthStore } from '@/store/authStore';
import React, { useEffect, useState } from 'react';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * 认证初始化组件
 * 在应用启动时初始化认证状态
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isAuthenticated, accessToken, fetchUserInfo } = useAuthStore();

  useEffect(() => {
    // 初始化认证状态
    const initializeAuth = async () => {
      try {
        // 只在有访问令牌且已认证时才尝试验证 token
        if (accessToken && isAuthenticated) {
          // 尝试获取用户信息来验证 token 是否有效
          const success = await fetchUserInfo();

          if (!success) {
            // Token 无效或已过期，清除认证状态
            console.warn('Token validation failed, clearing auth state');
            useAuthStore.setState({
              isAuthenticated: false,
              user: null,
              accessToken: null,
              refreshToken: null,
            });
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        // 立即标记为已初始化，不要等待异步操作
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [accessToken, isAuthenticated, fetchUserInfo]);

  // 等待初始化完成
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化应用...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * 全局提供者组件
 * 包装应用的根组件，提供全局状态和错误处理
 */
export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthInitializer>{children}</AuthInitializer>
  );
}
