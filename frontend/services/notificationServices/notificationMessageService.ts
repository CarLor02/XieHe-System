import { apiClient, normalizeLegacyPagination } from '@/infrastructure/http';
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
  if (filters.is_read !== undefined)
    params.set('is_read', String(filters.is_read));

  const query = params.toString();
  const url = query
    ? `/api/v1/notifications/messages?${query}`
    : '/api/v1/notifications/messages';
  const data = await apiClient.get<unknown>(url);
  const paginatedResult = normalizeLegacyPagination<NotificationMessage>(data);
  if (Array.isArray(paginatedResult.items)) {
    return paginatedResult.items;
  }

  const legacyData = data as
    NotificationMessage[] | { items?: NotificationMessage[] };

  if (Array.isArray(legacyData)) {
    return legacyData;
  }

  if (Array.isArray(legacyData?.items)) {
    return legacyData.items;
  }

  return [];
}

export async function getNotificationMessageStats(): Promise<NotificationMessageStats> {
  return apiClient.get<NotificationMessageStats>(
    '/api/v1/notifications/messages/stats'
  );
}

export async function markNotificationAsRead(
  messageId: number
): Promise<NotificationActionResult> {
  return apiClient.put<NotificationActionResult>(
    `/api/v1/notifications/messages/${messageId}/read`
  );
}

export async function deleteNotificationMessage(
  messageId: number
): Promise<NotificationActionResult> {
  return apiClient.delete<NotificationActionResult>(
    `/api/v1/notifications/messages/${messageId}`
  );
}
