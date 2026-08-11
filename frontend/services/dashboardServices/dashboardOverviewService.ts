import { apiSdk } from '@/infrastructure/http';
import type { DashboardOverview } from './types';

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return apiSdk.dashboard.getOverview();
}
