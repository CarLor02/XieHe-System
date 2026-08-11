import type { HttpClient } from '@xiehe/api-client';
import type { SyncScanFile, SyncStatsResponse } from '@xiehe/api-contracts';

export function createSyncClient(client: HttpClient) {
  const raw = { auth: 'none' as const, responseMode: 'raw' as const };
  return {
    getStats: () => client.get<SyncStatsResponse>('/api/v1/stats', raw),
    async listFiles(query: Record<string, unknown> = {}) {
      const data = await client.get<{ items?: SyncScanFile[] }>(
        '/api/v1/files',
        { ...raw, params: query }
      );
      return data.items || [];
    },
    inspectFile: <T = unknown>(fileId: number) =>
      client.get<T>(`/api/v1/files/${fileId}/inspect`, raw),
    markFileSynced: (fileId: number) =>
      client.post<void>(`/api/v1/files/${fileId}/mark-synced`, undefined, raw),
  };
}
