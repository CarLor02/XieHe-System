export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data?: T | null;
  timestamp?: string | null;
}

export function isApiEnvelope(value: any): value is ApiEnvelope<unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.code === 'number' &&
    typeof value.message === 'string'
  );
}

export function isApiSuccessCode(code: number | null | undefined): boolean {
  if (code === null || code === undefined) return true;
  return code === 0 || (code >= 200 && code < 300);
}

export function unwrapApiPayload<T>(payload: any): T {
  if (isApiEnvelope(payload) && payload.data !== undefined && payload.data !== null) {
    return payload.data as T;
  }
  return payload as T;
}

export function extractApiMessage(payload: any): string | undefined {
  if (typeof payload?.message === 'string') {
    return payload.message;
  }
  if (typeof payload?.detail === 'string') {
    return payload.detail;
  }
  return undefined;
}
