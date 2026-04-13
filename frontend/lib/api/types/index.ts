import { isApiSuccessCode, unwrapApiPayload } from './apiEnvelope';

export * from './apiEnvelope';
export * from './apiErrorEnvelope';
export * from './apiMessageResponse';
export * from './paginatedResult';

export function extractData<T>(response: any): T {
  if (response?.data !== undefined) {
    return unwrapApiPayload<T>(response.data);
  }
  return {} as T;
}

export function isSuccessResponse(response: any): boolean {
  if (response.status < 200 || response.status >= 300) {
    return false;
  }

  if (response.data?.code !== undefined) {
    return isApiSuccessCode(response.data.code);
  }

  if (response.data?.error !== undefined) {
    return !response.data.error;
  }

  return true;
}
