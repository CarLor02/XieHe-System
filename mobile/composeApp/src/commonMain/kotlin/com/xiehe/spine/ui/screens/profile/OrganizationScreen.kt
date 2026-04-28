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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.organization.OrganizationInvitation
import com.xiehe.spine.data.organization.OrganizationMember
import com.xiehe.spine.data.organization.OrganizationRepository
import com.xiehe.spine.data.organization.OrganizationRole
import com.xiehe.spine.data.organization.OrganizationTeamSummary
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.feedback.shared.FloatingToast
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.form.input.TextField
import com.xiehe.spine.ui.components.form.picker.OptionPickerOverlay
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.motion.AppConfirmDialogHost
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.organization.OrganizationTab
import com.xiehe.spine.ui.viewmodel.organization.OrganizationViewModel
import com.xiehe.spine.ui.viewmodel.organization.canManageTarget
import com.xiehe.spine.ui.viewmodel.organization.currentMember
import com.xiehe.spine.ui.viewmodel.organization.selectedTeam
import com.xiehe.spine.ui.viewmodel.organization.stableId

private enum class MemberManagementAction {
    CHANGE_ROLE,
    REMOVE_MEMBER,
}

@Composable
fun OrganizationScreen(
    vm: OrganizationViewModel,
    session: UserSession,
    repository: OrganizationRepository,
    onSessionUpdated: (UserSession) -> Unit,
    onSessionExpired: (String) -> Unit = {},
) {
    val state by vm.state.collectAsState()
    val team = state.selectedTeam

    var rolePickerMember by remember { mutableStateOf<OrganizationMember?>(null) }
    var pendingRoleChange by remember { mutableStateOf<Pair<OrganizationMember, OrganizationRole>?>(null) }
    var pendingDeleteMember by remember { mutableStateOf<OrganizationMember?>(null) }
    var confirmVisible by remember { mutableStateOf(false) }
    var confirmAction by remember { mutableStateOf<MemberManagementAction?>(null) }

    LaunchedEffect(session.accessToken) {
        vm.load(
            session = session,
            repository = repository,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SpineTheme.colors.backgroundElevated),
    ) {
        LazyOrganizationContent(
            state = state,
            session = session,
            onSelectTeam = { teamId ->
                vm.selectTeam(
                    session = session,
                    repository = repository,
                    teamId = teamId,
                    onSessionUpdated = onSessionUpdated,
                    onSessionExpired = onSessionExpired,
                )
            },
            onChangeRole = { member ->
                rolePickerMember = member
            },
            onDeleteMember = { member ->
                pendingDeleteMember = member
                confirmAction = MemberManagementAction.REMOVE_MEMBER
                confirmVisible = true
            },
            onSelectTab = vm::selectTab,
            onUpdateSearch = vm::updateSearch,
            onAcceptInvitation = { invitation ->
                vm.respondInvitation(
                    session = session,
                    repository = repository,
                    invitation = invitation,
                    accept = true,
                    onSessionUpdated = onSessionUpdated,
                    onSessionExpired = onSessionExpired,
                )
            },
            onRejectInvitation = { invitation ->
                vm.respondInvitation(
                    session = session,
                    repository = repository,
                    invitation = invitation,
                    accept = false,
                    onSessionUpdated = onSessionUpdated,
                    onSessionExpired = onSessionExpired,
                )
            },
            onDismissNotice = vm::clearMessages,
        )

        if (state.loading || state.actionLoading) {
            LoadingOverlay(message = if (state.actionLoading) "...正在提交中" else "...正在加载中")
        }

        val toastMessage = state.errorMessage ?: state.noticeMessage
        if (toastMessage != null) {
            FloatingToast(
                message = toastMessage,
                accentColor = if (state.errorMessage != null) {
                    SpineTheme.colors.error
                } else {
                    SpineTheme.colors.success
                },
                icon = if (state.errorMessage != null) IconToken.MESSAGE else IconToken.CHECK,
                onDismiss = vm::clearMessages,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 96.dp),
            )
        }

        rolePickerMember?.let { member ->
            OptionPickerOverlay(
                title = "变更 ${member.displayName()} 的团队身份为:",
                options = OrganizationRole.entries.map { it.label },
                selected = member.roleLabel(),
                onDismiss = { rolePickerMember = null },
                onSelect = { selected ->
                    rolePickerMember = null
                    OrganizationRole.entries.firstOrNull { it.label == selected }?.let { role ->
                        if (role.apiValue != member.normalizedRoleValue()) {
                            pendingRoleChange = member to role
                            confirmAction = MemberManagementAction.CHANGE_ROLE
                            confirmVisible = true
                        }
                    }
                },
            )
        }

        when (confirmAction) {
            MemberManagementAction.CHANGE_ROLE -> {
                val change = pendingRoleChange
                if (change != null) {
                    val (member, role) = change
                    AppConfirmDialogHost(
                        visible = confirmVisible,
                        title = "变更身份",
                        message = "确认将 ${member.displayName()} 的团队身份变更为${role.label}吗？",
                        confirmText = "确认变更",
                        cancelText = "取消",
                        confirmButtonColor = SpineTheme.colors.primary,
                        cancelButtonColor = SpineTheme.colors.textSecondary,
                        confirmTextColor = SpineTheme.colors.onPrimary,
                        cancelTextColor = SpineTheme.colors.onPrimary,
                        onDismissRequest = { confirmVisible = false },
                        onDismissed = {
                            if (!confirmVisible) {
                                confirmAction = null
                                pendingRoleChange = null
                            }
                        },
                        onConfirm = {
                            confirmVisible = false
                            val teamId = team?.id ?: return@AppConfirmDialogHost
                            vm.updateMemberRole(
                                session = session,
                                repository = repository,
                                teamId = teamId,
                                member = member,
                                role = role,
                                onSessionUpdated = onSessionUpdated,
                                onSessionExpired = onSessionExpired,
                            )
                        },
                    )
                }
            }

            MemberManagementAction.REMOVE_MEMBER -> {
                val member = pendingDeleteMember
                if (member != null) {
                    AppConfirmDialogHost(
                        visible = confirmVisible,
                        title = "删除成员",
                        message = "确认将 ${member.displayName()} 从当前组织中移除吗？该操作不可撤销。",
                        confirmText = "删除成员",
                        cancelText = "取消",
                        confirmButtonColor = SpineTheme.colors.error,
                        cancelButtonColor = SpineTheme.colors.textSecondary,
                        confirmTextColor = SpineTheme.colors.onPrimary,
                        cancelTextColor = SpineTheme.colors.onPrimary,
                        onDismissRequest = { confirmVisible = false },
                        onDismissed = {
                            if (!confirmVisible) {
                                confirmAction = null
                                pendingDeleteMember = null
                            }
                        },
                        onConfirm = {
                            confirmVisible = false
                            val teamId = team?.id ?: return@AppConfirmDialogHost
                            vm.removeMember(
                                session = session,
                                repository = repository,
                                teamId = teamId,
                                member = member,
                                onSessionUpdated = onSessionUpdated,
                                onSessionExpired = onSessionExpired,
                            )
                        },
                    )
                }
            }

            null -> Unit
        }
    }
}

