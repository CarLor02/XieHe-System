import { apiClient } from '@/infrastructure/http';
import {
  BatchEmailRequest,
  EmailSendRequest,
  NotificationActionResult,
} from './types';

export async function sendNotificationEmail(
  payload: EmailSendRequest
): Promise<NotificationActionResult> {
  return apiClient.post<NotificationActionResult, EmailSendRequest>(
    '/api/v1/notifications/email/send',
    payload
  );
}

export async function sendBatchNotificationEmail(
  payload: BatchEmailRequest
): Promise<NotificationActionResult> {
  return apiClient.post<NotificationActionResult, BatchEmailRequest>(
    '/api/v1/notifications/email/batch',
    payload
  );
}

export async function testNotificationEmail(
  payload: EmailSendRequest
): Promise<NotificationActionResult> {
  return apiClient.post<NotificationActionResult, EmailSendRequest>(
    '/api/v1/notifications/email/test',
    payload
  );
}
