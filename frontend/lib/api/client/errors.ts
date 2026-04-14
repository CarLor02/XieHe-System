import { extractApiMessage } from '../types';

export type ApiClientError = Error & {
  status?: number;
  data?: unknown;
  response?: Response;
  apiCode?: number;
};

export function createApiClientError(
  message: string,
  options: {
    status?: number;
    data?: unknown;
    response?: Response;
    apiCode?: number;
  } = {}
): ApiClientError {
  const error = new Error(message) as ApiClientError;
  error.status = options.status;
  error.data = options.data;
  error.response = options.response;
  error.apiCode = options.apiCode;
  return error;
}

export function createApiEnvelopeError(data: any, response?: any) {
  const error = new Error(extractApiMessage(data) || '请求失败') as Error & {
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
