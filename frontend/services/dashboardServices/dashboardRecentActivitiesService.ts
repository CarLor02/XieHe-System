import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import { DashboardActivity } from './types';

export async function getDashboardRecentActivities(): Promise<DashboardActivity[]> {
  const response = await apiClient.get('/api/v1/dashboard/recent-activities');
  const payload = extractData<
    { items?: DashboardActivity[]; activities?: DashboardActivity[] } | DashboardActivity[]
  >(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.items || payload.activities || [];
}
