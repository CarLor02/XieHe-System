import { createAxiosHttpClient } from '@xiehe/api-client/axios';
import type { HttpClient } from '@xiehe/api-client';

import { createLogger } from '@/lib/logger';

import { API_BASE_URL } from './config';
import { webSessionBridge } from './sessionBridge';

const logger = createLogger('infrastructure.http');

const apiLogger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    logger.debug(message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    logger.warn(message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    logger.error(message, context),
};

export const publicApiClient = createAxiosHttpClient({
  baseURL: API_BASE_URL,
  defaultAuth: 'none',
  retryTrailingSlash404: true,
  logger: apiLogger,
});

export const apiClient = createAxiosHttpClient({
  baseURL: API_BASE_URL,
  tokenProvider: {
    getAccessToken: () => webSessionBridge.getAccessToken(),
  },
  refreshSession: async () => {
    const accessToken = await webSessionBridge.refreshAccessToken();
    return accessToken ? { accessToken } : null;
  },
  onUnauthorized: error => webSessionBridge.handleUnauthorized(error),
  retryTrailingSlash404: true,
  logger: apiLogger,
});

export const objectStorageClient = createAxiosHttpClient({
  defaultAuth: 'none',
  defaultResponseMode: 'raw',
  logger: apiLogger,
});

export function createExternalHttpClient(
  options: {
    baseURL?: string;
    headers?: Record<string, string>;
  } = {}
): HttpClient {
  return createAxiosHttpClient({
    baseURL: options.baseURL,
    defaultAuth: 'none',
    defaultResponseMode: 'raw',
    axios: { headers: options.headers },
    logger: apiLogger,
  });
}
