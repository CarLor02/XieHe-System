import { apiClient } from '@/infrastructure/http';
import { DashboardActivity } from './types';

export async function getDashboardRecentActivities(): Promise<
  DashboardActivity[]
> {
  const payload = await apiClient.get<
    | { items?: DashboardActivity[]; activities?: DashboardActivity[] }
    | DashboardActivity[]
  >('/api/v1/dashboard/recent-activities');

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.items || payload.activities || [];
}
