export interface ApiErrorEnvelope {
  code?: number | null;
  message: string;
  error_code?: string | null;
  details?: Record<string, any>;
  path?: string | null;
  timestamp?: string | null;
}

export function extractErrorMessage(error: any): string {
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }
  if (typeof error?.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  if (typeof error?.response?.data?.detail === 'string') {
    return error.response.data.detail;
  }
  if (typeof error?.data?.message === 'string') {
    return error.data.message;
  }
  return '操作失败，请稍后重试';
}

export function extractErrorCode(error: any): string | undefined {
  return error.response?.data?.error_code || error.data?.error_code;
}

export function extractErrorDetails(error: any): Record<string, any> | undefined {
  return error.response?.data?.details || error.data?.details;
}

export function isNetworkError(error: any): boolean {
  return !error.response && !error.status && !!error.request;
}

export function isTimeoutError(error: any): boolean {
  return error.code === 'ECONNABORTED' || error.message?.includes('timeout');
}

export function getStatusCode(error: any): number | undefined {
  return error.response?.status || error.status;
}

export function formatFieldErrors(details?: Record<string, any>): string {
  if (!details) return '';

  const errors: string[] = [];
  for (const [field, messages] of Object.entries(details)) {
    if (Array.isArray(messages)) {
      errors.push(`${field}: ${messages.join(', ')}`);
    } else {
      errors.push(`${field}: ${messages}`);
    }
  }

  return errors.join('\n');
}
