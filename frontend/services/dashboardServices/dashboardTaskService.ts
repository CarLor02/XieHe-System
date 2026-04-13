import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import { DashboardTask } from './types';

export async function getDashboardTasks(): Promise<DashboardTask[]> {
  const response = await apiClient.get('/api/v1/dashboard/tasks');
  const payload = extractData<{ tasks?: DashboardTask[] } | DashboardTask[]>(response);
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.tasks || [];
}
