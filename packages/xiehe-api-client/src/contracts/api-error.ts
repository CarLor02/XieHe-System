export interface ApiErrorDetail {
  field?: string | null;
  message?: string | null;
  type?: string | null;
  [key: string]: unknown;
}

export type ApiErrorDetails =
  | ApiErrorDetail[]
  | Record<string, unknown>
  | null;

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
