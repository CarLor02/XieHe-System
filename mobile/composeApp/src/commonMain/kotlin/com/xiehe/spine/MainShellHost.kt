package com.xiehe.spine

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AppContainer
import com.xiehe.spine.ui.components.feedback.shared.AppStartupScreen
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.navigation.shared.DashboardShellHeader
import com.xiehe.spine.ui.components.navigation.shared.SearchShellHeader
import com.xiehe.spine.ui.components.navigation.shared.SimpleShellHeader
import com.xiehe.spine.ui.motion.AppRouteContentHost
import com.xiehe.spine.ui.screens.dashboard.DashboardScreen
import com.xiehe.spine.ui.screens.image.ImagesScreen
import com.xiehe.spine.ui.screens.patient.PatientsScreen
import com.xiehe.spine.ui.screens.profile.ProfileScreen
import com.xiehe.spine.ui.screens.shared.MobileShell
import kotlinx.coroutines.launch

@Composable
internal fun MainShellHost(
    session: UserSession,
    container: AppContainer,
    scopedViewModels: SessionScopedViewModels,
    selectedTab: Int,
    dashboardBootstrap: DashboardBootstrapState,
    onTabSelected: (Int) -> Unit,
    onSessionUpdated: (UserSession) -> Unit,
    onLogoutRequested: suspend () -> Unit,
    onRouteChange: (OverlayRoute?) -> Unit,
    onSessionExpired: (String) -> Unit,
) {
    val patientsState by scopedViewModels.patientsVm.state.collectAsState()
    val imagesState by scopedViewModels.imagesVm.state.collectAsState()
    val coroutineScope = rememberCoroutineScope()

    if (selectedTab == 0 && dashboardBootstrap.loading) {
        AppStartupScreen(
            title = "正在同步工作台数据",
            message = "先加载患者与影像数据，再进入 Dashboard",
        )
        return
    }

    MobileShell(
        selectedTab = selectedTab,
        onTabSelected = onTabSelected,
        headerContent = {
            when (selectedTab) {
                0 -> DashboardShellHeader(
                    userName = session.fullName ?: session.username,
                    primaryMeta = "工作台",
                    secondaryMeta = "脊柱影像分析系统",
                    onMessages = { onRouteChange(OverlayRoute.Messages) },
                )

                1 -> SearchShellHeader(
                    title = "患者中心",
                    subtitle = "${patientsState.items.size} 位患者",
                    searchValue = patientsState.search,
                    onSearchValueChange = scopedViewModels.patientsVm::updateSearch,
                    searchPlaceholder = "搜索患者姓名、ID或手机号",
                    actionGlyph = IconToken.USER_PLUS,
                    onAction = { onRouteChange(OverlayRoute.PatientForm) },
                )

                2 -> SearchShellHeader(
                    title = "影像中心",
                    subtitle = "${imagesState.filteredItems.size} 份影像",
                    searchValue = imagesState.search,
                    onSearchValueChange = scopedViewModels.imagesVm::updateSearch,
                    searchPlaceholder = "搜索患者姓名、影像类别或文件名",
                    actionGlyph = IconToken.UPLOAD,
                    onAction = { onRouteChange(OverlayRoute.ImageUpload) },
                )

                else -> SimpleShellHeader(
                    title = "个人中心",
                    actionGlyph = IconToken.BELL,
                    onAction = { onRouteChange(OverlayRoute.Messages) },
                )
            }
        },
    ) {
        AppRouteContentHost(
            targetState = selectedTab,
            orderOf = { it },
            label = "main_tab_content_transition",
        ) { tab ->
            when (tab) {
                0 -> DashboardScreen(
                    vm = scopedViewModels.dashboardVm,
                    session = session,
                    dashboardRepository = container.dashboardRepository,
                    imageRepository = container.imageFileRepository,
                    patientRepository = container.patientRepository,
                    notificationRepository = container.notificationRepository,
                    authRepository = container.authRepository,
                    onSessionUpdated = onSessionUpdated,
                    onSessionExpired = onSessionExpired,
                    preloadedPatients = dashboardBootstrap.patients,
                    preloadedImages = dashboardBootstrap.images,
                    onOpenAnalysis = { fileId, patientId, examType ->
                        onRouteChange(
                            OverlayRoute.ImageAnalysis(
                                fileId = fileId,
                                patientId = patientId,
                                examType = examType,
                            ),
                        )
                    },
                    onOpenPatientForm = { onRouteChange(OverlayRoute.PatientForm) },
                    onOpenImageUpload = { onRouteChange(OverlayRoute.ImageUpload) },
                    onOpenImagesTab = { onTabSelected(2) },
                    onOpenAppearance = { onRouteChange(OverlayRoute.Appearance) },
                    onOpenOrganization = { onRouteChange(OverlayRoute.Organization) },
                )

                1 -> PatientsScreen(
                    vm = scopedViewModels.patientsVm,
                    session = session,
                    repository = container.patientRepository,
                    onSessionUpdated = onSessionUpdated,
                    onSessionExpired = onSessionExpired,
                    onOpenPatient = { onRouteChange(OverlayRoute.PatientDetail(it)) },
                    onEditPatient = { onRouteChange(OverlayRoute.PatientEdit(it)) },
                    showInlineSearch = false,
                )

                2 -> ImagesScreen(
                    vm = scopedViewModels.imagesVm,
                    session = session,
                    repository = container.imageFileRepository,
                    onSessionUpdated = onSessionUpdated,
                    onSessionExpired = onSessionExpired,
                    showInlineSearch = false,
                    onOpenAnalysis = { fileId, patientId, examType ->
                        onRouteChange(
                            OverlayRoute.ImageAnalysis(
                                fileId = fileId,
                                patientId = patientId,
                                examType = examType,
                            ),
                        )
                    },
                )

                else -> ProfileScreen(
                    session = session,
                    personalInfoVm = scopedViewModels.personalInfoVm,
                    patientsVm = scopedViewModels.patientsVm,
                    imagesVm = scopedViewModels.imagesVm,
                    authRepository = container.authRepository,
                    patientRepository = container.patientRepository,
                    onSessionUpdated = onSessionUpdated,
                    onSessionExpired = onSessionExpired,
                    onOpenAppearance = { onRouteChange(OverlayRoute.Appearance) },
                    onOpenPersonalInfo = { onRouteChange(OverlayRoute.PersonalInfo) },
                    onOpenOrganization = { onRouteChange(OverlayRoute.Organization) },
                    onOpenChangePassword = { onRouteChange(OverlayRoute.ChangePassword) },
                    onLogout = { coroutineScope.launch { onLogoutRequested() } },
                )
            }
        }
    }
}