@Composable
private fun LazyOrganizationContent(
    state: com.xiehe.spine.ui.viewmodel.organization.OrganizationUiState,
    session: UserSession,
    onSelectTeam: (Int) -> Unit,
    onChangeRole: (OrganizationMember) -> Unit,
    onDeleteMember: (OrganizationMember) -> Unit,
    onSelectTab: (OrganizationTab) -> Unit,
    onUpdateSearch: (String) -> Unit,
    onAcceptInvitation: (OrganizationInvitation) -> Unit,
    onRejectInvitation: (OrganizationInvitation) -> Unit,
    onDismissNotice: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            OrganizationSummaryCarousel(
                teams = state.teams,
                selectedTeamId = state.selectedTeamId,
                roleLabels = state.teamRoleLabels,
                onSelectTeam = onSelectTeam,
            )
        }

        item {
            OrganizationTabBar(
                activeTab = state.activeTab,
                memberCount = state.members.size,
                invitationCount = state.invitations.size,
                onSelect = {
                    onDismissNotice()
                    onSelectTab(it)
                },
            )
        }

        item {
            TextField(
                value = state.search,
                onValueChange = onUpdateSearch,
                placeholder = if (state.activeTab == OrganizationTab.MEMBERS) {
                    "搜索姓名、职位或邮箱"
                } else {
                    "搜索团队、邀请人或邮箱"
                },
                modifier = Modifier.fillMaxWidth(),
                leadingGlyph = IconToken.SEARCH,
            )
        }

        when {
            state.selectedTeam == null && state.activeTab == OrganizationTab.MEMBERS -> {
                item {
                    OrganizationEmptyCard(
                        title = "暂无加入的组织",
                        body = "当前账号还没有可展示的组织信息，待加入团队后这里会显示组织详情与成员列表。",
                        glyph = IconToken.USERS,
                    )
                }
            }

            state.activeTab == OrganizationTab.MEMBERS && state.filteredMembers.isEmpty() -> {
                item {
                    OrganizationEmptyCard(
                        title = if (state.search.isBlank()) "暂无成员数据" else "没有匹配的成员",
                        body = if (state.search.isBlank()) {
                            "当前组织暂时没有可展示的成员记录。"
                        } else {
                            "请尝试调整搜索关键词。"
                        },
                        glyph = IconToken.USER_ROUND,
                    )
                }
            }

            state.activeTab == OrganizationTab.INVITES && state.filteredInvitations.isEmpty() -> {
                item {
                    OrganizationEmptyCard(
                        title = if (state.search.isBlank()) "暂无邀请" else "没有匹配的邀请",
                        body = if (state.search.isBlank()) {
                            "当前账号还没有待处理的组织邀请。"
                        } else {
                            "请尝试调整搜索关键词。"
                        },
                        glyph = IconToken.MESSAGE,
                    )
                }
            }

            state.activeTab == OrganizationTab.MEMBERS -> {
                items(state.filteredMembers, key = { it.userId }) { member ->
                    OrganizationMemberCard(
                        member = member,
                        isCurrentUser = member.userId == session.userId,
                        canManage = state.canManageTarget(member, session.userId),
                        onChangeRole = { onChangeRole(member) },
                        onDelete = { onDeleteMember(member) },
                    )
                }
            }

            else -> {
                items(
                    items = state.filteredInvitations,
                    key = { invitation -> invitation.stableId ?: invitation.hashCode() },
                ) { invitation ->
                    OrganizationInvitationCard(
                        invitation = invitation,
                        onAccept = { onAcceptInvitation(invitation) },
                        onReject = { onRejectInvitation(invitation) },
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(56.dp))
        }
    }
}

