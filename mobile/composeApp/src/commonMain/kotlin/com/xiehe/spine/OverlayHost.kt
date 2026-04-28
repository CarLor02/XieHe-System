package com.xiehe.spine

import androidx.compose.runtime.Composable
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AppContainer
import com.xiehe.spine.ui.components.overlay.ImageOverlayContent
import com.xiehe.spine.ui.components.overlay.PatientOverlayContent
import com.xiehe.spine.ui.components.overlay.ProfileOverlayContent
import com.xiehe.spine.ui.viewmodel.profile.AppearanceViewModel

@Composable
internal fun OverlayHost(
    route: OverlayRoute,
    visible: Boolean,
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
    onExited: (() -> Unit)? = null,
) {
    when (route) {
        is OverlayRoute.PatientDetail,
        OverlayRoute.PatientForm,
        is OverlayRoute.PatientEdit,
        -> PatientOverlayContent(
            route = route,
            session = session,
            container = container,
            scopedViewModels = scopedViewModels,
            selectedTab = selectedTab,
            onTabSelected = onTabSelected,
            onRouteChange = onRouteChange,
            onLogoutRequested = onLogoutRequested,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
            visible = visible,
            onExited = onExited,
        )

        is OverlayRoute.ImageAnalysis,
        OverlayRoute.ImageUpload,
        -> ImageOverlayContent(
            route = route,
            session = session,
            container = container,
            scopedViewModels = scopedViewModels,
            selectedTab = selectedTab,
            onTabSelected = onTabSelected,
            onRouteChange = onRouteChange,
            onLogoutRequested = onLogoutRequested,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
            visible = visible,
            onExited = onExited,
        )

        OverlayRoute.Appearance,
        OverlayRoute.PersonalInfo,
        OverlayRoute.Organization,
        OverlayRoute.OrganizationCreateTeam,
        OverlayRoute.OrganizationInvite,
        OverlayRoute.ChangePassword,
        OverlayRoute.Messages,
        -> ProfileOverlayContent(
            route = route,
            session = session,
            container = container,
            scopedViewModels = scopedViewModels,
            appearanceVm = appearanceVm,
            selectedTab = selectedTab,
            onTabSelected = onTabSelected,
            onRouteChange = onRouteChange,
            onLogoutRequested = onLogoutRequested,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
            visible = visible,
            onExited = onExited,
        )
    }
}
