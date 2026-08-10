import { apiClient } from '@/infrastructure/http';
import { DashboardTask } from './types';

export async function getDashboardTasks(): Promise<DashboardTask[]> {
  const payload = await apiClient.get<
    { tasks?: DashboardTask[] } | DashboardTask[]
  >('/api/v1/dashboard/tasks');
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.tasks || [];
}
