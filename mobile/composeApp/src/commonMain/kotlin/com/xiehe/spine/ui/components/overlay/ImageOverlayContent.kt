package com.xiehe.spine.ui.components.overlay

import androidx.compose.runtime.Composable
import com.xiehe.spine.OverlayRoute
import com.xiehe.spine.SessionScopedViewModels
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AppContainer
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.navigation.shared.SimpleShellHeader
import com.xiehe.spine.ui.motion.AppOverlayEntryHost
import com.xiehe.spine.ui.screens.image.ImageAnalysisScreen
import com.xiehe.spine.ui.screens.image.ImageUploadScreen
import com.xiehe.spine.ui.screens.shared.MobileShell

@Composable
internal fun ImageOverlayContent(
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
    AppOverlayEntryHost(
        visible = visible,
        onExited = onExited,
    ) {
        when (route) {
            is OverlayRoute.ImageAnalysis -> {
                ImageAnalysisScreen(
                    fileId = route.fileId,
                    patientId = route.patientId,
                    examType = route.examType,
                    vm = scopedViewModels.imageAnalysisVm,
                    session = session,
                    onSessionUpdated = onSessionUpdated,
                    onBack = { onRouteChange(null) },
                    onSessionExpired = onSessionExpired,
                )
            }

            OverlayRoute.ImageUpload -> {
                MobileShell(
                    selectedTab = selectedTab,
                    onTabSelected = onTabSelected,
                    showBottomBar = false,
                    headerContent = {
                        SimpleShellHeader(
                            title = "上传影像",
                            leadingGlyph = IconToken.BACK,
                            onLeadingAction = { onRouteChange(null) },
                        )
                    },
                ) {
                    ImageUploadScreen(
                        vm = scopedViewModels.imageUploadVm,
                        session = session,
                        onSessionUpdated = onSessionUpdated,
                        onSessionExpired = onSessionExpired,
                        onUploadSuccess = {
                            onRouteChange(null)
                            onTabSelected(2)
                            scopedViewModels.imagesVm.refresh(
                                session = session,
                                onSessionUpdated = onSessionUpdated,
                                onSessionExpired = onSessionExpired,
                            )
                        },
                    )
                }
            }

            else -> Unit
        }
    }
}
