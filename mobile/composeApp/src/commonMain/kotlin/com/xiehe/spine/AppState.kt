package com.xiehe.spine

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import com.xiehe.spine.data.AppContainer
import com.xiehe.spine.data.image.ImageFileSummary
import com.xiehe.spine.data.patient.PatientSummary
import com.xiehe.spine.ui.viewmodel.dashboard.DashboardViewModel
import com.xiehe.spine.ui.viewmodel.image.ImageAnalysisViewModel
import com.xiehe.spine.ui.viewmodel.image.ImageUploadViewModel
import com.xiehe.spine.ui.viewmodel.image.ImagesViewModel
import com.xiehe.spine.ui.viewmodel.message.MessagesViewModel
import com.xiehe.spine.ui.viewmodel.organization.OrganizationViewModel
import com.xiehe.spine.ui.viewmodel.patient.PatientDetailViewModel
import com.xiehe.spine.ui.viewmodel.patient.PatientEditViewModel
import com.xiehe.spine.ui.viewmodel.patient.PatientFormViewModel
import com.xiehe.spine.ui.viewmodel.patient.PatientsViewModel
import com.xiehe.spine.ui.viewmodel.profile.PersonalInfoViewModel

internal enum class AuthRoute {
    LOGIN,
    REGISTER,
}

internal sealed interface OverlayRoute {
    data class PatientDetail(val patientId: Int) : OverlayRoute
    data class ImageAnalysis(
        val fileId: Int,
        val patientId: Int?,
        val examType: String,
    ) : OverlayRoute

    data object PatientForm : OverlayRoute
    data class PatientEdit(val patientId: Int) : OverlayRoute
    data object Appearance : OverlayRoute
    data object PersonalInfo : OverlayRoute
    data object Organization : OverlayRoute
    data object OrganizationInvite : OverlayRoute
    data object OrganizationCreateTeam : OverlayRoute
    data object ChangePassword : OverlayRoute
    data object Messages : OverlayRoute
    data object ImageUpload : OverlayRoute
}

internal data class DashboardBootstrapState(
    val loading: Boolean = true,
    val patients: List<PatientSummary> = emptyList(),
    val images: List<ImageFileSummary> = emptyList(),
)

internal class SessionScopedViewModels(
    container: AppContainer,
) {
    val messagesVm = MessagesViewModel()
    val dashboardVm = DashboardViewModel()
    val imagesVm = ImagesViewModel(container.imageFileRepository)
    val imageAnalysisVm = ImageAnalysisViewModel(
        imageRepository = container.imageFileRepository,
        measurementRepository = container.measurementRepository,
        aiInferenceRepository = container.aiInferenceRepository,
    )
    val imageUploadVm = ImageUploadViewModel(
        patientRepository = container.patientRepository,
        imageRepository = container.imageFileRepository,
    )
    val patientsVm = PatientsViewModel()
    val patientDetailVm = PatientDetailViewModel()
    val patientEditVm = PatientEditViewModel()
    val patientFormVm = PatientFormViewModel()
    val personalInfoVm = PersonalInfoViewModel()
    val organizationVm = OrganizationViewModel()

    fun dispose() {
        listOf(
            messagesVm,
            dashboardVm,
            imagesVm,
            imageAnalysisVm,
            imageUploadVm,
            patientsVm,
            patientDetailVm,
            patientEditVm,
            patientFormVm,
            personalInfoVm,
            organizationVm,
        ).forEach { it.dispose() }
    }
}

@Composable
internal fun rememberSessionScopedViewModels(
    userId: Int,
    container: AppContainer,
): SessionScopedViewModels {
    val holder = remember(userId, container) { SessionScopedViewModels(container) }
    DisposableEffect(holder) {
        onDispose { holder.dispose() }
    }
    return holder
}
