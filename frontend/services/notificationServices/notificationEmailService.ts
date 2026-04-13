import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import {
  BatchEmailRequest,
  EmailSendRequest,
  NotificationActionResult,
} from './types';

export async function sendNotificationEmail(
  payload: EmailSendRequest
): Promise<NotificationActionResult> {
  const response = await apiClient.post('/api/v1/notifications/email/send', payload);
  return extractData<NotificationActionResult>(response);
}

export async function sendBatchNotificationEmail(
  payload: BatchEmailRequest
): Promise<NotificationActionResult> {
  const response = await apiClient.post('/api/v1/notifications/email/batch', payload);
  return extractData<NotificationActionResult>(response);
}

export async function testNotificationEmail(
  payload: EmailSendRequest
): Promise<NotificationActionResult> {
  const response = await apiClient.post('/api/v1/notifications/email/test', payload);
  return extractData<NotificationActionResult>(response);
}
