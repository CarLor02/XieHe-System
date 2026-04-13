import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import {
  NotificationActionResult,
  NotificationBroadcastRequest,
} from './types';

export async function broadcastNotification(
  payload: NotificationBroadcastRequest
): Promise<NotificationActionResult> {
  const response = await apiClient.post('/api/v1/notifications/broadcast', payload);
  return extractData<NotificationActionResult>(response);
}
