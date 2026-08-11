import { apiSdk } from '@/infrastructure/http';
import type {
  NotificationActionResult,
  NotificationBroadcastRequest,
} from './types';

export async function broadcastNotification(
  payload: NotificationBroadcastRequest
): Promise<NotificationActionResult> {
  return apiSdk.notifications.broadcast(payload);
}
