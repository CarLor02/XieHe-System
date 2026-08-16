import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type CreateAxiosDefaults,
} from 'axios';

import type {
  AuthMode,
  HttpClient,
  HttpRequest,
  HttpRequestOptions,
  HttpResponse,
} from '../../application/http-client';
import type {
  ApiClientLogger,
  RefreshSession,
  TokenProvider,
  UnauthorizedHandler,
} from '../../application/session';
import {
  ApiClientError,
  extractApiMessage,
  isApiEnvelope,
  isApiSuccessCode,
  unwrapApiEnvelope,
  type ApiErrorDetails,
} from '../../contracts';

export interface CreateAxiosHttpClientOptions {
  baseURL?: string;
  tokenProvider?: TokenProvider;
  refreshSession?: RefreshSession;
  onUnauthorized?: UnauthorizedHandler;
  logger?: ApiClientLogger;
  defaultAuth?: AuthMode;
  defaultResponseMode?: 'envelope' | 'raw';
  retryTrailingSlash404?: boolean;
  axios?: CreateAxiosDefaults;
}

interface InternalRequestState {
  retriedAfterRefresh: boolean;
  retriedWithTrailingSlash: boolean;
}

interface ExecuteOptions {
  includeMetadata: boolean;
}

function getOrigin(url: string | undefined): string | null {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function shouldAttachAuthorization(
  url: string,
  baseURL: string | undefined,
  auth: AuthMode
): boolean {
  if (auth === 'none') return false;
  const requestOrigin = getOrigin(url);
  if (!requestOrigin) return true;
  const baseOrigin = getOrigin(baseURL);
  return baseOrigin !== null && requestOrigin === baseOrigin;
}

function normalizeError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;
  if (!axios.isAxiosError(error)) {
    return new ApiClientError(
      error instanceof Error ? error.message : '请求失败',
      { cause: error }
    );
  }

  const axiosError = error as AxiosError<unknown>;
  const data = axiosError.response?.data;
  const envelope =
    data !== null && typeof data === 'object'
      ? (data as Record<string, unknown>)
      : undefined;
  return new ApiClientError(
    extractApiMessage(data) || axiosError.message || '请求失败',
    {
      status: axiosError.response?.status,
      apiCode: typeof envelope?.code === 'number' ? envelope.code : undefined,
      errorCode:
        typeof envelope?.error_code === 'string'
          ? envelope.error_code
          : undefined,
      details: envelope?.details as ApiErrorDetails | undefined,
      data,
      isNetworkError: Boolean(axiosError.request && !axiosError.response),
      isTimeoutError:
        axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT',
      cause: error,
    }
  );
}

