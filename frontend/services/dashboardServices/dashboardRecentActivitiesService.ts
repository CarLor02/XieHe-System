import { apiSdk } from '@/infrastructure/http';
import type { DashboardActivity } from './types';

export async function getDashboardRecentActivities(): Promise<
  DashboardActivity[]
> {
  return apiSdk.dashboard.getRecentActivities();
}
