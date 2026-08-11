import { apiSdk } from '@/infrastructure/http';
import type {
  NotificationActionResult,
  NotificationMessage,
  NotificationMessageFilters,
  NotificationMessageStats,
} from './types';

export function getNotificationMessages(
  filters: NotificationMessageFilters = {}
): Promise<NotificationMessage[]> {
  return apiSdk.notifications.listMessages(filters);
}

export function getNotificationMessageStats(): Promise<NotificationMessageStats> {
  return apiSdk.notifications.getMessageStats();
}

export function markNotificationAsRead(
  messageId: number
): Promise<NotificationActionResult> {
  return apiSdk.notifications.markRead(messageId);
}

export function deleteNotificationMessage(
  messageId: number
): Promise<NotificationActionResult> {
  return apiSdk.notifications.deleteMessage(messageId);
}
