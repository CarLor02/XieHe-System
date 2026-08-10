export interface ApiErrorDetail {
  field?: string | null;
  message?: string | null;
  type?: string | null;
  [key: string]: unknown;
}

export type ApiErrorDetails = ApiErrorDetail[] | Record<string, unknown> | null;

export interface ApiErrorEnvelope {
  code?: number | null;
  message: string;
  error_code?: string | null;
  details?: ApiErrorDetails;
  path?: string | null;
  timestamp?: string | null;
}

export interface ApiClientErrorOptions {
  status?: number;
  apiCode?: number;
  errorCode?: string;
  details?: ApiErrorDetails;
  data?: unknown;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
  cause?: unknown;
}

export class ApiClientError extends Error {
  readonly status?: number;
  readonly apiCode?: number;
  readonly errorCode?: string;
  readonly details?: ApiErrorDetails;
  readonly data?: unknown;
  readonly isNetworkError: boolean;
  readonly isTimeoutError: boolean;

  constructor(message: string, options: ApiClientErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'ApiClientError';
    this.status = options.status;
    this.apiCode = options.apiCode;
    this.errorCode = options.errorCode;
    this.details = options.details;
    this.data = options.data;
    this.isNetworkError = options.isNetworkError ?? false;
    this.isTimeoutError = options.isTimeoutError ?? false;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function getApiErrorStatus(error: unknown): number | undefined {
  if (isApiClientError(error)) return error.status;
  if (error === null || typeof error !== 'object') return undefined;
  const candidate = error as {
    status?: unknown;
    response?: { status?: unknown };
  };
  const status = candidate.response?.status ?? candidate.status;
  return typeof status === 'number' ? status : undefined;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = '操作失败，请稍后重试'
): string {
  if (isApiClientError(error) && error.message.trim()) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error === null || typeof error !== 'object') return fallback;
  const candidate = error as {
    message?: unknown;
    data?: { message?: unknown; detail?: unknown };
    response?: { data?: { message?: unknown; detail?: unknown } };
  };
  const data = candidate.response?.data ?? candidate.data;
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }
  if (typeof data?.detail === 'string' && data.detail.trim()) {
    return data.detail;
  }
  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }
  return fallback;
}
