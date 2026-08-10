import { apiClient } from '@/infrastructure/http';
import { DashboardStats } from './types';

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiClient.get<DashboardStats>('/api/v1/dashboard/stats');
}