export function createAxiosHttpClient(
  options: CreateAxiosHttpClientOptions = {}
): HttpClient {
  const instance: AxiosInstance = axios.create({
    ...options.axios,
    baseURL: options.baseURL ?? options.axios?.baseURL,
  });
  let refreshPromise: ReturnType<RefreshSession> | null = null;
  let unauthorizedPromise: Promise<void> | null = null;

  async function notifyUnauthorized(error: unknown): Promise<void> {
    if (!options.onUnauthorized) return;
    if (!unauthorizedPromise) {
      unauthorizedPromise = Promise.resolve(
        options.onUnauthorized(error)
      ).finally(() => {
        unauthorizedPromise = null;
      });
    }
    await unauthorizedPromise;
  }

  async function refresh(): ReturnType<RefreshSession> {
    if (!options.refreshSession) return null;
    if (!refreshPromise) {
      refreshPromise = options.refreshSession().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  }

  async function execute<TResponse, TBody>(
    request: HttpRequest<TBody>,
    state: InternalRequestState,
    executeOptions: ExecuteOptions
  ): Promise<TResponse | HttpResponse<TResponse>> {
    const auth = request.auth ?? options.defaultAuth ?? 'required';
    const headers = new AxiosHeaders(request.headers);
    if (
      options.tokenProvider &&
      shouldAttachAuthorization(request.url, options.baseURL, auth)
    ) {
      const token = await options.tokenProvider.getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    options.logger?.debug?.('HTTP request', {
      method: request.method,
      url: request.url,
    });

    try {
      const response = await instance.request({
        method: request.method,
        url: request.url,
        data: request.data,
        params: request.params,
        headers,
        timeout: request.timeout,
        signal: request.signal,
        responseType: request.responseType,
        onUploadProgress: request.onUploadProgress
          ? event =>
              request.onUploadProgress?.({
                loaded: event.loaded,
                total: event.total,
              })
          : undefined,
      });
      const responseMode =
        request.responseMode ?? options.defaultResponseMode ?? 'envelope';
      if (
        responseMode === 'envelope' &&
        isApiEnvelope(response.data) &&
        !isApiSuccessCode(response.data.code)
      ) {
        throw new ApiClientError(
          extractApiMessage(response.data) || '请求失败',
          {
            status: response.status,
            apiCode: response.data.code,
            data: response.data,
          }
        );
      }
      const data = (
        responseMode === 'envelope'
          ? unwrapApiEnvelope<TResponse>(response.data)
          : response.data
      ) as TResponse;
      if (executeOptions.includeMetadata) {
        const normalizedHeaders: Record<string, string> = {};
        for (const [name, value] of Object.entries(response.headers)) {
          if (value != null)
            normalizedHeaders[name.toLowerCase()] = String(value);
        }
        return {
          data,
          status: response.status,
          headers: normalizedHeaders,
        };
      }
      return data;
    } catch (rawError) {
      const error = normalizeError(rawError);
      if (
        error.status === 404 &&
        options.retryTrailingSlash404 &&
        !state.retriedWithTrailingSlash &&
        !request.url.endsWith('/') &&
        !request.url.includes('?')
      ) {
        state.retriedWithTrailingSlash = true;
        return execute(
          { ...request, url: `${request.url}/` },
          state,
          executeOptions
        );
      }

      if (
        error.status === 401 &&
        auth !== 'none' &&
        options.refreshSession &&
        !state.retriedAfterRefresh
      ) {
        state.retriedAfterRefresh = true;
        const refreshed = await refresh();
        if (refreshed) return execute(request, state, executeOptions);
      }

      if (error.status === 401 && auth !== 'none') {
        await notifyUnauthorized(error);
      }
      options.logger?.warn?.('HTTP request failed', {
        method: request.method,
        url: request.url,
        status: error.status,
      });
      throw error;
    }
  }

  function request<TResponse, TBody = unknown>(
    config: HttpRequest<TBody>
  ): Promise<TResponse> {
    return execute<TResponse, TBody>(
      config,
      {
        retriedAfterRefresh: false,
        retriedWithTrailingSlash: false,
      },
      { includeMetadata: false }
    ) as Promise<TResponse>;
  }

  function requestWithMetadata<TResponse, TBody = unknown>(
    config: HttpRequest<TBody>
  ): Promise<HttpResponse<TResponse>> {
    return execute<TResponse, TBody>(
      config,
      {
        retriedAfterRefresh: false,
        retriedWithTrailingSlash: false,
      },
      { includeMetadata: true }
    ) as Promise<HttpResponse<TResponse>>;
  }

  return {
    request,
    requestWithMetadata,
    get: <TResponse>(url: string, requestOptions?: HttpRequestOptions) =>
      request<TResponse>({ method: 'GET', url, ...requestOptions }),
    post: <TResponse, TBody = unknown>(
      url: string,
      data?: TBody,
      requestOptions?: HttpRequestOptions
    ) =>
      request<TResponse, TBody>({
        method: 'POST',
        url,
        data,
        ...requestOptions,
      }),
    put: <TResponse, TBody = unknown>(
      url: string,
      data?: TBody,
      requestOptions?: HttpRequestOptions
    ) =>
      request<TResponse, TBody>({
        method: 'PUT',
        url,
        data,
        ...requestOptions,
      }),
    patch: <TResponse, TBody = unknown>(
      url: string,
      data?: TBody,
      requestOptions?: HttpRequestOptions
    ) =>
      request<TResponse, TBody>({
        method: 'PATCH',
        url,
        data,
        ...requestOptions,
      }),
    delete: <TResponse>(url: string, requestOptions?: HttpRequestOptions) =>
      request<TResponse>({ method: 'DELETE', url, ...requestOptions }),
  };
}