@Composable
private fun OrganizationSummaryCarousel(
    teams: List<OrganizationTeamSummary>,
    selectedTeamId: Int?,
    roleLabels: Map<Int, String>,
    onSelectTeam: (Int) -> Unit,
) {
    if (teams.isEmpty()) {
        OrganizationSummaryCard(team = null, currentRoleLabel = null)
        return
    }

    val selectedIndex = teams.indexOfFirst { it.id == selectedTeamId }.let { if (it >= 0) it else 0 }
    val pagerState = rememberPagerState(
        initialPage = selectedIndex,
        pageCount = { teams.size },
    )

    LaunchedEffect(selectedIndex, teams.size) {
        if (teams.isNotEmpty() && pagerState.currentPage != selectedIndex) {
            pagerState.scrollToPage(selectedIndex)
        }
    }

    LaunchedEffect(pagerState.currentPage, teams) {
        teams.getOrNull(pagerState.currentPage)?.id?.let { teamId ->
            if (teamId != selectedTeamId) {
                onSelectTeam(teamId)
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth(),
            pageSpacing = 12.dp,
        ) { page ->
            val team = teams[page]
            OrganizationSummaryCard(
                team = team,
                currentRoleLabel = roleLabels[team.id] ?: "成员",
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            teams.forEachIndexed { index, _ ->
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(
                            if (index == selectedIndex) {
                                SpineTheme.colors.primary
                            } else {
                                SpineTheme.colors.borderSubtle
                            },
                        )
                        .size(width = if (index == selectedIndex) 18.dp else 8.dp, height = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun OrganizationSummaryCard(
    team: OrganizationTeamSummary?,
    currentRoleLabel: String?,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Card(modifier = modifier.fillMaxWidth()) {
        if (team == null) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(colors.surfaceMuted),
                    contentAlignment = Alignment.Center,
                ) {
                    AppIcon(glyph = IconToken.USERS, tint = colors.textTertiary, modifier = Modifier.size(24.dp))
                }
                Text(
                    text = "暂无组织信息",
                    style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                    color = colors.textPrimary,
                )
                Text(
                    text = "当前账号还没有加入组织。",
                    style = SpineTheme.typography.subhead,
                    color = colors.textSecondary,
                )
            }
            return@Card
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Box(
                modifier = Modifier
                    .size(62.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(colors.primary.copy(alpha = 0.72f), colors.primary),
                        ),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(
                    glyph = IconToken.USERS,
                    tint = colors.onPrimary,
                    modifier = Modifier.size(28.dp),
                )
            }

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = team.name,
                    style = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
                    color = colors.textPrimary,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    MetaBadge(
                        text = currentRoleLabel ?: "成员",
                        background = colors.primaryMuted,
                        foreground = colors.primary,
                    )
                    Text(
                        text = listOfNotNull(team.hospital, team.department)
                            .joinToString(" · ")
                            .ifBlank { "#ORG-${team.id}" },
                        style = SpineTheme.typography.subhead,
                        color = colors.textSecondary,
                    )
                }
                Text(
                    text = team.description?.takeIf { it.isNotBlank() } ?: "暂无组织描述",
                    style = SpineTheme.typography.subhead,
                    color = colors.textTertiary,
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(colors.borderSubtle),
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SummaryStat(
                title = "成员总数",
                value = team.memberCount.toString(),
                modifier = Modifier.weight(1f),
            )
            SummaryDivider()
            SummaryStat(
                title = "我的角色",
                value = currentRoleLabel ?: "成员",
                modifier = Modifier.weight(1f),
            )
            SummaryDivider()
            SummaryStat(
                title = "成员上限",
                value = team.maxMembers?.toString() ?: "--",
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun OrganizationTabBar(
    activeTab: OrganizationTab,
    memberCount: Int,
    invitationCount: Int,
    onSelect: (OrganizationTab) -> Unit,
) {
    val colors = SpineTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(colors.surface)
            .border(1.dp, colors.borderSubtle, RoundedCornerShape(20.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        OrganizationTabButton(
            selected = activeTab == OrganizationTab.MEMBERS,
            label = "成员列表",
            count = memberCount,
            glyph = IconToken.USERS,
            onClick = { onSelect(OrganizationTab.MEMBERS) },
            modifier = Modifier.weight(1f),
        )
        OrganizationTabButton(
            selected = activeTab == OrganizationTab.INVITES,
            label = "我的邀请",
            count = invitationCount,
            glyph = IconToken.MESSAGE,
            onClick = { onSelect(OrganizationTab.INVITES) },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun OrganizationTabButton(
    selected: Boolean,
    label: String,
    count: Int,
    glyph: IconToken,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val background = if (selected) {
        Brush.linearGradient(listOf(colors.primary.copy(alpha = 0.92f), colors.primary))
    } else {
        Brush.linearGradient(listOf(colors.surface, colors.surface))
    }
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(background)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppIcon(
            glyph = glyph,
            tint = if (selected) colors.onPrimary else colors.textSecondary,
            modifier = Modifier.size(16.dp),
        )
        Text(
            text = label,
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            color = if (selected) colors.onPrimary else colors.textSecondary,
            modifier = Modifier.weight(1f),
        )
        MetaBadge(
            text = count.toString(),
            background = if (selected) colors.onPrimary.copy(alpha = 0.18f) else colors.surfaceMuted,
            foreground = if (selected) colors.onPrimary else colors.textSecondary,
        )
    }
}

@Composable
private fun OrganizationMemberCard(
    member: OrganizationMember,
    isCurrentUser: Boolean,
    canManage: Boolean,
    onChangeRole: () -> Unit,
    onDelete: () -> Unit,
) {
    val colors = SpineTheme.colors
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AvatarBadge(
                label = member.initialLabel(),
                brush = Brush.linearGradient(
                    listOf(colors.primary.copy(alpha = 0.74f), colors.info.copy(alpha = 0.9f)),
                ),
            )
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = member.displayName(),
                        style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                        color = colors.textPrimary,
                    )
                    if (isCurrentUser) {
                        MetaBadge(
                            text = "我",
                            background = colors.primaryMuted,
                            foreground = colors.primary,
                        )
                    }
                    if (member.roleLabel() != "成员") {
                        MetaBadge(
                            text = member.roleLabel(),
                            background = colors.warning.copy(alpha = if (colors.isDark) 0.2f else 0.12f),
                            foreground = colors.warning,
                        )
                    }
                }
                Text(
                    text = member.subtitleLabel(),
                    style = SpineTheme.typography.subhead,
                    color = colors.textSecondary,
                )
                member.email?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = it,
                        style = SpineTheme.typography.caption,
                        color = colors.textTertiary,
                    )
                }
            }
            if (canManage) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    horizontalAlignment = Alignment.End,
                ) {
                    MemberActionChip(
                        text = "变更身份",
                        background = colors.primaryMuted,
                        foreground = colors.primary,
                        onClick = onChangeRole,
                    )
                    MemberActionChip(
                        text = "删除成员",
                        background = colors.error.copy(alpha = if (colors.isDark) 0.22f else 0.12f),
                        foreground = colors.error,
                        onClick = onDelete,
                    )
                }
            }
        }
    }
}

@Composable
private fun OrganizationInvitationCard(
    invitation: OrganizationInvitation,
    onAccept: () -> Unit,
    onReject: () -> Unit,
) {
    val colors = SpineTheme.colors
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top,
        ) {
            AvatarBadge(
                label = invitation.initialLabel(),
                brush = Brush.linearGradient(
                    listOf(colors.warning.copy(alpha = 0.82f), colors.warning),
                ),
            )
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = invitation.teamTitle(),
                        style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                        color = colors.textPrimary,
                        modifier = Modifier.weight(1f),
                    )
                    MetaBadge(
                        text = invitation.statusLabel(),
                        background = colors.warning.copy(alpha = if (colors.isDark) 0.2f else 0.14f),
                        foreground = colors.warning,
                    )
                }
                Text(
                    text = invitation.inviterLabel(),
                    style = SpineTheme.typography.subhead,
                    color = colors.textSecondary,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "邀请你以",
                        style = SpineTheme.typography.subhead,
                        color = colors.textSecondary,
                    )
                    MetaBadge(
                        text = invitation.inviteRoleLabel(),
                        background = colors.primaryMuted,
                        foreground = colors.primary,
                    )
                    Text(
                        text = "的身份加入",
                        style = SpineTheme.typography.subhead,
                        color = colors.textSecondary,
                    )
                }
                invitation.createdAt?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = "邀请时间 ${it.take(10)}",
                        style = SpineTheme.typography.caption,
                        color = colors.textTertiary,
                    )
                }
                if (invitation.stableId != null && invitation.status.isPendingInvitation()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.End,
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            ActionChip(
                                text = "接受",
                                background = colors.primaryMuted,
                                foreground = colors.primary,
                                onClick = onAccept,
                            )
                            ActionChip(
                                text = "拒绝",
                                background = colors.error.copy(alpha = if (colors.isDark) 0.22f else 0.12f),
                                foreground = colors.error,
                                onClick = onReject,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OrganizationEmptyCard(
    title: String,
    body: String,
    glyph: IconToken,
) {
    val colors = SpineTheme.colors
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(colors.surfaceMuted),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(glyph = glyph, tint = colors.textTertiary, modifier = Modifier.size(24.dp))
            }
            Text(
                text = title,
                style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                color = colors.textPrimary,
            )
            Text(
                text = body,
                style = SpineTheme.typography.subhead,
                color = colors.textSecondary,
            )
        }
    }
}

