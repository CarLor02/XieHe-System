package com.xiehe.spine.ui.viewmodel.profile

import com.xiehe.spine.notifySessionExpired
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.auth.AuthRepository
import com.xiehe.spine.data.auth.CurrentUserProfile
import com.xiehe.spine.data.auth.UpdateCurrentUserRequest
import com.xiehe.spine.ui.viewmodel.shared.BaseViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private data class EditableSnapshot(
    val realName: String,
    val phone: String,
    val position: String,
    val title: String,
)

class PersonalInfoViewModel : BaseViewModel() {
    private val _state = MutableStateFlow(PersonalInfoUiState())
    val state: StateFlow<PersonalInfoUiState> = _state.asStateFlow()

    private var baseline: EditableSnapshot? = null

    fun seedFromSession(session: UserSession) {
        _state.update { current ->
            if (current.loaded) {
                current
            } else {
                current.copy(
                    username = if (current.username.isBlank()) session.username else current.username,
                    email = if (current.email.isBlank()) (session.email ?: "") else current.email,
                    realName = if (current.realName.isBlank()) (session.fullName ?: "") else current.realName,
                )
            }
        }
    }

    fun load(
        session: UserSession,
        repository: AuthRepository,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        if (_state.value.loading) {
            return
        }
        scope.launch {
            _state.update { it.copy(loading = true, errorMessage = null, successMessage = null) }
            when (val result = repository.getCurrentUser(session)) {
                is AppResult.Success -> {
                    val updatedSession = result.data.first
                    val profile = result.data.second
                    onSessionUpdated(updatedSession)
                    applyProfile(profile, updatedSession, loading = false)
                }

                is AppResult.Failure -> {
                    if (result.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(loading = false, errorMessage = null) }
                    } else {
                        _state.update {
                            it.copy(
                                loading = false,
                                errorMessage = result.message,
                            )
                        }
                    }
                }
            }
        }
    }

    fun updateRealName(value: String) {
        _state.update { it.copy(realName = value, errorMessage = null, successMessage = null) }
    }

    fun updatePhone(value: String) {
        _state.update { it.copy(phone = value, errorMessage = null, successMessage = null) }
    }

    fun updatePosition(value: String) {
        _state.update { it.copy(position = value, errorMessage = null, successMessage = null) }
    }

    fun updateTitle(value: String) {
        _state.update { it.copy(title = value, errorMessage = null, successMessage = null) }
    }

    fun clearMessages() {
        _state.update { it.copy(errorMessage = null, successMessage = null) }
    }

    fun reset() {
        baseline = null
        _state.value = PersonalInfoUiState()
    }

    fun save(
        session: UserSession,
        repository: AuthRepository,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        if (_state.value.saving) {
            return
        }
        val currentSnapshot = currentSnapshot()
        val original = baseline ?: currentSnapshot
        if (currentSnapshot == original) {
            _state.update { it.copy(successMessage = "无需要保存的更改", errorMessage = null) }
            return
        }

        val realNameChanged = currentSnapshot.realName != original.realName
        val phoneChanged = currentSnapshot.phone != original.phone
        val positionChanged = currentSnapshot.position != original.position
        val titleChanged = currentSnapshot.title != original.title

        val request = UpdateCurrentUserRequest(
            fullName = if (realNameChanged) currentSnapshot.realName else null,
            realName = if (realNameChanged) currentSnapshot.realName else null,
            phone = if (phoneChanged) currentSnapshot.phone else null,
            position = if (positionChanged) currentSnapshot.position else null,
            title = if (titleChanged) currentSnapshot.title else null,
        )

        scope.launch {
            _state.update { it.copy(saving = true, errorMessage = null, successMessage = null) }
            when (val result = repository.updateCurrentUser(session, request)) {
                is AppResult.Success -> {
                    val updatedSession = result.data.first
                    val profile = result.data.second
                    onSessionUpdated(updatedSession)
                    applyProfile(profile, updatedSession, loading = false, saving = false)
                    _state.update { it.copy(successMessage = "保存成功") }
                }

                is AppResult.Failure -> {
                    if (result.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(saving = false, errorMessage = null) }
                    } else {
                        _state.update { it.copy(saving = false, errorMessage = result.message) }
                    }
                }
            }
        }
    }

    private fun applyProfile(
        profile: CurrentUserProfile,
        session: UserSession,
        loading: Boolean,
        saving: Boolean = false,
    ) {
        val realName = (profile.realName ?: profile.fullName ?: "").trim()
        val phone = (profile.phone ?: "").trim()
        val position = (profile.position ?: "").trim()
        val title = (profile.title ?: "").trim()
        val role = (profile.role ?: "").trim()
        val department = (profile.department ?: "").trim()
        baseline = EditableSnapshot(
            realName = realName,
            phone = phone,
            position = position,
            title = title,
        )
        _state.update {
            it.copy(
                loading = loading,
                saving = saving,
                loaded = true,
                username = profile.username.ifBlank { session.username },
                email = profile.email ?: session.email.orEmpty(),
                realName = realName,
                phone = phone,
                position = position,
                title = title,
                role = role,
                department = department,
                errorMessage = null,
            )
        }
    }

    private fun currentSnapshot(): EditableSnapshot {
        val current = _state.value
        return EditableSnapshot(
            realName = current.realName.trim(),
            phone = current.phone.trim(),
            position = current.position.trim(),
            title = current.title.trim(),
        )
    }
}
