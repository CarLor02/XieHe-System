import { getApiErrorStatus } from '@xiehe/api-client';
import { createStellarmeshHttp } from '@xiehe/api-client/stellarmesh';
import { createXieheApiSdk, type XieheApiSdk } from '@xiehe/api-sdk';
import { createAuthApi } from '@xiehe/api-sdk/api/authApi';

import {
  createSecureSessionTokenStore,
  type MobileSessionTokenStore,
} from '@/infrastructure/auth';
import { getExpoApiBaseUrl } from './config';

export interface ExpoApiInfrastructure {
  apiSdk: XieheApiSdk;
  tokenStore: MobileSessionTokenStore;
}

export interface CreateExpoApiInfrastructureOptions {
  apiBaseUrl?: string;
  tokenStore?: MobileSessionTokenStore;
  onUnauthorized?: () => void | Promise<void>;
}

export function createExpoApiInfrastructure(
  options: CreateExpoApiInfrastructureOptions = {}
): ExpoApiInfrastructure {
  const baseURL = options.apiBaseUrl ?? getExpoApiBaseUrl();
  const tokenStore =
    options.tokenStore ?? createSecureSessionTokenStore(baseURL);
  const publicHttp = createStellarmeshHttp({ baseURL });
  const authApi = createAuthApi(publicHttp);
  const http = createStellarmeshHttp({
    baseURL,
    tokenProvider: tokenStore,
    getSessionEpoch: () => tokenStore.getSessionEpoch(),
    refreshSession: async () => {
      const refreshToken = await tokenStore.getRefreshToken();
      if (!refreshToken) return null;

      try {
        const response = await authApi.requestRefreshToken({
          refresh_token: refreshToken,
        });
        const accessToken = response.tokens?.access_token;
        if (!accessToken) throw new Error('刷新响应缺少访问令牌');
        await tokenStore.save({
          accessToken,
          refreshToken: response.tokens.refresh_token,
        });
        return { accessToken };
      } catch (error) {
        // 仅明确失效才退出；网络、服务或保存失败保留当前会话，允许重试。
        if ([401, 403].includes(getApiErrorStatus(error) ?? 0)) return null;
        throw error;
      }
    },
    onUnauthorized: async () => {
      await tokenStore.clear();
      await options.onUnauthorized?.();
    },
  });
  const apiSdk = createXieheApiSdk({ http });

  return { apiSdk, tokenStore };
}