@Composable
private fun AvatarBadge(
    label: String,
    brush: Brush,
) {
    val colors = SpineTheme.colors
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(brush),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
            color = colors.onPrimary,
        )
    }
}

@Composable
private fun MetaBadge(
    text: String,
    background: Color,
    foreground: Color,
) {
    Text(
        text = text,
        style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
        color = foreground,
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(background)
            .padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

@Composable
private fun SummaryStat(
    title: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = value,
            style = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
            color = colors.textPrimary,
        )
        Text(
            text = title,
            style = SpineTheme.typography.caption,
            color = colors.textTertiary,
        )
    }
}

@Composable
private fun SummaryDivider() {
    Box(
        modifier = Modifier
            .size(width = 1.dp, height = 32.dp)
            .background(SpineTheme.colors.borderSubtle),
    )
}

@Composable
private fun ActionChip(
    text: String,
    background: Color,
    foreground: Color,
    onClick: () -> Unit,
) {
    Text(
        text = text,
        style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.SemiBold),
        color = foreground,
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .background(background)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
    )
}

@Composable
private fun MemberActionChip(
    text: String,
    background: Color,
    foreground: Color,
    onClick: () -> Unit,
) {
    Text(
        text = text,
        style = SpineTheme.typography.caption.copy(fontWeight = FontWeight.SemiBold),
        color = foreground,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(background)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 6.dp),
    )
}

