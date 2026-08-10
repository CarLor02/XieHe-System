export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data?: T | null;
  timestamp?: string | null;
}

export function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.code === 'number' &&
    typeof candidate.message === 'string'
  );
}

export function isApiSuccessCode(code: number | null | undefined): boolean {
  return code == null || code === 0 || (code >= 200 && code < 300);
}

export function unwrapApiEnvelope<T>(payload: unknown): T {
  if (!isApiEnvelope(payload)) return payload as T;
  return payload.data as T;
}

export function extractApiMessage(payload: unknown): string | undefined {
  if (payload === null || typeof payload !== 'object') return undefined;
  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.message === 'string') return candidate.message;
  if (typeof candidate.detail === 'string') return candidate.detail;
  return undefined;
}
