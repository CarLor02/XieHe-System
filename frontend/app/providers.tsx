'use client';

/**
 * 全局提供者组件
 *
 * 初始化全局状态、错误处理、认证等
 *
 * @author XieHe Medical System
 * @created 2025-10-16
 */

import { refreshAccessTokenWithLock, useSessionStore } from '@/lib/api';
import { hasUsableSession } from '@/lib/api/session/sessionStore';
import { sessionInitializerLogging } from '@/lib/logger/sessionLogging';
import React, { useEffect, useState } from 'react';

interface ProvidersProps {
  children: React.ReactNode;
}

type PersistApi = {
  hasHydrated?: () => boolean;
  onHydrate?: (listener: () => void) => () => void;
  onFinishHydration?: (listener: () => void) => () => void;
};

function getPersistApi(): PersistApi | undefined {
  return (useSessionStore as typeof useSessionStore & { persist?: PersistApi })
    .persist;
}

/**
 * 认证初始化组件
 * 在应用启动时初始化认证状态
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isHydrated, setIsHydrated] = useState(() => {
    const persist = getPersistApi();
    return persist?.hasHydrated?.() ?? true;
  });
  const {
    isAuthenticated,
    session,
    fetchUserInfoStatus,
    forceLogout,
  } = useSessionStore();
  const accessToken = session?.accessToken;
  const refreshToken = session?.refreshToken;
  const accessTokenExpiresAtEpochSeconds =
    session?.accessTokenExpiresAtEpochSeconds;
  const hasStoredSession = hasUsableSession(session);

  useEffect(() => {
    const persist = getPersistApi();

    if (!persist) {
      sessionInitializerLogging.persistApiUnavailable();
      setIsHydrated(true);
      return;
    }

    if (persist.hasHydrated?.()) {
      sessionInitializerLogging.persistAlreadyHydrated();
      setIsHydrated(true);
      return;
    }

    const unsubscribeHydrate = persist.onHydrate?.(() => {
      sessionInitializerLogging.persistHydrationStarted();
      setIsHydrated(false);
    });
    const unsubscribeFinishHydration = persist.onFinishHydration?.(() => {
      sessionInitializerLogging.persistHydrationFinished({
        isAuthenticated: useSessionStore.getState().isAuthenticated,
      });
      setIsHydrated(true);
    });

    return () => {
      unsubscribeHydrate?.();
      unsubscribeFinishHydration?.();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    // 初始化认证状态
    const initializeAuth = async () => {
      try {
        sessionInitializerLogging.initializeStarted({
          isAuthenticated,
          hasStoredSession,
          accessTokenExpiresAtEpochSeconds,
          session,
        });
        // 只要本地有可用 session，就按已登录态恢复并校验
        if (hasStoredSession && accessToken) {
          // 尝试获取用户信息来验证 token 是否有效
          let status = await fetchUserInfoStatus();
          sessionInitializerLogging.initializeStatus(status);

          if (status === 'unauthorized' && refreshToken) {
            sessionInitializerLogging.initializeRefreshAttempt();
            const refreshed = await refreshAccessTokenWithLock();
            sessionInitializerLogging.initializeRefreshResult(refreshed);
            if (refreshed) {
              status = await fetchUserInfoStatus();
              sessionInitializerLogging.initializePostRefreshStatus(status);
            }
          }

          if (status === 'unauthorized') {
            sessionInitializerLogging.initializeForceLogout(status);
            forceLogout({
              source: 'providers.initializeAuth',
              status,
            });
          }
        }
      } catch (error) {
        sessionInitializerLogging.initializeFailed(error);
      } finally {
        // 立即标记为已初始化，不要等待异步操作
        sessionInitializerLogging.initializeFinished();
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [
    isHydrated,
    accessToken,
    hasStoredSession,
    refreshToken,
    fetchUserInfoStatus,
    forceLogout,
  ]);

  useEffect(() => {
    if (
      !isHydrated ||
      !hasStoredSession ||
      !refreshToken ||
      !accessTokenExpiresAtEpochSeconds
    ) {
      return;
    }

    const refreshLeadTimeMs = 2 * 60 * 1000;
    const minDelayMs = 30 * 1000;
    const expiresAtMs = accessTokenExpiresAtEpochSeconds * 1000;
    const delayMs = Math.max(expiresAtMs - Date.now() - refreshLeadTimeMs, minDelayMs);
    sessionInitializerLogging.scheduledRefreshPlanned({
      accessTokenExpiresAtEpochSeconds,
      delayMs,
      refreshLeadTimeMs,
    });

    const timer = window.setTimeout(async () => {
      try {
        sessionInitializerLogging.scheduledRefreshTriggered();
        const refreshed = await refreshAccessTokenWithLock();
        if (!refreshed) {
          forceLogout({
            source: 'providers.scheduledRefresh',
            reason: 'refresh-returned-false',
          });
        }
      } catch (error) {
        sessionInitializerLogging.scheduledRefreshFailed(error);
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    isHydrated,
    hasStoredSession,
    refreshToken,
    accessTokenExpiresAtEpochSeconds,
    forceLogout,
  ]);

  useEffect(() => {
    if (
      !isHydrated ||
      !hasStoredSession ||
      !refreshToken ||
      !accessTokenExpiresAtEpochSeconds
    ) {
      return;
    }

    const refreshLeadTimeMs = 2 * 60 * 1000;

    const maybeRefreshOnResume = async () => {
      const expiresAtMs = accessTokenExpiresAtEpochSeconds * 1000;
      const remainingMs = expiresAtMs - Date.now();
      sessionInitializerLogging.resumeCheck({
        remainingMs,
        refreshLeadTimeMs,
      });
      if (remainingMs > refreshLeadTimeMs) {
        return;
      }

      try {
        sessionInitializerLogging.resumeRefreshTriggered();
        const refreshed = await refreshAccessTokenWithLock();
        if (!refreshed) {
          forceLogout({
            source: 'providers.resumeRefresh',
            reason: 'refresh-returned-false',
            remainingMs,
          });
        }
      } catch (error) {
        sessionInitializerLogging.resumeRefreshFailed(error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void maybeRefreshOnResume();
      }
    };

    const handleFocus = () => {
      void maybeRefreshOnResume();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [
    isHydrated,
    hasStoredSession,
    refreshToken,
    accessTokenExpiresAtEpochSeconds,
    forceLogout,
  ]);

  // 等待初始化完成
  if (!isHydrated || !isInitialized) {
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
