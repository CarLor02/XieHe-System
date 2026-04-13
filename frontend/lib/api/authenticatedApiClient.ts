import axios, { AxiosHeaders, AxiosInstance } from 'axios';
import { API_BASE_URL } from './config';
import { createLogger } from '@/lib/logger';
import {
  extractApiMessage,
  isApiEnvelope,
  isApiSuccessCode,
} from './types';
import { refreshAccessTokenWithLock } from './session/sessionRefresher';
import { useSessionStore } from './session/sessionStore';

const logger = createLogger('api.authenticatedClient');

function shouldSkipAuthRefresh(config: any): boolean {
  return Boolean(
    config?._skipAuthRefresh ||
      config?.url?.includes('/api/v1/auth/refresh')
  );
}

function createApiEnvelopeError(data: any, response?: any) {
  const error = new Error(
    extractApiMessage(data) || '请求失败'
  ) as Error & {
    data?: any;
    response?: any;
    apiCode?: number;
    status?: number;
  };
  error.data = data;
  error.response = response;
  error.apiCode = data?.code;
  error.status = response?.status;
  return error;
}

function buildAuthenticatedClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    maxRedirects: 0,
  });

  client.interceptors.request.use(
    async config => {
      const accessToken = useSessionStore.getState().session?.accessToken;
      logger.debug('request', config.method?.toUpperCase(), config.url);

      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      if (config.url && config.url.includes('?')) {
        const [path, query] = config.url.split('?');
        if (path.endsWith('/') && path !== '/') {
          config.url = `${path.slice(0, -1)}?${query}`;
        }
      } else if (config.url && config.url.endsWith('/') && config.url !== '/') {
        config.url = config.url.slice(0, -1);
      }

      return config;
    },
    error => Promise.reject(error)
  );

  client.interceptors.response.use(
    response => {
      if (
        isApiEnvelope(response.data) &&
        !isApiSuccessCode(response.data.code)
      ) {
        logger.warn('api envelope rejected', response.config.url, response.data.code);
        return Promise.reject(createApiEnvelopeError(response.data, response));
      }

      logger.debug('response', response.status, response.config.url);
      return response;
    },
    async error => {
      const originalRequest = error.config;
      if (!originalRequest) {
        return Promise.reject(error);
      }

      if (
        error.response?.status === 404 &&
        !originalRequest._trailingSlashRetried
      ) {
        originalRequest._trailingSlashRetried = true;
        const url = originalRequest.url;
        if (url && !url.endsWith('/') && !url.includes('?')) {
          logger.debug('retry 404 with trailing slash', url);
          return client({ ...originalRequest, url: `${url}/` });
        }
      }

      if (error.response?.status === 307 && !originalRequest._redirected) {
        originalRequest._redirected = true;
        const redirectUrl = error.response.headers.location;
        if (redirectUrl) {
          logger.debug('follow 307 redirect', redirectUrl);
          return client({ ...originalRequest, url: redirectUrl });
        }
      }

      if (error.response?.status === 401 && shouldSkipAuthRefresh(originalRequest)) {
        logger.warn('skip auth refresh for request', originalRequest.url);
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        logger.info('401 received, attempting refresh', originalRequest.url);

        const isAuthenticated = useSessionStore.getState().isAuthenticated;
        if (!isAuthenticated) {
          return Promise.reject(error);
        }

        try {
          const success = await refreshAccessTokenWithLock();
          if (success) {
            const accessToken = useSessionStore.getState().session?.accessToken;
            if (!originalRequest.headers) {
              originalRequest.headers = new AxiosHeaders();
            }
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            logger.info('refresh succeeded, retrying request', originalRequest.url);
            return client(originalRequest);
          }
        } catch (refreshError) {
          logger.warn('refresh request failed, keeping session intact', refreshError);
          return Promise.reject(refreshError);
        }

        logger.warn('refresh failed, forcing logout');
        useSessionStore.getState().forceLogout();
      }

      if (error.response?.status === 401 && originalRequest._retry) {
        logger.warn('request still unauthorized after refresh', originalRequest.url);
        useSessionStore.getState().forceLogout();
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export const authenticatedApiClient = buildAuthenticatedClient();
export const apiClient = authenticatedApiClient;

export function createAuthenticatedClient(): AxiosInstance {
  return authenticatedApiClient;
}
