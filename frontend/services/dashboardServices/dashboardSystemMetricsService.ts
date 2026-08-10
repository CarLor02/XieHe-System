import { apiClient } from '@/infrastructure/http';
import { DashboardSystemMetrics } from './types';

export async function getDashboardSystemMetrics(): Promise<DashboardSystemMetrics> {
  return apiClient.get<DashboardSystemMetrics>(
    '/api/v1/dashboard/system-metrics'
  );
}
