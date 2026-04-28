package com.xiehe.spine.ui.viewmodel.patient

import com.xiehe.spine.ui.viewmodel.shared.BaseViewModel
import com.xiehe.spine.notifySessionExpired
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.image.ImageFileRepository
import com.xiehe.spine.data.image.ImageFileSummary
import com.xiehe.spine.data.patient.PatientDetail
import com.xiehe.spine.data.patient.PatientRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class PatientDetailViewModel : BaseViewModel() {
    private val _state = MutableStateFlow(PatientDetailUiState())
    val state: StateFlow<PatientDetailUiState> = _state.asStateFlow()

    fun load(
        patientId: Int,
        session: UserSession,
        patientRepository: PatientRepository,
        imageRepository: ImageFileRepository,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        scope.launch {
            _state.update {
                it.copy(
                    loading = true,
                    deleting = false,
                    relatedLoading = true,
                    noticeMessage = null,
                    errorMessage = null,
                )
            }
            var activeSession = session

            val detail = when (val result = patientRepository.loadPatientDetail(activeSession, patientId)) {
                is AppResult.Success -> {
                    activeSession = result.data.first
                    onSessionUpdated(activeSession)
                    result.data.second
                }

                is AppResult.Failure -> {
                    if (result.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(loading = false, relatedLoading = false, errorMessage = null) }
                    } else {
                        _state.update { it.copy(loading = false, relatedLoading = false, errorMessage = result.message) }
                    }
                    return@launch
                }
            }

            val relatedImages = when (val imageResult = imageRepository.loadAllPatientImageFiles(activeSession, patientId)) {
                is AppResult.Success -> {
                    activeSession = imageResult.data.first
                    onSessionUpdated(activeSession)
                    imageResult.data.second
                }

                is AppResult.Failure -> emptyList()
            }

            _state.update {
                it.copy(
                    loading = false,
                    deleting = false,
                    relatedLoading = false,
                    detail = detail,
                    relatedImages = relatedImages,
                    noticeMessage = null,
                    errorMessage = null,
                )
            }
        }
    }

    fun delete(
        patientId: Int,
        session: UserSession,
        repository: PatientRepository,
        onSessionUpdated: (UserSession) -> Unit,
        onDeleted: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        if (_state.value.deleting) {
            return
        }
        scope.launch {
            _state.update {
                it.copy(
                    deleting = true,
                    noticeMessage = "正在删除患者...",
                    errorMessage = null,
                )
            }
            when (val result = repository.deletePatient(session = session, patientId = patientId)) {
                is AppResult.Success -> {
                    val updatedSession = result.data.first
                    onSessionUpdated(updatedSession)
                    _state.update {
                        it.copy(
                            deleting = false,
                            noticeMessage = result.data.second,
                            errorMessage = null,
                        )
                    }
                    onDeleted(updatedSession)
                }

                is AppResult.Failure -> {
                    if (result.notifySessionExpired(onSessionExpired)) {
                        _state.update {
                            it.copy(
                                deleting = false,
                                noticeMessage = null,
                                errorMessage = null,
                            )
                        }
                    } else {
                        _state.update {
                            it.copy(
                                deleting = false,
                                noticeMessage = null,
                                errorMessage = result.message,
                            )
                        }
                    }
                }
            }
        }
    }

    fun clear() {
        _state.value = PatientDetailUiState()
    }
}
