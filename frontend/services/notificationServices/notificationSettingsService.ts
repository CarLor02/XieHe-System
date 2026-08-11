import { apiSdk } from '@/infrastructure/http';
import type { NotificationSettings } from './types';

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return apiSdk.notifications.getSettings();
}

export async function updateNotificationSettings(
  payload: NotificationSettings
): Promise<NotificationSettings> {
  return apiSdk.notifications.updateSettings(payload);
}
