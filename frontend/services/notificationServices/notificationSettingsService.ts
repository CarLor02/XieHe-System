import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import { NotificationSettings } from './types';

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await apiClient.get('/api/v1/notifications/settings');
  return extractData<NotificationSettings>(response);
}

export async function updateNotificationSettings(
  payload: NotificationSettings
): Promise<NotificationSettings> {
  const response = await apiClient.put('/api/v1/notifications/settings', payload);
  return extractData<NotificationSettings>(response);
}
