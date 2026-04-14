import axios, { AxiosHeaders, AxiosInstance } from 'axios';
import { API_BASE_URL } from './config';
import { createLogger } from '@/lib/logger';
import { sessionAuthenticatedClientLogging } from '@/lib/logger/sessionLogging';
import {
  isApiEnvelope,
  isApiSuccessCode,
} from './types';
import { refreshAccessTokenWithLock } from './session/sessionRefresher';
import {
  hasUsableSession,
  useSessionStore,
} from './session/sessionStore';
import {
  shouldAttachAuthorization,
  shouldSkipAuthRefresh,
} from './client/authRequest';
import { createApiEnvelopeError } from './client/errors';

const logger = createLogger('api.authenticatedClient');

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

      if (accessToken && shouldAttachAuthorization(config)) {
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
        const session = useSessionStore.getState().session;
        sessionAuthenticatedClientLogging.unauthorizedRetryStarted({
          url: originalRequest.url,
          method: originalRequest.method,
          isAuthenticated: useSessionStore.getState().isAuthenticated,
          session,
        });

        if (!hasUsableSession(session)) {
          sessionAuthenticatedClientLogging.unauthorizedWithoutSession(
            originalRequest.url
          );
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
            sessionAuthenticatedClientLogging.retryingRequest({
              url: originalRequest.url,
              method: originalRequest.method,
            });
            return client(originalRequest);
          }
        } catch (refreshError) {
          sessionAuthenticatedClientLogging.refreshRequestFailed(refreshError);
          return Promise.reject(refreshError);
        }

        sessionAuthenticatedClientLogging.refreshFailedForcingLogout({
          url: originalRequest.url,
          method: originalRequest.method,
          status: error.response?.status,
        });
        useSessionStore.getState().forceLogout({
          source: 'authenticatedApiClient.refreshRetry',
          url: originalRequest.url,
          method: originalRequest.method,
          status: error.response?.status,
        });
      }

      if (error.response?.status === 401 && originalRequest._retry) {
        sessionAuthenticatedClientLogging.retryStillUnauthorized({
          url: originalRequest.url,
          method: originalRequest.method,
          status: error.response?.status,
        });
        useSessionStore.getState().forceLogout({
          source: 'authenticatedApiClient.retryUnauthorized',
          url: originalRequest.url,
          method: originalRequest.method,
          status: error.response?.status,
        });
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
