import type { HttpApi } from '@stellarmesh/sdk';
import type {
  CreateModelRequest,
  ModelActivationResult,
  ModelConfigurationResult,
  ModelConfigurationUpdate,
  ModelDeletionResult,
  ModelResult,
  ModelStatsResult,
  PaginatedData_ModelListItem_,
  RequestActivateModel,
  RequestDeleteModel,
  RequestGetConfiguration,
  RequestGetModel,
  RequestGetModelStats,
  RequestGetModels,
  RequestRefreshModelStatus,
  RequestUpdateModel,
} from '@xiehe/api-contracts/generated';

export function createModelApi(http: HttpApi) {
  return {
    requestActivateModel: http.post<
      RequestActivateModel,
      ModelActivationResult
    >('/api/v1/models/activate'),
    requestGetConfiguration: http.post<
      RequestGetConfiguration,
      ModelConfigurationResult
    >('/api/v1/models/configuration/get'),
    requestUpdateConfiguration: http.post<
      ModelConfigurationUpdate,
      ModelConfigurationResult
    >('/api/v1/models/configuration/update'),
    requestCreateModel: http.post<CreateModelRequest, ModelResult>(
      '/api/v1/models/create'
    ),
    requestDeleteModel: http.post<RequestDeleteModel, ModelDeletionResult>(
      '/api/v1/models/delete'
    ),
    requestGetModel: http.post<RequestGetModel, ModelResult>(
      '/api/v1/models/get'
    ),
    requestGetModels: http.post<RequestGetModels, PaginatedData_ModelListItem_>(
      '/api/v1/models/list'
    ),
    requestRefreshModelStatus: http.post<
      RequestRefreshModelStatus,
      ModelResult
    >('/api/v1/models/refresh-status'),
    requestGetModelStats: http.post<RequestGetModelStats, ModelStatsResult>(
      '/api/v1/models/stats'
    ),
    requestUpdateModel: http.post<RequestUpdateModel, ModelResult>(
      '/api/v1/models/update'
    ),
  };
}
