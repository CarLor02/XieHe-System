import { apiClient } from '@/infrastructure/http';
import { SystemStats } from './types';

export async function getSystemStats(): Promise<SystemStats> {
  return apiClient.get<SystemStats>('/api/v1/system/stats');
}
