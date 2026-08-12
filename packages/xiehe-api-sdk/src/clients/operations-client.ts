import type { HttpClient } from '@xiehe/api-client';
import { normalizeLegacyPagination } from '@xiehe/api-client/contracts';
import type {
  CreateModelRequest,
  DashboardActivity,
  DashboardOverview,
  DashboardStats,
  DeleteModelResult,
  ModelConfiguration,
  ModelItem,
  ModelListQuery,
  ModelStats,
  SystemStats,
} from '@xiehe/api-contracts';
import { compactQuery } from '../shared/query';

export function createOperationsClient(client: HttpClient) {
  return {
    dashboard: {
      getStats: () => client.get<DashboardStats>('/api/v1/dashboard/stats'),
      getOverview: () =>
        client.get<DashboardOverview>('/api/v1/dashboard/overview'),
      async getRecentActivities() {
        const data = await client.get<
          | { items?: DashboardActivity[]; activities?: DashboardActivity[] }
          | DashboardActivity[]
        >('/api/v1/dashboard/recent-activities');
        return Array.isArray(data)
          ? data
          : data.items || data.activities || [];
      },
    },
    models: {
      async list(query: ModelListQuery = {}) {
        return normalizeLegacyPagination<ModelItem>(
          await client.get<unknown>('/api/v1/models/', {
            params: compactQuery({ ...query }),
          })
        );
      },
      getStats: () => client.get<ModelStats>('/api/v1/models/stats'),
      create: (request: CreateModelRequest) =>
        client.post<ModelItem, CreateModelRequest>('/api/v1/models/', request),
      activate: (modelId: string) =>
        client.post<void>(`/api/v1/models/${modelId}/activate`),
      delete: (modelId: string) =>
        client.delete<DeleteModelResult>(`/api/v1/models/${modelId}`),
      getConfiguration: () =>
        client.get<ModelConfiguration>('/api/v1/models/configuration'),
      updateConfiguration: (request: ModelConfiguration) =>
        client.put<ModelConfiguration, ModelConfiguration>(
          '/api/v1/models/configuration',
          request
        ),
    },
    system: {
      getStats: () => client.get<SystemStats>('/api/v1/system/stats'),
    },
  };
}
