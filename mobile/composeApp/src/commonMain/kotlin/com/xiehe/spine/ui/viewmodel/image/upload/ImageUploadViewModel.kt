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
    private var nextFileSequence = 0

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

    fun appendUploadFile(
        name: String,
        mimeType: String,
        bytes: ByteArray,
    ): String {
        val fileId = "upload-${++nextFileSequence}"
        val payload = UploadFilePayload(
            id = fileId,
            name = name,
            mimeType = mimeType,
            bytes = bytes,
            sourceBytes = bytes,
            sourceMimeType = mimeType,
            examType = _state.value.selectedExamType,
        )
        _state.update {
            it.copy(
                uploadFiles = it.uploadFiles + payload,
                errorMessage = null,
                successMessage = null,
            )
        }
        return fileId
    }

    fun removeUploadFile(fileId: String) {
        _state.update {
            it.copy(
                uploadFiles = it.uploadFiles.filterNot { file -> file.id == fileId },
                errorMessage = null,
                successMessage = null,
            )
        }
    }

    fun updateFileExamType(fileId: String, examType: ImageCategory) {
        _state.update { current ->
            current.copy(
                selectedExamType = examType,
                uploadFiles = current.uploadFiles.map { file ->
                    if (file.id == fileId) file.copy(examType = examType) else file
                },
                errorMessage = null,
                successMessage = null,
            )
        }
    }

    fun flipFile(fileId: String) {
        val target = _state.value.uploadFiles.firstOrNull { it.id == fileId } ?: return
        scope.launch {
            val nextSource = UploadImageTransformer.flipHorizontally(
                bytes = target.sourceBytes,
                mimeType = target.sourceMimeType,
            )
            if (nextSource == null) {
                showImageAdjustmentFailure("左右翻转")
                return@launch
            }

            val nextCurrent = if (target.cropped) {
                UploadImageTransformer.flipHorizontally(
                    bytes = target.bytes,
                    mimeType = target.mimeType,
                ) ?: run {
                    showImageAdjustmentFailure("左右翻转")
                    return@launch
                }
            } else {
                nextSource
            }

            _state.update { current ->
                current.copy(
                    uploadFiles = current.uploadFiles.map { file ->
                        if (file.id == fileId) {
                            file.copy(
                                bytes = nextCurrent.bytes,
                                mimeType = nextCurrent.mimeType,
                                sourceBytes = nextSource.bytes,
                                sourceMimeType = nextSource.mimeType,
                                flipped = !file.flipped,
                                status = UploadFileStatus.PENDING,
                            )
                        } else {
                            file
                        }
                    },
                    errorMessage = null,
                    successMessage = null,
                )
            }
        }
    }

    fun cropFile(fileId: String, area: ImageCropArea) {
        val target = _state.value.uploadFiles.firstOrNull { it.id == fileId } ?: return
        scope.launch {
            val nextCurrent = UploadImageTransformer.crop(
                bytes = target.sourceBytes,
                mimeType = target.sourceMimeType,
                area = area,
            )
            if (nextCurrent == null) {
                showImageAdjustmentFailure("裁剪")
                return@launch
            }

            _state.update { current ->
                current.copy(
                    uploadFiles = current.uploadFiles.map { file ->
                        if (file.id == fileId) {
                            file.copy(
                                bytes = nextCurrent.bytes,
                                mimeType = nextCurrent.mimeType,
                                cropped = true,
                                status = UploadFileStatus.PENDING,
                            )
                        } else {
                            file
                        }
                    },
                    errorMessage = null,
                    successMessage = null,
                )
            }
        }
    }

    private fun showImageAdjustmentFailure(actionName: String) {
        _state.update {
            it.copy(
                errorMessage = "${actionName}影像失败，请确认当前文件是可处理的图片格式",
                successMessage = null,
            )
        }
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
            val patientId = requireNotNull(current.selectedPatientId)
            var latestSession = session
            val filesToUpload = current.uploadFiles.filter { it.status == UploadFileStatus.PENDING }

            for (file in filesToUpload) {
                _state.update { state ->
                    state.copy(
                        uploadFiles = state.uploadFiles.map {
                            if (it.id == file.id) it.copy(status = UploadFileStatus.UPLOADING) else it
                        },
                    )
                }
                val command = SubmitImageUploadCommand(
                    patientId = patientId,
                    examType = file.examType,
                    file = file,
                )
                when (val outcome = submitImageUploadUseCase(latestSession, command)) {
                    is SubmitImageUploadOutcome.Success -> {
                        latestSession = outcome.session
                        onSessionUpdated(outcome.session)
                        _state.update { state ->
                            state.copy(
                                uploadFiles = state.uploadFiles.map {
                                    if (it.id == file.id) it.copy(status = UploadFileStatus.COMPLETED) else it
                                },
                            )
                        }
                    }

                    is SubmitImageUploadOutcome.Failure -> {
                        if (outcome.error.notifySessionExpired(onSessionExpired)) {
                            _state.update { state ->
                                state.copy(
                                    uploading = false,
                                    errorMessage = null,
                                    uploadFiles = state.uploadFiles.map {
                                        if (it.id == file.id) it.copy(status = UploadFileStatus.PENDING) else it
                                    },
                                )
                            }
                        } else {
                            _state.update { state ->
                                state.copy(
                                    uploading = false,
                                    errorMessage = outcome.error.message,
                                    uploadFiles = state.uploadFiles.map {
                                        if (it.id == file.id) it.copy(status = UploadFileStatus.ERROR) else it
                                    },
                                )
                            }
                        }
                        return@launch
                    }
                }
            }

            _state.update {
                it.copy(
                    uploading = false,
                    successMessage = "影像上传成功",
                    uploadFiles = emptyList(),
                )
            }
            onSuccess()
        }
    }
}
