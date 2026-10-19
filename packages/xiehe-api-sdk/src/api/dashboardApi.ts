import type { HttpApi } from '@stellarmesh/sdk';
import type {
  DashboardOverview,
  RecentActivitiesResult,
  RequestGetDashboardOverview,
  RequestGetDashboardStats,
  RequestGetRecentActivities,
} from '@xiehe/api-contracts/generated';

export function createDashboardApi(http: HttpApi) {
  return {
    requestGetDashboardOverview: http.post<
      RequestGetDashboardOverview,
      DashboardOverview
    >('/api/v1/dashboard/overview'),
    requestGetRecentActivities: http.post<
      RequestGetRecentActivities,
      RecentActivitiesResult
    >('/api/v1/dashboard/recent-activities'),
    requestGetDashboardStats: http.post<
      RequestGetDashboardStats,
      DashboardOverview
    >('/api/v1/dashboard/stats'),
  };
}
