import {
  ApiClientError,
  isApiClientError,
  getApiErrorMessage,
  type ApiErrorDetails,
} from '../contracts/api-error';
import {
  AuthRefreshResult,
  createAuthSession,
  flattenEnvelopeResponse,
  http as rootHttp,
  isHttpClientError,
  type HttpApi,
  type HttpRequestOptions as SdkRequestOptions,
} from '@stellarmesh/sdk';

import type {
  HttpClient,
  HttpRequest,
  HttpRequestOptions,
} from '../application/http-client';
import type {
  RefreshSession,
  TokenProvider,
  UnauthorizedHandler,
} from '../application/session';

interface HttpDefaults {
  baseURL?: string;
  raw?: boolean;
}

type RecoveryOptions =
  | { refreshSession: RefreshSession; onUnauthorized?: UnauthorizedHandler }
  | { refreshSession?: never; onUnauthorized?: never };

export type CreateStellarmeshHttpOptions = HttpDefaults &
  (
    | {
        tokenProvider?: never;
        getSessionEpoch?: never;
        refreshSession?: never;
        onUnauthorized?: never;
      }
    | ({
        tokenProvider: TokenProvider;
        getSessionEpoch: () => string | number;
      } & RecoveryOptions)
  );

export function createStellarmeshHttp(
  options: CreateStellarmeshHttpOptions = {}
): HttpApi {
  let http = rootHttp.withBaseURL(options.baseURL ?? '');
  if (!options.raw) {
    http = http.withResponseTransform(flattenEnvelopeResponse());
  }
  const tokenProvider = options.tokenProvider;
  if (!tokenProvider) return http;

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await tokenProvider.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const base = {
    getSessionEpoch: options.getSessionEpoch,
    getAuthHeaders: authHeaders,
  };
  const refreshSession = options.refreshSession;
  const session = createAuthSession(
    refreshSession
      ? {
          ...base,
          shouldRefresh: error => error.status === 401,
          refreshSession: async () =>
            (await refreshSession())
              ? AuthRefreshResult.REFRESHED
              : AuthRefreshResult.EXPIRED,
          onUnauthorized: options.onUnauthorized,
        }
      : base
  );
  return http.withAuth(session);
}

function requestOptions(
  options: HttpRequestOptions
): Omit<SdkRequestOptions, 'params'> {
  return {
    headers: options.headers,
    timeout: options.timeout,
    signal: options.signal,
    auth: options.auth === 'none' ? false : undefined,
    responseMode: options.responseMode === 'raw' ? 'raw' : undefined,
    responseType: options.responseType,
    onUploadProgress: options.onUploadProgress,
  };
}

/** 上传用例依赖字节传输端口；SDK 的声明式对象仅在适配器中出现。 */
export function createHttpClientAdapter(http: HttpApi): HttpClient {
  const descriptor = <T>(input: HttpRequest<T>) => ({
    method: input.method,
    url: input.url,
    data: input.data,
    params: input.params,
  });
  const request: HttpClient['request'] = <TResponse, TBody = unknown>(
    input: HttpRequest<TBody>
  ) =>
    http.request<HttpRequest<TBody>, TResponse>(descriptor)(
      input,
      requestOptions(input)
    );
  return {
    request,
    requestWithMetadata: <TResponse, TBody = unknown>(
      input: HttpRequest<TBody>
    ) =>
      http.withMetadata().request<HttpRequest<TBody>, TResponse>(descriptor)(
        input,
        requestOptions(input)
      ),
    get: (url, options) => request({ method: 'GET', url, ...options }),
    post: (url, data, options) =>
      request({ method: 'POST', url, data, ...options }),
    put: (url, data, options) =>
      request({ method: 'PUT', url, data, ...options }),
    patch: (url, data, options) =>
      request({ method: 'PATCH', url, data, ...options }),
    delete: (url, options) => request({ method: 'DELETE', url, ...options }),
  };
}

/** UI 保持项目错误语义，传输与认证恢复由 Stellarmesh SDK 负责。 */
export function normalizeApiError(error: unknown): ApiClientError {
  if (isApiClientError(error)) return error;
  if (isHttpClientError(error)) {
    const body =
      error.data && typeof error.data === 'object'
        ? (error.data as Record<string, unknown>)
        : undefined;
    return new ApiClientError(error.message, {
      status: error.status,
      apiCode: typeof error.apiCode === 'number' ? error.apiCode : undefined,
      errorCode:
        typeof body?.error_code === 'string' ? body.error_code : undefined,
      details: body?.details as ApiErrorDetails | undefined,
      data: error.data,
      isNetworkError: error.kind === 'network',
      isTimeoutError: error.kind === 'timeout',
      cause: error,
    });
  }
  return new ApiClientError(getApiErrorMessage(error), { cause: error });
}