private fun OrganizationMember.displayName(): String {
    return realName?.takeIf { it.isNotBlank() }
        ?: fullName?.takeIf { it.isNotBlank() }
        ?: username?.takeIf { it.isNotBlank() }
        ?: "未命名成员"
}

private fun OrganizationMember.subtitleLabel(): String {
    return listOfNotNull(roleLabel().takeIf { it.isNotBlank() }, department?.takeIf { it.isNotBlank() })
        .joinToString(" · ")
        .ifBlank { status?.takeIf { it.isNotBlank() } ?: "暂无岗位信息" }
}

private fun OrganizationMember.roleLabel(): String {
    return when {
        isCreator -> "创建者"
        role.equals("ADMIN", ignoreCase = true) -> "管理员"
        role.equals("GUEST", ignoreCase = true) -> "访客"
        else -> "成员"
    }
}

private fun OrganizationMember.normalizedRoleValue(): String {
    return when {
        isCreator -> OrganizationRole.ADMIN.apiValue
        role.equals("ADMIN", ignoreCase = true) -> OrganizationRole.ADMIN.apiValue
        role.equals("GUEST", ignoreCase = true) -> OrganizationRole.GUEST.apiValue
        else -> OrganizationRole.MEMBER.apiValue
    }
}

private fun OrganizationMember.initialLabel(): String {
    return displayName().trim().firstOrNull()?.toString() ?: "团"
}

