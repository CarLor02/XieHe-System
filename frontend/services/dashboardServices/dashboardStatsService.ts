import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import { DashboardStats } from './types';

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get('/api/v1/dashboard/stats');
  return extractData<DashboardStats>(response);
}
