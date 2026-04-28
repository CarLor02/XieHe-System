package com.xiehe.spine.ui.viewmodel.dashboard

import com.xiehe.spine.data.dashboard.DashboardOverview
import com.xiehe.spine.data.image.ImageFileSummary
import com.xiehe.spine.data.notification.NotificationMessage

data class DashboardPendingTask(
    val image: ImageFileSummary,
    val patientName: String,
    val patientCode: String,
)

data class DashboardUiState(
    val loading: Boolean = false,
    val data: DashboardOverview? = null,
    val pendingItems: List<DashboardPendingTask> = emptyList(),
    val recentMessages: List<NotificationMessage> = emptyList(),
    val doctorDisplayName: String = "",
    val errorMessage: String? = null,
)
