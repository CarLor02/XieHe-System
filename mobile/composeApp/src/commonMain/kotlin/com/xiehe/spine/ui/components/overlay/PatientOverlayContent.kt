package com.xiehe.spine.ui.components.overlay

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.xiehe.spine.OverlayRoute
import com.xiehe.spine.SessionScopedViewModels
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AppContainer
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.navigation.shared.HeaderTextAction
import com.xiehe.spine.ui.components.navigation.shared.SimpleShellHeader
import com.xiehe.spine.ui.motion.AppConfirmDialogHost
import com.xiehe.spine.ui.motion.AppOverlayEntryHost
import com.xiehe.spine.ui.motion.AppRouteContentHost
import com.xiehe.spine.ui.screens.patient.PatientDetailScreen
import com.xiehe.spine.ui.screens.patient.PatientEditScreen
import com.xiehe.spine.ui.screens.patient.PatientFormScreen
import com.xiehe.spine.ui.screens.shared.MobileShell
import com.xiehe.spine.ui.theme.SpineTheme

@Composable
internal fun PatientOverlayContent(
    route: OverlayRoute,
    session: UserSession,
    container: AppContainer,
    scopedViewModels: SessionScopedViewModels,
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
    onRouteChange: (OverlayRoute?) -> Unit,
    onLogoutRequested: suspend () -> Unit,
    onSessionUpdated: (UserSession) -> Unit,
    onSessionExpired: (String) -> Unit,
    visible: Boolean,
    onExited: (() -> Unit)?,
) {
    val detailRoute = route as? OverlayRoute.PatientDetail
    var showDeletePatientConfirm by remember(detailRoute?.patientId) { mutableStateOf(false) }

    MobileShell(
        selectedTab = selectedTab,
        onTabSelected = onTabSelected,
        showBottomBar = false,
        headerContent = {
            when (route) {
                is OverlayRoute.PatientDetail -> {
                    val colors = SpineTheme.colors
                    SimpleShellHeader(
                        title = "患者详情",
                        subtitle = "查看和管理患者完整信息",
                        leadingGlyph = IconToken.BACK,
                        onLeadingAction = { onRouteChange(null) },
                        actionsContent = {
                            HeaderTextAction(
                                text = "编辑信息",
                                onClick = { onRouteChange(OverlayRoute.PatientEdit(route.patientId)) },
                            )
                            HeaderTextAction(
                                text = "删除",
                                onClick = {
                                    showDeletePatientConfirm = true
                                },
                                fill = colors.error,
                                borderColor = colors.error,
                                textColor = colors.onPrimary,
                            )
                        },
                    )
                }

                OverlayRoute.PatientForm -> {
                    SimpleShellHeader(
                        title = "添加患者",
                        leadingGlyph = IconToken.BACK,
                        onLeadingAction = { onRouteChange(null) },
                    )
                }

                is OverlayRoute.PatientEdit -> {
                    SimpleShellHeader(
                        title = "编辑患者",
                        leadingGlyph = IconToken.BACK,
                        onLeadingAction = { onRouteChange(OverlayRoute.PatientDetail(route.patientId)) },
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
                orderOf = ::patientOverlayOrder,
                label = "patient_overlay_content_transition",
            ) { currentRoute ->
                when (currentRoute) {
                    is OverlayRoute.PatientDetail -> {
                        PatientDetailScreen(
                            patientId = currentRoute.patientId,
                            vm = scopedViewModels.patientDetailVm,
                            session = session,
                            patientRepository = container.patientRepository,
                            imageRepository = container.imageFileRepository,
                            onSessionUpdated = onSessionUpdated,
                            onSessionExpired = onSessionExpired,
                            onOpenAnalysis = { fileId, patientId, examType ->
                                onRouteChange(
                                    OverlayRoute.ImageAnalysis(
                                        fileId = fileId,
                                        patientId = patientId,
                                        examType = examType,
                                    ),
                                )
                            },
                            onOpenImageUpload = { onRouteChange(OverlayRoute.ImageUpload) },
                        )

                        if (showDeletePatientConfirm) {
                            AppConfirmDialogHost(
                                visible = showDeletePatientConfirm,
                                title = "删除患者",
                                message = "确认删除该患者吗？该操作会执行软删除，患者记录将不再显示在列表中。",
                                confirmText = "删除",
                                cancelText = "取消",
                                confirmButtonColor = SpineTheme.colors.error,
                                cancelButtonColor = SpineTheme.colors.textSecondary,
                                confirmTextColor = SpineTheme.colors.onPrimary,
                                cancelTextColor = SpineTheme.colors.onPrimary,
                                onDismissRequest = { showDeletePatientConfirm = false },
                                onConfirm = {
                                    showDeletePatientConfirm = false
                                    scopedViewModels.patientDetailVm.delete(
                                        patientId = currentRoute.patientId,
                                        session = session,
                                        repository = container.patientRepository,
                                        onSessionUpdated = onSessionUpdated,
                                        onDeleted = { updatedSession ->
                                            onSessionUpdated(updatedSession)
                                            onTabSelected(1)
                                            onRouteChange(null)
                                            scopedViewModels.patientsVm.refresh(
                                                session = updatedSession,
                                                repository = container.patientRepository,
                                                onSessionUpdated = onSessionUpdated,
                                                onSessionExpired = onSessionExpired,
                                            )
                                        },
                                        onSessionExpired = onSessionExpired,
                                    )
                                },
                            )
                        }
                    }

                    OverlayRoute.PatientForm -> {
                        PatientFormScreen(
                            vm = scopedViewModels.patientFormVm,
                            session = session,
                            repository = container.patientRepository,
                            onSessionUpdated = onSessionUpdated,
                            onSessionExpired = onSessionExpired,
                            onSubmitSuccess = {
                                onRouteChange(null)
                                onTabSelected(1)
                            },
                        )
                    }

                    is OverlayRoute.PatientEdit -> {
                        PatientEditScreen(
                            patientId = currentRoute.patientId,
                            vm = scopedViewModels.patientEditVm,
                            session = session,
                            repository = container.patientRepository,
                            onSessionUpdated = onSessionUpdated,
                            onSessionExpired = onSessionExpired,
                            onSubmitSuccess = {
                                onRouteChange(OverlayRoute.PatientDetail(currentRoute.patientId))
                            },
                        )
                    }

                    else -> Unit
                }
            }
        }
    }
}

private fun patientOverlayOrder(route: OverlayRoute): Int = when (route) {
    is OverlayRoute.PatientEdit -> 1
    is OverlayRoute.PatientDetail,
    OverlayRoute.PatientForm,
    -> 0
    else -> 0
}
