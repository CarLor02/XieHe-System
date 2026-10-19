import type { HttpApi } from '@stellarmesh/sdk';
import { toPaginatedResult } from '@xiehe/api-client/contracts';
import type {
  CreateModelRequest,
  ModelConfigurationUpdate,
  RequestGetModels,
} from '@xiehe/api-contracts/generated';
import { createDashboardApi } from '../api/dashboardApi';
import { createModelApi } from '../api/modelApi';
import { createSystemApi } from '../api/systemApi';

export function createOperationsClient(http: HttpApi) {
  const dashboardApi = createDashboardApi(http);
  const modelApi = createModelApi(http);
  const systemApi = createSystemApi(http);
  return {
    dashboard: {
      getStats: () => dashboardApi.requestGetDashboardStats({}),
      getOverview: () => dashboardApi.requestGetDashboardOverview({}),
      getRecentActivities: async () =>
        (await dashboardApi.requestGetRecentActivities({ limit: 10 }))
          .activities,
    },
    models: {
      list: async (query: Partial<RequestGetModels> = {}) =>
        toPaginatedResult(
          await modelApi.requestGetModels({ page: 1, page_size: 10, ...query })
        ),
      get: (model_id: string) => modelApi.requestGetModel({ model_id }),
      getStats: () => modelApi.requestGetModelStats({}),
      create: (request: CreateModelRequest) =>
        modelApi.requestCreateModel(request),
      update: (request: Parameters<typeof modelApi.requestUpdateModel>[0]) =>
        modelApi.requestUpdateModel(request),
      refreshStatus: (model_id: string) =>
        modelApi.requestRefreshModelStatus({ model_id }),
      activate: (model_id: string) =>
        modelApi.requestActivateModel({ model_id }),
      delete: (model_id: string) => modelApi.requestDeleteModel({ model_id }),
      getConfiguration: () => modelApi.requestGetConfiguration({}),
      updateConfiguration: (request: ModelConfigurationUpdate) =>
        modelApi.requestUpdateConfiguration(request),
    },
    system: { getStats: () => systemApi.requestGetSystemStats({}) },
  };
}
