import { apiSdk } from '@/infrastructure/http';
import type {
  BatchEmailRequest,
  EmailSendRequest,
  NotificationActionResult,
} from './types';

export async function sendNotificationEmail(
  payload: EmailSendRequest
): Promise<NotificationActionResult> {
  return apiSdk.notifications.sendEmail(payload);
}

export async function sendBatchNotificationEmail(
  payload: BatchEmailRequest
): Promise<NotificationActionResult> {
  return apiSdk.notifications.sendBatchEmail(payload);
}

export async function testNotificationEmail(
  payload: EmailSendRequest
): Promise<NotificationActionResult> {
  return apiSdk.notifications.testEmail(payload);
}
