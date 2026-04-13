export interface NotificationMessage {
  id: number;
  title: string;
  content: string;
  message_type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
  expires_at?: string | null;
  action_url?: string | null;
  action_text?: string | null;
  sender_name?: string | null;
}

export interface NotificationMessageStats {
  total_messages: number;
  unread_messages: number;
  messages_by_type: Record<string, number>;
  messages_by_priority: Record<string, number>;
}

export interface NotificationMessageFilters {
  message_type?: string;
  is_read?: boolean;
}

export interface NotificationSettings {
  email_notifications?: boolean;
  push_notifications?: boolean;
  sms_notifications?: boolean;
  notification_types?: string[];
}

export interface NotificationBroadcastRequest {
  title: string;
  content: string;
  recipient_ids?: number[] | null;
  recipient_emails?: string[] | null;
  message_type?: string;
  priority?: string;
  expires_at?: string | null;
  action_url?: string | null;
  action_text?: string | null;
}

export interface NotificationActionResult {
  message?: string;
}

export interface EmailSendRequest {
  to_email: string;
  subject: string;
  content: string;
  template_name?: string | null;
  template_context?: Record<string, unknown> | null;
  to_name?: string | null;
}

export interface BatchEmailRequest {
  emails: EmailSendRequest[];
  max_concurrent?: number;
}
