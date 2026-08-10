import { apiClient } from '@/infrastructure/http';
import { NotificationSettings } from './types';

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return apiClient.get<NotificationSettings>('/api/v1/notifications/settings');
}

export async function updateNotificationSettings(
  payload: NotificationSettings
): Promise<NotificationSettings> {
  return apiClient.put<NotificationSettings, NotificationSettings>(
    '/api/v1/notifications/settings',
    payload
  );
}
