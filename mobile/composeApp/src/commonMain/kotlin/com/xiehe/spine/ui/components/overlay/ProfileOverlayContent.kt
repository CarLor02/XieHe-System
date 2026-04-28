package com.xiehe.spine.ui.components.overlay

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import com.xiehe.spine.OverlayRoute
import com.xiehe.spine.SessionScopedViewModels
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AppContainer
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.navigation.shared.HeaderTextAction
import com.xiehe.spine.ui.components.navigation.shared.SimpleShellHeader
import com.xiehe.spine.ui.motion.AppOverlayEntryHost
import com.xiehe.spine.ui.motion.AppRouteContentHost
import com.xiehe.spine.ui.screens.message.MessagesScreen
import com.xiehe.spine.ui.screens.profile.AppearanceScreen
import com.xiehe.spine.ui.screens.profile.ChangePasswordScreen
import com.xiehe.spine.ui.screens.profile.OrganizationCreateTeamScreen
import com.xiehe.spine.ui.screens.profile.OrganizationInviteScreen
import com.xiehe.spine.ui.screens.profile.OrganizationScreen
import com.xiehe.spine.ui.screens.profile.PersonalInfoScreen
import com.xiehe.spine.ui.screens.shared.MobileShell
import com.xiehe.spine.ui.viewmodel.organization.canInviteMembers
import com.xiehe.spine.ui.viewmodel.organization.currentMember
import com.xiehe.spine.ui.viewmodel.organization.selectedTeam
import com.xiehe.spine.ui.viewmodel.profile.AppearanceViewModel

