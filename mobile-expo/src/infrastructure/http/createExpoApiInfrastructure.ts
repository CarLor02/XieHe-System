import type { HttpClient } from '@xiehe/api-client';
import { createAxiosHttpClient } from '@xiehe/api-client/axios';
import { createXieheApiSdk, type XieheApiSdk } from '@xiehe/api-sdk';

import {
  createSecureSessionTokenStore,
  type MobileSessionTokenStore,
} from '../auth';
import { getExpoApiBaseUrl } from './config';

export interface ExpoApiInfrastructure {
  apiClient: HttpClient;
  publicApiClient: HttpClient;
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
  const tokenStore = options.tokenStore ?? createSecureSessionTokenStore();
  const publicApiClient = createAxiosHttpClient({
    baseURL,
    defaultAuth: 'none',
    retryTrailingSlash404: true,
  });
  const publicSdk = createXieheApiSdk({
    apiClient: publicApiClient,
    publicApiClient,
  });
  const apiClient = createAxiosHttpClient({
    baseURL,
    tokenProvider: tokenStore,
    retryTrailingSlash404: true,
    refreshSession: async () => {
      const refreshToken = await tokenStore.getRefreshToken();
      if (!refreshToken) return null;

      const response = await publicSdk.auth.refresh(refreshToken);
      const accessToken = response.tokens?.access_token;
      if (!accessToken) return null;

      await tokenStore.save({
        accessToken,
        refreshToken: response.tokens?.refresh_token ?? refreshToken,
      });
      return { accessToken };
    },
    onUnauthorized: async () => {
      await tokenStore.clear();
      await options.onUnauthorized?.();
    },
  });
  const apiSdk = createXieheApiSdk({ apiClient, publicApiClient });

  return { apiClient, publicApiClient, apiSdk, tokenStore };
}
