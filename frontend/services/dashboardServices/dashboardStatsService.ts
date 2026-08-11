import { apiSdk } from '@/infrastructure/http';
import type { DashboardStats } from './types';

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiSdk.dashboard.getStats();
}