@Composable
internal fun ProfileOverlayContent(
    route: OverlayRoute,
    session: UserSession,
    container: AppContainer,
    scopedViewModels: SessionScopedViewModels,
    appearanceVm: AppearanceViewModel,
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
    onRouteChange: (OverlayRoute?) -> Unit,
    onLogoutRequested: suspend () -> Unit,
    onSessionUpdated: (UserSession) -> Unit,
    onSessionExpired: (String) -> Unit,
    visible: Boolean,
    onExited: (() -> Unit)?,
) {
    val messagesState by scopedViewModels.messagesVm.state.collectAsState()
    val organizationState by scopedViewModels.organizationVm.state.collectAsState()
    var appearanceSaveTrigger by remember { mutableStateOf(0) }
    val canInviteMembers = organizationState.canInviteMembers(session.userId)
    val canCreateTeam =
        session.isSuperuser ||
            session.isSystemAdmin ||
            (organizationState.currentMember(session.userId)?.isSystemAdmin == true)

    MobileShell(
        selectedTab = selectedTab,
        onTabSelected = onTabSelected,
        showBottomBar = false,
        headerContent = {
            when (route) {
                OverlayRoute.Appearance -> {
                    SimpleShellHeader(
                        title = "系统设置",
                        leadingGlyph = IconToken.BACK,
                        onLeadingAction = { onRouteChange(null) },
                        actionsContent = {
                            HeaderTextAction(
                                text = "保存设置",
                                leadingGlyph = IconToken.SAVE,
                                onClick = { appearanceSaveTrigger += 1 },
                            )
                        },
                    )
                }

                OverlayRoute.PersonalInfo -> {
                    SimpleShellHeader(
                        title = "个人信息",
                        subtitle = "查看和修改您的个人资料",
                        leadingGlyph = IconToken.BACK,
                        onLeadingAction = { onRouteChange(null) },
                    )
                }

                OverlayRoute.Organization -> {
                    SimpleShellHeader(
                        title = "组织管理",
                        subtitle = "查看和管理组织成员",
                        leadingGlyph = IconToken.BACK,
                        onLeadingAction = { onRouteChange(null) },
                        actionsContent = if (canCreateTeam || canInviteMembers) {
                            {
                                Column(
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                    horizontalAlignment = Alignment.End,
                                ) {
                                    if (canCreateTeam) {
                                        HeaderTextAction(
                                            text = "创建团队",
                                            leadingGlyph = IconToken.ADD,
                                            onClick = { onRouteChange(OverlayRoute.OrganizationCreateTeam) },
                                        )
                                    }
                                    if (canInviteMembers) {
                                        HeaderTextAction(
                                            text = "邀请成员",
                                            leadingGlyph = IconToken.ADD,
                                            onClick = { onRouteChange(OverlayRoute.OrganizationInvite) },
                                        )
                                    }
                                }
                            }
                        } else {
                            null
                        },
                    )
                }

                OverlayRoute.OrganizationCreateTeam -> {
                    SimpleShellHeader(
                        title = "创建新团队",
                        subtitle = "创建新的协作团队",
                        leadingGlyph = IconToken.BACK,
                        onLeadingAction = { onRouteChange(OverlayRoute.Organization) },
                    )
                }

                OverlayRoute.OrganizationInvite -> {
                    SimpleShellHeader(
                        title = "邀请新成员",
                        subtitle = organizationState.selectedTeam?.name ?: "发送组织邀请",
                        leadingGlyph = IconToken.BACK,
                        onLeadingAction = { onRouteChange(OverlayRoute.Organization) },
                    )
                }

                OverlayRoute.ChangePassword -> {
                    SimpleShellHeader(
                        title = "修改密码",
                        subtitle = "定期更换密码保障账号安全",
                        leadingGlyph = IconToken.BACK,
                        onLeadingAction = { onRouteChange(null) },
                    )
                }

                OverlayRoute.Messages -> {
                    SimpleShellHeader(
                        title = "消息中心",
                        subtitle = "${messagesState.items.size}条消息",
                        leadingGlyph = IconToken.BACK,
                        onLeadingAction = { onRouteChange(null) },
                    )
                }

                else -> Unit
            }
        },
    ) {
        AppOverlayEntryHost(
            visible = visible,
            onExited = onExited,
        ) {
            AppRouteContentHost(
                targetState = route,
                orderOf = ::profileOverlayOrder,
                label = "profile_overlay_content_transition",
            ) { currentRoute ->
                when (currentRoute) {
                    OverlayRoute.Appearance -> {
                        AppearanceScreen(
                            vm = appearanceVm,
                            saveTrigger = appearanceSaveTrigger,
                        )
                    }

                    OverlayRoute.PersonalInfo -> {
                        PersonalInfoScreen(
                            vm = scopedViewModels.personalInfoVm,
                            session = session,
                            authRepository = container.authRepository,
                            onSessionUpdated = onSessionUpdated,
                            onSessionExpired = onSessionExpired,
                        )
                    }

                    OverlayRoute.Organization -> {
                        OrganizationScreen(
                            vm = scopedViewModels.organizationVm,
                            session = session,
                            repository = container.organizationRepository,
                            onSessionUpdated = onSessionUpdated,
                            onSessionExpired = onSessionExpired,
                        )
                    }

                    OverlayRoute.OrganizationCreateTeam -> {
                        OrganizationCreateTeamScreen(
                            vm = scopedViewModels.organizationVm,
                            session = session,
                            repository = container.organizationRepository,
                            onSessionUpdated = onSessionUpdated,
                            onFinished = { onRouteChange(OverlayRoute.Organization) },
                            onSessionExpired = onSessionExpired,
                        )
                    }

                    OverlayRoute.OrganizationInvite -> {
                        OrganizationInviteScreen(
                            vm = scopedViewModels.organizationVm,
                            session = session,
                            repository = container.organizationRepository,
                            onSessionUpdated = onSessionUpdated,
                            onFinished = { onRouteChange(OverlayRoute.Organization) },
                            onSessionExpired = onSessionExpired,
                        )
                    }

                    OverlayRoute.ChangePassword -> {
                        ChangePasswordScreen(
                            session = session,
                            authRepository = container.authRepository,
                            onPasswordChanged = onLogoutRequested,
                            onFinished = { onRouteChange(null) },
                            onSessionExpired = onSessionExpired,
                        )
                    }

                    OverlayRoute.Messages -> {
                        MessagesScreen(
                            vm = scopedViewModels.messagesVm,
                            session = session,
                            repository = container.notificationRepository,
                            onSessionUpdated = onSessionUpdated,
                            onSessionExpired = onSessionExpired,
                        )
                    }

                    else -> Unit
                }
            }
        }
    }
}

private fun profileOverlayOrder(route: OverlayRoute): Int = when (route) {
    OverlayRoute.OrganizationInvite,
    OverlayRoute.OrganizationCreateTeam,
    OverlayRoute.ChangePassword,
    -> 1
    OverlayRoute.Appearance,
    OverlayRoute.PersonalInfo,
    OverlayRoute.Organization,
    OverlayRoute.Messages,
    -> 0
    else -> 0
}
