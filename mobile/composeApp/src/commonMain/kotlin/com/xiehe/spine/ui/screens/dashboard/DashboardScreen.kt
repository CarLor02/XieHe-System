package com.xiehe.spine.ui.screens.dashboard

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.auth.AuthRepository
import com.xiehe.spine.data.dashboard.DashboardRepository
import com.xiehe.spine.data.image.ImageFileRepository
import com.xiehe.spine.data.image.ImageFileSummary
import com.xiehe.spine.data.notification.NotificationRepository
import com.xiehe.spine.data.patient.PatientRepository
import com.xiehe.spine.data.patient.PatientSummary
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.card.dashboard.ActivityCard
import com.xiehe.spine.ui.components.card.dashboard.PendingTaskCard
import com.xiehe.spine.ui.components.text.dashboard.DashboardSectionTitle
import com.xiehe.spine.ui.components.card.dashboard.DashboardStatCard
import com.xiehe.spine.ui.components.card.dashboard.QuickActionTile
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.dashboard.DashboardViewModel

@Composable
fun DashboardScreen(
    vm: DashboardViewModel,
    session: UserSession,
    dashboardRepository: DashboardRepository,
    imageRepository: ImageFileRepository,
    patientRepository: PatientRepository,
    notificationRepository: NotificationRepository,
    authRepository: AuthRepository,
    onSessionUpdated: (UserSession) -> Unit,
    onSessionExpired: (String) -> Unit = {},
    preloadedPatients: List<PatientSummary> = emptyList(),
    preloadedImages: List<ImageFileSummary> = emptyList(),
    onOpenAnalysis: (Int, Int?, String) -> Unit = { _, _, _ -> },
    onOpenPatientForm: () -> Unit = {},
    onOpenImageUpload: () -> Unit = {},
    onOpenImagesTab: () -> Unit = {},
    onOpenAppearance: () -> Unit = {},
    onOpenOrganization: () -> Unit = {},
) {
    val state by vm.state.collectAsState()

    LaunchedEffect(session.accessToken) {
        vm.load(
            session = session,
            dashboardRepository = dashboardRepository,
            imageRepository = imageRepository,
            patientRepository = patientRepository,
            notificationRepository = notificationRepository,
            authRepository = authRepository,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
            preloadedPatients = preloadedPatients,
            preloadedImages = preloadedImages,
        )
    }

    val colors = SpineTheme.colors

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            if (state.errorMessage != null) {
                item {
                    AnimatedVisibility(
                        visible = true,
                        enter = fadeIn() + slideInVertically { it / 2 },
                        exit = fadeOut(),
                    ) {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Text(
                                text = state.errorMessage ?: "",
                                style = SpineTheme.typography.subhead.copy(color = SpineTheme.colors.error),
                            )
                        }
                    }
                }
            }

            item {
                DashboardSectionTitle(title = "数据概览")
            }

            val overview = state.data
            if (overview == null) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = if (state.loading) "加载工作台数据中..." else "暂无数据",
                            color = SpineTheme.colors.textSecondary,
                        )
                    }
                }
            } else {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        DashboardStatCard(
                            title = "总患者数",
                            value = overview.totalPatients.toString(),
                            icon = IconToken.HEART_PULSE,
                            colors = patientStatGradient(colors),
                            modifier = Modifier.weight(1f),
                        )
                        DashboardStatCard(
                            title = "总影像数",
                            value = overview.totalImages.toString(),
                            icon = IconToken.IMAGE,
                            colors = imageStatGradient(colors),
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }

            item {
                DashboardSectionTitle(title = "快捷入口")
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    QuickActionTile(
                        label = "新增患者",
                        icon = IconToken.USER_PLUS,
                        colors = patientStatGradient(colors),
                        modifier = Modifier.weight(1f),
                        onClick = onOpenPatientForm,
                    )
                    QuickActionTile(
                        label = "上传影像",
                        icon = IconToken.UPLOAD,
                        colors = imageStatGradient(colors),
                        modifier = Modifier.weight(1f),
                        onClick = onOpenImageUpload,
                    )
                    QuickActionTile(
                        label = "系统设置",
                        icon = IconToken.SETTINGS,
                        colors = reviewActionGradient(colors),
                        modifier = Modifier.weight(1f),
                        onClick = onOpenAppearance,
                    )
                    QuickActionTile(
                        label = "组织管理",
                        icon = IconToken.USERS,
                        colors = messageActionGradient(colors),
                        modifier = Modifier.weight(1f),
                        onClick = onOpenOrganization,
                    )
                }
            }

            item {
                PendingTaskCard(
                    items = state.pendingItems.take(5),
                    onOpenAnalysis = onOpenAnalysis,
                    onOpenImagesTab = onOpenImagesTab,
                )
            }

            item {
                ActivityCard(items = state.recentMessages)
            }
        }

        if (state.loading && state.data == null) {
            LoadingOverlay(message = "...正在加载中")
        }
    }
}

private fun patientStatGradient(colors: com.xiehe.spine.ui.theme.SpineAppColors): List<Color> {
    return listOf(
        colors.primary.copy(alpha = if (colors.isDark) 0.92f else 0.84f),
        colors.primary,
    )
}

private fun imageStatGradient(colors: com.xiehe.spine.ui.theme.SpineAppColors): List<Color> {
    return listOf(
        colors.info.copy(alpha = if (colors.isDark) 0.92f else 0.84f),
        colors.info.copy(alpha = if (colors.isDark) 0.82f else 1f),
    )
}

private fun reviewActionGradient(colors: com.xiehe.spine.ui.theme.SpineAppColors): List<Color> {
    return listOf(colors.success.copy(alpha = 0.92f), colors.success)
}

private fun messageActionGradient(colors: com.xiehe.spine.ui.theme.SpineAppColors): List<Color> {
    return listOf(colors.warning.copy(alpha = 0.9f), colors.error.copy(alpha = 0.92f))
}
