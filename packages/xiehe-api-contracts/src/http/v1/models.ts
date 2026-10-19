import type { PaginatedResult } from '@xiehe/api-client/contracts';
import type {
  ModelListItem,
  CreateModelRequest as WireCreateModelRequest,
  ModelConfigurationUpdate,
  RequestGetModels,
} from '../../generated';
export type {
  ModelStatsResult as ModelStats,
  ModelDeletionResult as DeleteModelResult,
} from '../../generated';

export type ModelItem = Pick<
  ModelListItem,
  'id' | 'name' | 'view_type' | 'endpoint_url' | 'is_active'
> &
  Partial<
    Omit<
      ModelListItem,
      'id' | 'name' | 'view_type' | 'endpoint_url' | 'is_active'
    >
  >;
export type CreateModelRequest = WireCreateModelRequest;
export type ModelConfiguration = ModelConfigurationUpdate;
export type ModelListQuery = Partial<RequestGetModels>;
export type ModelListResult = PaginatedResult<ModelItem>;
