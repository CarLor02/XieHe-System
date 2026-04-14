import { API_BASE_URL } from './config';
import { createLogger } from '@/lib/logger';
import { sessionFetchClientLogging } from '@/lib/logger/sessionLogging';
import {
  extractApiMessage,
  getStatusCode,
  isApiEnvelope,
  isApiSuccessCode,
  unwrapApiPayload,
} from './types';
import { refreshAccessTokenWithLock } from './session/sessionRefresher';
import {
  hasUsableSession,
  useSessionStore,
} from './session/sessionStore';
import { redirectToLogin } from './session/sessionEffects';
import { createApiClientError, type ApiClientError } from './client/errors';
import { parseResponsePayload } from './client/responsePayload';

const logger = createLogger('api.fetchClient');

type AuthFetchOptions = {
  retryOn401?: boolean;
};

function withAuthorizationHeader(
  headers: HeadersInit | undefined,
  accessToken: string | null | undefined
): Headers {
  const mergedHeaders = new Headers(headers);
  if (accessToken) {
    mergedHeaders.set('Authorization', `Bearer ${accessToken}`);
  }
  return mergedHeaders;
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: AuthFetchOptions = {}
): Promise<Response> {
  const { retryOn401 = true } = options;
  const session = useSessionStore.getState().session;

  logger.debug('fetch request', input);
  let response = await fetch(input, {
    ...init,
    headers: withAuthorizationHeader(init.headers, session?.accessToken),
  });

  if (response.status === 401 && retryOn401 && hasUsableSession(session)) {
    sessionFetchClientLogging.unauthorizedRetryStarted({
      request: String(input),
      session,
    });
    try {
      const refreshed = await refreshAccessTokenWithLock();
      if (refreshed) {
        const nextToken = useSessionStore.getState().session?.accessToken;
        response = await fetch(input, {
          ...init,
          headers: withAuthorizationHeader(init.headers, nextToken),
        });
      }
    } catch (refreshError) {
      sessionFetchClientLogging.refreshFailed(refreshError);
      throw refreshError;
    }
  }

  logger.debug('fetch response', response.status, input);
  return response;
}

export async function authenticatedJsonFetch<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: AuthFetchOptions = {}
): Promise<T> {
  const response = await authenticatedFetch(input, init, options);
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw createApiClientError(
      extractApiMessage(payload) || `HTTP ${response.status}`,
      {
        status: response.status,
        data: payload,
        response,
      }
    );
  }

  if (isApiEnvelope(payload) && !isApiSuccessCode(payload.code)) {
    throw createApiClientError(
      extractApiMessage(payload) || '请求失败',
      {
        status: response.status,
        data: payload,
        response,
        apiCode: payload.code,
      }
    );
  }

  return unwrapApiPayload<T>(payload);
}

export async function authenticatedBlobFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: AuthFetchOptions = {}
): Promise<Blob> {
  const response = await authenticatedFetch(input, init, options);
  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw createApiClientError(
      extractApiMessage(payload) || `HTTP ${response.status}`,
      {
        status: response.status,
        data: payload,
        response,
      }
    );
  }
  return response.blob();
}

export function isAuthError(error: any): boolean {
  if (getStatusCode(error) === 401) {
    return true;
  }

  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('认证') ||
    message.includes('authentication') ||
    message.includes('unauthorized') ||
    message.includes('token') ||
    message.includes('登录') ||
    message.includes('redirecting to login')
  );
}

export function handleAuthError(
  error: any,
  options: {
    showAlert?: boolean;
    alertMessage?: string;
    redirectDelay?: number;
  } = {}
): void {
  const {
    showAlert = true,
    alertMessage = '登录已过期，请重新登录',
    redirectDelay = 500,
  } = options;

  sessionFetchClientLogging.authErrorHandled(error);

  if (showAlert && typeof window !== 'undefined') {
    alert(alertMessage);
  }

  redirectToLogin(redirectDelay);
}

export function checkAndHandleAuthError(
  error: any,
  options?: {
    showAlert?: boolean;
    alertMessage?: string;
    redirectDelay?: number;
  }
): boolean {
  if (isAuthError(error)) {
    handleAuthError(error, options);
    return true;
  }
  return false;
}

export function getErrorMessage(
  error: any,
  defaultMessage: string = '操作失败，请重试'
): string {
  if (isAuthError(error)) {
    return '登录已过期，正在跳转到登录页...';
  }

  const apiMessage = extractApiMessage(error?.response?.data || error?.data);
  if (apiMessage) {
    return apiMessage;
  }

  const status = getStatusCode(error);
  if (status) {
    switch (status) {
      case 400:
        return '请求参数错误';
      case 403:
        return '没有权限执行此操作';
      case 404:
        return '请求的资源不存在';
      case 500:
        return '服务器错误，请稍后重试';
      case 503:
        return '服务暂时不可用，请稍后重试';
      default:
        return defaultMessage;
    }
  }

  if (!error.response && !error.status) {
    return '网络连接失败，请检查网络后重试';
  }

  return defaultMessage;
}

export function withAuthErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    showAlert?: boolean;
    alertMessage?: string;
    onAuthError?: () => void;
  }
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (checkAndHandleAuthError(error, options)) {
        options?.onAuthError?.();
        throw error;
      }
      throw error;
    }
  }) as T;
}

export { API_BASE_URL };
