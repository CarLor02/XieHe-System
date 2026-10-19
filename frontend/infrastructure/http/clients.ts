import {
  createHttpClientAdapter,
  createStellarmeshHttp,
} from '@xiehe/api-client/stellarmesh';
import type { HttpClient } from '@xiehe/api-client';
import { API_BASE_URL } from './config';
import { webSessionBridge } from './sessionBridge';

export const publicHttp = createStellarmeshHttp({ baseURL: API_BASE_URL });
export const http = createStellarmeshHttp({
  baseURL: API_BASE_URL,
  tokenProvider: { getAccessToken: () => webSessionBridge.getAccessToken() },
  getSessionEpoch: () => webSessionBridge.getSessionEpoch(),
  refreshSession: async () => {
    const accessToken = await webSessionBridge.refreshAccessToken();
    return accessToken ? { accessToken } : null;
  },
  onUnauthorized: error => webSessionBridge.handleUnauthorized(error),
});
export const publicApiClient = createHttpClientAdapter(publicHttp);
export const apiClient = createHttpClientAdapter(http);
// 对象 URL 使用独立、无会话的字节传输实例，禁止向存储域注入 Bearer。
export const objectStorageClient = createHttpClientAdapter(
  createStellarmeshHttp({ raw: true })
);

export function createExternalHttpClient(
  options: { baseURL?: string; headers?: Record<string, string> } = {}
): HttpClient {
  let external = createStellarmeshHttp({ baseURL: options.baseURL, raw: true });
  if (options.headers) external = external.withHeaders(options.headers);
  return createHttpClientAdapter(external);
}
