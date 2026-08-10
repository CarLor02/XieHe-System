import { apiClient } from '@/infrastructure/http';
import { DashboardOverview } from './types';

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return apiClient.get<DashboardOverview>('/api/v1/dashboard/overview');
}
