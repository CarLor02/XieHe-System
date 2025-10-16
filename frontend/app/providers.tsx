'use client';

/**
 * 全局提供者组件
 *
 * 初始化全局状态、错误处理、认证等
 *
 * @author XieHe Medical System
 * @created 2025-10-16
 */

import ErrorBoundary from '@/components/common/ErrorBoundary';
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
  const { isAuthenticated, accessToken } = useAuthStore();

  useEffect(() => {
    // 初始化认证状态
    const initializeAuth = async () => {
      try {
        // 只在有访问令牌且已认证时才尝试获取用户信息
        // 避免在未登录时触发 401 错误导致无限循环
        if (accessToken && isAuthenticated) {
          // 用户信息会在登录时自动获取，这里不需要重复获取
          // 如果需要刷新用户信息，可以在特定页面中调用
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        // 立即标记为已初始化，不要等待异步操作
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [accessToken, isAuthenticated]);

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
    <ErrorBoundary
      showDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo) => {
        console.error('Error caught by boundary:', error, errorInfo);
      }}
    >
      <AuthInitializer>{children}</AuthInitializer>
    </ErrorBoundary>
  );
}