private fun OrganizationInvitation.teamTitle(): String {
    return teamName?.takeIf { it.isNotBlank() }
        ?: team?.name?.takeIf { it.isNotBlank() }
        ?: "组织邀请"
}

private fun OrganizationInvitation.inviterLabel(): String {
    val inviterDisplay = inviterName?.takeIf { it.isNotBlank() }
        ?: inviter?.realName?.takeIf { it.isNotBlank() }
        ?: inviter?.fullName?.takeIf { it.isNotBlank() }
        ?: inviter?.username?.takeIf { it.isNotBlank() }
        ?: inviterEmail?.takeIf { it.isNotBlank() }
        ?: inviter?.email?.takeIf { it.isNotBlank() }
    return inviterDisplay?.let { "邀请人 $it" } ?: "邀请人信息待补充"
}

private fun OrganizationInvitation.roleLabel(): String {
    return role?.takeIf { it.isNotBlank() }?.let { "加入角色 $it" } ?: "角色信息待补充"
}

private fun OrganizationInvitation.statusLabel(): String {
    return when {
        status.equals("pending", ignoreCase = true) -> "待处理"
        status.equals("accepted", ignoreCase = true) -> "已接受"
        status.equals("rejected", ignoreCase = true) -> "已拒绝"
        status.equals("expired", ignoreCase = true) -> "已过期"
        else -> "邀请"
    }
}

private fun String?.isPendingInvitation(): Boolean {
    return this.isNullOrBlank() || equals("pending", ignoreCase = true)
}

private fun OrganizationInvitation.initialLabel(): String {
    return teamTitle().trim().firstOrNull()?.toString() ?: "邀"
}

private fun OrganizationInvitation.inviteRoleLabel(): String {
    return when {
        role.equals("ADMIN", ignoreCase = true) -> "管理员"
        role.equals("GUEST", ignoreCase = true) -> "访客"
        role.equals("MEMBER", ignoreCase = true) -> "成员"
        else -> "成员"
    }
}
