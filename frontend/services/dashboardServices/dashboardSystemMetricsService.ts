import { apiSdk } from '@/infrastructure/http';
import type { DashboardSystemMetrics } from './types';

export async function getDashboardSystemMetrics(): Promise<DashboardSystemMetrics> {
  return apiSdk.dashboard.getSystemMetrics();
}
