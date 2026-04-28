package com.xiehe.spine.ui.screens.profile

import androidx.compose.foundation.background
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.organization.OrganizationRepository
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.feedback.shared.FloatingToast
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.form.input.TextField
import com.xiehe.spine.ui.motion.AppConfirmDialogHost
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.organization.OrganizationViewModel

@Composable
fun OrganizationCreateTeamScreen(
    vm: OrganizationViewModel,
    session: UserSession,
    repository: OrganizationRepository,
    onSessionUpdated: (UserSession) -> Unit,
    onFinished: () -> Unit,
    onSessionExpired: (String) -> Unit = {},
) {
    val state by vm.state.collectAsState()

    var name by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var hospital by rememberSaveable { mutableStateOf("") }
    var department by rememberSaveable { mutableStateOf("") }
    var maxMembers by rememberSaveable { mutableStateOf("10") }
    var showConfirm by remember { mutableStateOf(false) }

    val nameError = remember(name) {
        when {
            name.isBlank() -> "请输入团队名称"
            name.trim().length < 2 -> "团队名称至少需要2个字符"
            else -> null
        }
    }
    val maxMembersValue = remember(maxMembers) { maxMembers.trim().toIntOrNull() }
    val maxMembersError = remember(maxMembers, maxMembersValue) {
        when {
            maxMembers.isBlank() -> "请输入最大成员数"
            maxMembersValue == null -> "最大成员数必须为数字"
            maxMembersValue !in 1..500 -> "最大成员数需在1到500之间"
            else -> null
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
                    Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            CreateTeamFieldLabel(text = "团队名称", required = true)
                            TextField(
                                value = name,
                                onValueChange = { name = it },
                                placeholder = "请输入团队名称",
                                modifier = Modifier.fillMaxWidth(),
                            )
                            nameError?.let {
                                Text(
                                    text = it,
                                    style = SpineTheme.typography.caption,
                                    color = SpineTheme.colors.error,
                                )
                            }
                        }

                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            CreateTeamFieldLabel(text = "团队描述")
                            TextField(
                                value = description,
                                onValueChange = { description = it },
                                placeholder = "简单介绍团队职责与目标",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(120.dp),
                                singleLine = false,
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                CreateTeamFieldLabel(text = "所属医院")
                                TextField(
                                    value = hospital,
                                    onValueChange = { hospital = it },
                                    placeholder = "例如：协和医院",
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                CreateTeamFieldLabel(text = "所属科室")
                                TextField(
                                    value = department,
                                    onValueChange = { department = it },
                                    placeholder = "例如：放射科",
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }
                        }

                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            CreateTeamFieldLabel(text = "最大成员数", required = true)
                            TextField(
                                value = maxMembers,
                                onValueChange = { next ->
                                    maxMembers = next.filter { it.isDigit() }.take(3)
                                },
                                placeholder = "请输入最大成员数",
                                modifier = Modifier.fillMaxWidth(),
                            )
                            maxMembersError?.let {
                                Text(
                                    text = it,
                                    style = SpineTheme.typography.caption,
                                    color = SpineTheme.colors.error,
                                )
                            }
                        }
                    }
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                ) {
                    CreateTeamConfirmButton(
                        text = "创建团队",
                        enabled = nameError == null && maxMembersError == null,
                        onClick = { showConfirm = true },
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(32.dp))
            }
        }

        if (state.actionLoading) {
            LoadingOverlay(message = "...正在创建团队")
        }

        state.errorMessage?.let { error ->
            FloatingToast(
                message = error,
                accentColor = SpineTheme.colors.error,
                onDismiss = vm::clearMessages,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 96.dp),
            )
        }

        AppConfirmDialogHost(
            visible = showConfirm,
            title = "创建团队",
            message = "确认创建团队$name，并将最大成员数设为${maxMembersValue ?: 0}人吗？",
            confirmText = "创建团队",
            cancelText = "取消",
            confirmButtonColor = SpineTheme.colors.primary,
            cancelButtonColor = SpineTheme.colors.textSecondary,
            confirmTextColor = SpineTheme.colors.onPrimary,
            cancelTextColor = SpineTheme.colors.onPrimary,
            onDismissRequest = { showConfirm = false },
            onConfirm = {
                showConfirm = false
                vm.createTeam(
                    session = session,
                    repository = repository,
                    name = name,
                    description = description,
                    hospital = hospital,
                    department = department,
                    maxMembers = maxMembersValue,
                    onSessionUpdated = onSessionUpdated,
                    onSuccess = onFinished,
                    onSessionExpired = onSessionExpired,
                )
            },
        )
    }
}

@Composable
private fun CreateTeamFieldLabel(
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
private fun CreateTeamConfirmButton(
    text: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    val colors = SpineTheme.colors
    Box(
        modifier = Modifier
            .background(
                color = if (enabled) colors.primary else colors.surfaceMuted,
                shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
            )
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
