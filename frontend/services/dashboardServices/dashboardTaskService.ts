import { apiSdk } from '@/infrastructure/http';
import type { DashboardTask } from './types';

export async function getDashboardTasks(): Promise<DashboardTask[]> {
  return apiSdk.dashboard.getTasks();
}
