package com.xiehe.spine.ui.screens.message

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.notification.NotificationSettings
import com.xiehe.spine.data.notification.NotificationStats
import com.xiehe.spine.data.notification.NotificationRepository
import com.xiehe.spine.ui.components.card.message.MessageNoticeCard
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.feedback.shared.PeriodicTaskTrigger
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.message.MessagesViewModel

@Composable
fun MessagesScreen(
    vm: MessagesViewModel,
    session: UserSession,
    repository: NotificationRepository,
    onSessionUpdated: (UserSession) -> Unit,
    onSessionExpired: (String) -> Unit = {},
) {
    val state by vm.state.collectAsState()

    LaunchedEffect(session.accessToken) {
        vm.load(
            session = session,
            repository = repository,
            onSessionUpdated = onSessionUpdated,
            silent = false,
            onSessionExpired = onSessionExpired,
        )
    }

    PeriodicTaskTrigger(
        intervalMillis = 60_000L,
        enabled = true,
        runImmediately = false,
        key = session.accessToken,
    ) {
        vm.load(
            session = session,
            repository = repository,
            onSessionUpdated = onSessionUpdated,
            silent = true,
            onSessionExpired = onSessionExpired,
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SpineTheme.colors.backgroundElevated),
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            state.noticeMessage?.let {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = it,
                            style = SpineTheme.typography.subhead,
                            color = SpineTheme.colors.success,
                        )
                    }
                }
            }

            item {
                NotificationSummaryCard(
                    stats = state.stats,
                    settings = state.settings,
                )
            }

            state.errorMessage?.let {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = it,
                            style = SpineTheme.typography.subhead,
                            color = SpineTheme.colors.error,
                        )
                    }
                }
            }

            if (!state.loading && state.items.isEmpty()) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(60.dp)
                                    .background(
                                        SpineTheme.colors.surfaceMuted,
                                        RoundedCornerShape(SpineTheme.radius.full),
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                AppIcon(
                                    glyph = IconToken.MESSAGE,
                                    tint = SpineTheme.colors.textTertiary,
                                    modifier = Modifier.size(24.dp),
                                )
                            }
                            Text("暂无消息", color = SpineTheme.colors.textSecondary)
                        }
                    }
                }
            }

            items(state.items, key = { it.id }) { item ->
                MessageNoticeCard(
                    item = item,
                    onMarkRead = {
                        vm.markRead(
                            session = session,
                            repository = repository,
                            messageId = it.id,
                            onSessionUpdated = onSessionUpdated,
                            onSessionExpired = onSessionExpired,
                        )
                    },
                    onDelete = {
                        vm.delete(
                            session = session,
                            repository = repository,
                            message = it,
                            onSessionUpdated = onSessionUpdated,
                            onSessionExpired = onSessionExpired,
                        )
                    },
                )
            }
        }

        if (state.loading || state.actionLoading) {
            LoadingOverlay(message = "...正在加载中")
        }
    }
}

@Composable
private fun NotificationSummaryCard(
    stats: NotificationStats?,
    settings: NotificationSettings?,
) {
    val colors = SpineTheme.colors
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "通知概览",
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
            )
            androidx.compose.foundation.layout.Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                SummaryMetricTile(
                    title = "总消息",
                    value = (stats?.totalMessages ?: 0).toString(),
                    accent = colors.primary,
                    modifier = Modifier.weight(1f),
                )
                SummaryMetricTile(
                    title = "未读",
                    value = (stats?.unreadMessages ?: 0).toString(),
                    accent = colors.warning,
                    modifier = Modifier.weight(1f),
                )
            }
            settings?.let {
                Text(
                    text = buildString {
                        append("推送")
                        append(if (it.pushNotifications) "已开启" else "已关闭")
                        append(" · 邮件")
                        append(if (it.emailNotifications) "已开启" else "已关闭")
                        append(" · 短信")
                        append(if (it.smsNotifications) "已开启" else "已关闭")
                    },
                    style = SpineTheme.typography.subhead,
                    color = colors.textSecondary,
                )
            }
        }
    }
}

@Composable
private fun SummaryMetricTile(
    title: String,
    value: String,
    accent: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Box(
        modifier = modifier
            .background(colors.surfaceMuted, RoundedCornerShape(18.dp))
            .border(1.dp, colors.borderSubtle, RoundedCornerShape(18.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(accent, CircleShape),
            )
            Text(
                text = title,
                style = SpineTheme.typography.caption,
                color = colors.textSecondary,
            )
            Text(
                text = value,
                style = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
            )
        }
    }
}
