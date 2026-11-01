import type { HttpApi } from '@stellarmesh/sdk';
import type {
  DashboardOverview,
  RequestGetDashboardOverview,
  RequestGetDashboardStats,
} from '@xiehe/api-contracts/generated';

export function createDashboardApi(http: HttpApi) {
  return {
    requestGetDashboardOverview: http.post<
      RequestGetDashboardOverview,
      DashboardOverview
    >('/api/v1/dashboard/overview'),
    requestGetDashboardStats: http.post<
      RequestGetDashboardStats,
      DashboardOverview
    >('/api/v1/dashboard/stats'),
  };
}
