package com.xiehe.spine.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.organization.OrganizationRepository
import com.xiehe.spine.data.organization.OrganizationRole
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.feedback.shared.FloatingToast
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.form.input.TextField
import com.xiehe.spine.ui.components.form.picker.OptionPickerOverlay
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.motion.AppConfirmDialogHost
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.organization.OrganizationViewModel
import com.xiehe.spine.ui.viewmodel.organization.selectedTeam

@Composable
fun OrganizationInviteScreen(
    vm: OrganizationViewModel,
    session: UserSession,
    repository: OrganizationRepository,
    onSessionUpdated: (UserSession) -> Unit,
    onFinished: () -> Unit,
    onSessionExpired: (String) -> Unit = {},
) {
    val state by vm.state.collectAsState()
    val team = state.selectedTeam

    var email by rememberSaveable { mutableStateOf("") }
    var role by rememberSaveable { mutableStateOf(OrganizationRole.MEMBER) }
    var message by rememberSaveable { mutableStateOf("") }
    var showRolePicker by remember { mutableStateOf(false) }
    var showConfirm by remember { mutableStateOf(false) }

    val emailError = remember(email) {
        when {
            email.isBlank() -> "请输入被邀请人的邮箱"
            !email.matches(Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) -> "请输入有效的邮箱地址"
            else -> null
        }
    }

    LaunchedEffect(session.accessToken) {
        if (state.teams.isEmpty()) {
            vm.load(
                session = session,
                repository = repository,
                onSessionUpdated = onSessionUpdated,
                silent = true,
                onSessionExpired = onSessionExpired,
            )
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SpineTheme.colors.backgroundElevated),
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = team?.name ?: "当前组织",
                            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                            color = SpineTheme.colors.textPrimary,
                        )
                        Text(
                            text = "请为该组织发送成员邀请，角色和留言会一起发送给受邀人。",
                            style = SpineTheme.typography.subhead,
                            color = SpineTheme.colors.textSecondary,
                        )
                    }
                }
            }

            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            FieldLabel("邮箱地址", required = true)
                            TextField(
                                value = email,
                                onValueChange = { email = it },
                                placeholder = "请输入被邀请人的邮箱",
                                modifier = Modifier.fillMaxWidth(),
                                leadingGlyph = IconToken.MESSAGE,
                            )
                            emailError?.let {
                                Text(
                                    text = it,
                                    style = SpineTheme.typography.caption,
                                    color = SpineTheme.colors.error,
                                )
                            } ?: Text(
                                text = "如果该邮箱已注册，用户将直接收到邀请，否则需要先注册账号。",
                                style = SpineTheme.typography.caption,
                                color = SpineTheme.colors.textTertiary,
                            )
                        }

                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            FieldLabel("团队角色")
                            Box(
                                modifier = Modifier.clickable { showRolePicker = true },
                            ) {
                                TextField(
                                    value = role.label,
                                    onValueChange = {},
                                    placeholder = "选择团队角色",
                                    modifier = Modifier.fillMaxWidth(),
                                    readOnly = true,
                                    trailingGlyph = IconToken.CHEVRON_DOWN,
                                )
                            }
                            Text(
                                text = "管理员可以管理团队成员和审核加入申请。",
                                style = SpineTheme.typography.caption,
                                color = SpineTheme.colors.textTertiary,
                            )
                        }

                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            FieldLabel("邀请留言（可选）")
                            TextField(
                                value = message,
                                onValueChange = { message = it },
                                placeholder = "可以添加一些邀请说明",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(120.dp),
                                singleLine = false,
                            )
                        }
                    }
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                ) {
                    ConfirmBarButton(
                        text = "发送邀请",
                        enabled = team != null && emailError == null,
                        onClick = { showConfirm = true },
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(32.dp))
            }
        }

        if (state.actionLoading) {
            LoadingOverlay(message = "...正在发送邀请")
        }

        state.errorMessage?.let { error ->
            FloatingToast(
                message = error,
                accentColor = SpineTheme.colors.error,
                icon = IconToken.MESSAGE,
                onDismiss = vm::clearMessages,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 96.dp),
            )
        }

        if (showRolePicker) {
            OptionPickerOverlay(
                title = "选择团队角色",
                options = OrganizationRole.entries.map { it.label },
                selected = role.label,
                onDismiss = { showRolePicker = false },
                onSelect = { selected ->
                    OrganizationRole.entries.firstOrNull { it.label == selected }?.let { role = it }
                    showRolePicker = false
                },
            )
        }

        AppConfirmDialogHost(
            visible = showConfirm,
            title = "发送邀请",
            message = "确认向 $email 发送加入${team?.name ?: "当前组织"}的邀请，并授予${role.label}身份吗？",
            confirmText = "发送邀请",
            cancelText = "取消",
            confirmButtonColor = SpineTheme.colors.primary,
            cancelButtonColor = SpineTheme.colors.textSecondary,
            confirmTextColor = SpineTheme.colors.onPrimary,
            cancelTextColor = SpineTheme.colors.onPrimary,
            onDismissRequest = { showConfirm = false },
            onConfirm = {
                showConfirm = false
                val teamId = team?.id ?: return@AppConfirmDialogHost
                vm.inviteMember(
                    session = session,
                    repository = repository,
                    teamId = teamId,
                    email = email.trim(),
                    role = role,
                    message = message.trim(),
                    onSessionUpdated = onSessionUpdated,
                    onSuccess = onFinished,
                    onSessionExpired = onSessionExpired,
                )
            },
        )
    }
}

@Composable
private fun FieldLabel(
    text: String,
    required: Boolean = false,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = text,
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
            color = SpineTheme.colors.textPrimary,
        )
        if (required) {
            Text(
                text = "*",
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                color = SpineTheme.colors.error,
            )
        }
    }
}

@Composable
private fun ConfirmBarButton(
    text: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    val colors = SpineTheme.colors
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(if (enabled) colors.primary else colors.surfaceMuted)
            .border(1.dp, if (enabled) colors.primary else colors.borderSubtle, RoundedCornerShape(16.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            color = if (enabled) colors.onPrimary else colors.textTertiary,
        )
    }
}
