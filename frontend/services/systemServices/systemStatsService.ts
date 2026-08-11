import { apiSdk } from '@/infrastructure/http';
import type { SystemStats } from './types';

export async function getSystemStats(): Promise<SystemStats> {
  return apiSdk.system.getStats();
}
