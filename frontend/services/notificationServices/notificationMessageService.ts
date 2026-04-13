import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import {
  NotificationActionResult,
  NotificationMessage,
  NotificationMessageFilters,
  NotificationMessageStats,
} from './types';

export async function getNotificationMessages(
  filters: NotificationMessageFilters = {}
): Promise<NotificationMessage[]> {
  const params = new URLSearchParams();
  if (filters.message_type) params.set('message_type', filters.message_type);
  if (filters.is_read !== undefined) params.set('is_read', String(filters.is_read));

  const query = params.toString();
  const url = query
    ? `/api/v1/notifications/messages?${query}`
    : '/api/v1/notifications/messages';
  const response = await apiClient.get(url);
  return extractData<NotificationMessage[]>(response);
}

export async function getNotificationMessageStats(): Promise<NotificationMessageStats> {
  const response = await apiClient.get('/api/v1/notifications/messages/stats');
  return extractData<NotificationMessageStats>(response);
}

export async function markNotificationAsRead(
  messageId: number
): Promise<NotificationActionResult> {
  const response = await apiClient.put(`/api/v1/notifications/messages/${messageId}/read`);
  return extractData<NotificationActionResult>(response);
}

export async function deleteNotificationMessage(
  messageId: number
): Promise<NotificationActionResult> {
  const response = await apiClient.delete(`/api/v1/notifications/messages/${messageId}`);
  return extractData<NotificationActionResult>(response);
}
