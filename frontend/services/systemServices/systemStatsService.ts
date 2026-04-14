import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import { SystemStats } from './types';

export async function getSystemStats(): Promise<SystemStats> {
  const response = await apiClient.get('/api/v1/system/stats');
  return extractData<SystemStats>(response);
}
