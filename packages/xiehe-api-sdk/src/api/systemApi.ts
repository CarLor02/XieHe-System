import type { HttpApi } from '@stellarmesh/sdk';
import type {
  RequestGetSystemConfigs,
  RequestGetSystemStats,
  SystemConfigResponse,
  SystemStatsResponse,
} from '@xiehe/api-contracts/generated';

export function createSystemApi(http: HttpApi) {
  return {
    requestGetSystemConfigs: http.post<
      RequestGetSystemConfigs,
      SystemConfigResponse[]
    >('/api/v1/system/configs'),
    requestGetSystemStats: http.post<
      RequestGetSystemStats,
      SystemStatsResponse
    >('/api/v1/system/stats'),
  };
}
