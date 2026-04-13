import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import { DashboardOverview } from './types';

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const response = await apiClient.get('/api/v1/dashboard/overview');
  return extractData<DashboardOverview>(response);
}
