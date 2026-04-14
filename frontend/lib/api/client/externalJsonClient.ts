import {
  extractApiMessage,
  isApiEnvelope,
  isApiSuccessCode,
  unwrapApiPayload,
} from '../types';
import { createApiClientError } from './errors';
import { parseResponsePayload } from './responsePayload';

export async function requestJsonFromUrl<T>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(input, init);
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
