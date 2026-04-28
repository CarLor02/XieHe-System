package com.xiehe.spine.data.notification

import com.xiehe.spine.data.patient.Pagination
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class NotificationMessagePageData(
    val items: List<NotificationMessage> = emptyList(),
    val pagination: Pagination,
)

@Serializable
data class NotificationMessage(
    val id: Int,
    val title: String,
    val content: String,
    @SerialName("message_type") val messageType: String? = null,
    val priority: String? = null,
    @SerialName("is_read") val isRead: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
    @SerialName("action_url") val actionUrl: String? = null,
    @SerialName("action_text") val actionText: String? = null,
    @SerialName("sender_name") val senderName: String? = null,
)

@Serializable
data class NotificationStats(
    @SerialName("total_messages") val totalMessages: Int = 0,
    @SerialName("unread_messages") val unreadMessages: Int = 0,
    @SerialName("messages_by_type") val messagesByType: Map<String, Int> = emptyMap(),
    @SerialName("messages_by_priority") val messagesByPriority: Map<String, Int> = emptyMap(),
)

@Serializable
data class NotificationSettings(
    @SerialName("email_notifications") val emailNotifications: Boolean = true,
    @SerialName("push_notifications") val pushNotifications: Boolean = true,
    @SerialName("sms_notifications") val smsNotifications: Boolean = false,
    @SerialName("notification_types") val notificationTypes: List<String> = emptyList(),
)

@Serializable
data class NotificationSettingsUpdateRequest(
    @SerialName("email_notifications") val emailNotifications: Boolean,
    @SerialName("push_notifications") val pushNotifications: Boolean,
    @SerialName("sms_notifications") val smsNotifications: Boolean,
    @SerialName("notification_types") val notificationTypes: List<String>,
)

@Serializable
data class NotificationMessageCreateRequest(
    val title: String,
    val content: String,
    @SerialName("recipient_ids") val recipientIds: List<Int>? = null,
    @SerialName("recipient_emails") val recipientEmails: List<String>? = null,
    @SerialName("message_type") val messageType: String = "info",
    val priority: String = "normal",
    @SerialName("expires_at") val expiresAt: String? = null,
    @SerialName("action_url") val actionUrl: String? = null,
    @SerialName("action_text") val actionText: String? = null,
)

@Serializable
data class MarkMessageReadData(
    @SerialName("message_id") val messageId: Int,
)
