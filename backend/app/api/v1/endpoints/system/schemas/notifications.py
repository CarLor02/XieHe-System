"""Schemas for the notifications API endpoints."""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr

class MessageCreate(BaseModel):
    title: str
    content: str
    recipient_ids: Optional[List[int]] = None
    recipient_emails: Optional[List[EmailStr]] = None
    message_type: str = "info"  # info, warning, error, success
    priority: str = "normal"  # low, normal, high, urgent
    expires_at: Optional[datetime] = None
    action_url: Optional[str] = None
    action_text: Optional[str] = None


class EmailSendRequest(BaseModel):
    to_email: EmailStr
    subject: str
    content: str
    template_name: Optional[str] = None
    template_context: Optional[Dict[str, Any]] = None
    to_name: Optional[str] = None


class BatchEmailRequest(BaseModel):
    emails: List[EmailSendRequest]
    max_concurrent: int = 5


class NotificationSettings(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = True
    sms_notifications: bool = False
    notification_types: List[str] = ["system", "diagnosis", "report", "reminder"]


class MessageResponse(BaseModel):
    id: int
    title: str
    content: str
    message_type: str
    priority: str
    is_read: bool
    created_at: datetime
    expires_at: Optional[datetime]
    action_url: Optional[str]
    action_text: Optional[str]
    sender_name: Optional[str]


class NotificationStats(BaseModel):
    total_messages: int
    unread_messages: int
    messages_by_type: Dict[str, int]
    messages_by_priority: Dict[str, int]
