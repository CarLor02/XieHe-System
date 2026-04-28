package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.notifySessionExpired
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.image.ImageCategory
import com.xiehe.spine.data.image.ImageFileRepository
import com.xiehe.spine.data.patient.PatientRepository
import com.xiehe.spine.ui.viewmodel.shared.BaseViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class ImageUploadViewModel(
    patientRepository: PatientRepository,
    imageRepository: ImageFileRepository,
    private val loadUploadPatientsUseCase: LoadUploadPatientsUseCase = LoadUploadPatientsUseCase(patientRepository),
    private val submitImageUploadUseCase: SubmitImageUploadUseCase = SubmitImageUploadUseCase(imageRepository),
) : BaseViewModel() {
    private val _state = MutableStateFlow(ImageUploadUiState())
    val state: StateFlow<ImageUploadUiState> = _state.asStateFlow()

    fun clearMessages() {
        _state.update { it.copy(errorMessage = null, successMessage = null) }
    }

    fun loadPatients(
        session: UserSession,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        if (_state.value.loadingPatients) return
        scope.launch {
            _state.update { it.copy(loadingPatients = true, errorMessage = null) }
            when (val outcome = loadUploadPatientsUseCase(session)) {
                is LoadUploadPatientsOutcome.Success -> {
                    onSessionUpdated(outcome.session)
                    _state.update {
                        val firstPatientId = outcome.patients.firstOrNull()?.id
                        it.copy(
                            loadingPatients = false,
                            patients = outcome.patients,
                            selectedPatientId = it.selectedPatientId ?: firstPatientId,
                        )
                    }
                }

                is LoadUploadPatientsOutcome.Failure -> {
                    if (outcome.error.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(loadingPatients = false, errorMessage = null) }
                    } else {
                        _state.update { it.copy(loadingPatients = false, errorMessage = outcome.error.message) }
                    }
                }
            }
        }
    }

    fun updatePatient(patientId: Int?) {
        _state.update { it.copy(selectedPatientId = patientId, errorMessage = null, successMessage = null) }
    }

    fun updateExamType(examType: ImageCategory) {
        _state.update { it.copy(selectedExamType = examType, errorMessage = null, successMessage = null) }
    }

    fun setSelectedFile(file: UploadFilePayload?) {
        _state.update { it.copy(selectedFile = file, errorMessage = null, successMessage = null) }
    }

    fun submit(
        session: UserSession,
        onSessionUpdated: (UserSession) -> Unit,
        onSuccess: () -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        val validationError = ImageUploadValidator.validate(_state.value)
        if (validationError != null) {
            _state.update { it.copy(errorMessage = validationError) }
            return
        }

        scope.launch {
            _state.update { it.copy(uploading = true, errorMessage = null, successMessage = null) }
            val current = _state.value
            val command = SubmitImageUploadCommand(
                patientId = requireNotNull(current.selectedPatientId),
                examType = current.selectedExamType,
                file = requireNotNull(current.selectedFile),
            )
            when (val outcome = submitImageUploadUseCase(session, command)) {
                is SubmitImageUploadOutcome.Success -> {
                    onSessionUpdated(outcome.session)
                    _state.update {
                        it.copy(
                            uploading = false,
                            successMessage = "影像上传成功",
                            selectedFile = null,
                        )
                    }
                    onSuccess()
                }

                is SubmitImageUploadOutcome.Failure -> {
                    if (outcome.error.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(uploading = false, errorMessage = null) }
                    } else {
                        _state.update { it.copy(uploading = false, errorMessage = outcome.error.message) }
                    }
                }
            }
        }
    }
}
