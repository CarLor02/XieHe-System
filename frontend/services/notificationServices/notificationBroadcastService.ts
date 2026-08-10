import { apiClient } from '@/infrastructure/http';
import {
  NotificationActionResult,
  NotificationBroadcastRequest,
} from './types';

export async function broadcastNotification(
  payload: NotificationBroadcastRequest
): Promise<NotificationActionResult> {
  return apiClient.post<NotificationActionResult, NotificationBroadcastRequest>(
    '/api/v1/notifications/broadcast',
    payload
  );
}
