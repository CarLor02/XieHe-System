import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import { DashboardSystemMetrics } from './types';

export async function getDashboardSystemMetrics(): Promise<DashboardSystemMetrics> {
  const response = await apiClient.get('/api/v1/dashboard/system-metrics');
  return extractData<DashboardSystemMetrics>(response);
}
