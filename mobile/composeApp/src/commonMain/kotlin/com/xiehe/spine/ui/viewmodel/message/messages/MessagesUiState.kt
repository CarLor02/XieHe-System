package com.xiehe.spine.ui.viewmodel.message

import com.xiehe.spine.data.notification.NotificationMessage
import com.xiehe.spine.data.notification.NotificationSettings
import com.xiehe.spine.data.notification.NotificationStats

data class MessagesUiState(
    val loading: Boolean = false,
    val actionLoading: Boolean = false,
    val items: List<NotificationMessage> = emptyList(),
    val stats: NotificationStats? = null,
    val settings: NotificationSettings? = null,
    val noticeMessage: String? = null,
    val errorMessage: String? = null,
)
