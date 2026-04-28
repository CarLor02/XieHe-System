package com.xiehe.spine.ui.viewmodel.organization

import com.xiehe.spine.notifySessionExpired
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.organization.OrganizationInvitation
import com.xiehe.spine.data.organization.OrganizationMember
import com.xiehe.spine.data.organization.OrganizationRepository
import com.xiehe.spine.data.organization.OrganizationRole
import com.xiehe.spine.data.organization.OrganizationTeamSummary
import com.xiehe.spine.ui.viewmodel.shared.BaseViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class OrganizationViewModel : BaseViewModel() {
    private val _state = MutableStateFlow(OrganizationUiState())
    val state: StateFlow<OrganizationUiState> = _state.asStateFlow()

    fun load(
        session: UserSession,
        repository: OrganizationRepository,
        onSessionUpdated: (UserSession) -> Unit,
        silent: Boolean = false,
        onSessionExpired: (String) -> Unit = {},
    ) {
        scope.launch {
            reload(
                session = session,
                repository = repository,
                onSessionUpdated = onSessionUpdated,
                preferredTeamId = _state.value.selectedTeamId,
                silent = silent,
                onSessionExpired = onSessionExpired,
            )
        }
    }

    fun selectTeam(
        session: UserSession,
        repository: OrganizationRepository,
        teamId: Int,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        if (_state.value.selectedTeamId == teamId) {
            return
        }
        scope.launch {
            _state.update { it.copy(selectedTeamId = teamId, loading = true, errorMessage = null) }
            reload(
                session = session,
                repository = repository,
                onSessionUpdated = onSessionUpdated,
                preferredTeamId = teamId,
                silent = true,
                onSessionExpired = onSessionExpired,
            )
        }
    }

    fun updateSearch(value: String) {
        _state.update { current ->
            current.copy(search = value).withFilteredData()
        }
    }

    fun selectTab(value: OrganizationTab) {
        _state.update { current ->
            current.copy(activeTab = value, search = "").withFilteredData()
        }
    }

    fun respondInvitation(
        session: UserSession,
        repository: OrganizationRepository,
        invitation: OrganizationInvitation,
        accept: Boolean,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        val invitationId = invitation.stableId ?: return
        scope.launch {
            _state.update { it.copy(actionLoading = true, errorMessage = null, noticeMessage = null) }
            when (val result = repository.respondInvitation(session, invitationId, accept)) {
                is AppResult.Success -> {
                    val updatedSession = result.data.first
                    onSessionUpdated(updatedSession)
                    reload(
                        session = updatedSession,
                        repository = repository,
                        onSessionUpdated = onSessionUpdated,
                        preferredTeamId = _state.value.selectedTeamId,
                        silent = true,
                        successMessage = result.data.second,
                        onSessionExpired = onSessionExpired,
                    )
                }

                is AppResult.Failure -> {
                    if (result.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(actionLoading = false, errorMessage = null) }
                    } else {
                        _state.update { it.copy(actionLoading = false, errorMessage = result.message) }
                    }
                }
            }
        }
    }

    fun inviteMember(
        session: UserSession,
        repository: OrganizationRepository,
        teamId: Int,
        email: String,
        role: OrganizationRole,
        message: String,
        onSessionUpdated: (UserSession) -> Unit,
        onSuccess: () -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        scope.launch {
            _state.update { it.copy(actionLoading = true, errorMessage = null, noticeMessage = null) }
            when (
                val result = repository.inviteMember(
                    session = session,
                    teamId = teamId,
                    email = email,
                    role = role.apiValue,
                    message = message.ifBlank { null },
                )
            ) {
                is AppResult.Success -> {
                    val updatedSession = result.data.first
                    onSessionUpdated(updatedSession)
                    reload(
                        session = updatedSession,
                        repository = repository,
                        onSessionUpdated = onSessionUpdated,
                        preferredTeamId = teamId,
                        silent = true,
                        successMessage = result.data.second,
                        onSessionExpired = onSessionExpired,
                    )
                    onSuccess()
                }

                is AppResult.Failure -> {
                    if (result.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(actionLoading = false, errorMessage = null) }
                    } else {
                        _state.update { it.copy(actionLoading = false, errorMessage = result.message) }
                    }
                }
            }
        }
    }

    fun createTeam(
        session: UserSession,
        repository: OrganizationRepository,
        name: String,
        description: String,
        hospital: String,
        department: String,
        maxMembers: Int?,
        onSessionUpdated: (UserSession) -> Unit,
        onSuccess: () -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        scope.launch {
            _state.update { it.copy(actionLoading = true, errorMessage = null, noticeMessage = null) }
            when (
                val result = repository.createTeam(
                    session = session,
                    name = name.trim(),
                    description = description.trim().ifBlank { null },
                    hospital = hospital.trim().ifBlank { null },
                    department = department.trim().ifBlank { null },
                    maxMembers = maxMembers,
                )
            ) {
                is AppResult.Success -> {
                    val updatedSession = result.data.first
                    onSessionUpdated(updatedSession)
                    reload(
                        session = updatedSession,
                        repository = repository,
                        onSessionUpdated = onSessionUpdated,
                        preferredTeamId = _state.value.selectedTeamId,
                        silent = true,
                        successMessage = result.data.second,
                        onSessionExpired = onSessionExpired,
                    )
                    onSuccess()
                }

                is AppResult.Failure -> {
                    if (result.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(actionLoading = false, errorMessage = null) }
                    } else {
                        _state.update { it.copy(actionLoading = false, errorMessage = result.message) }
                    }
                }
            }
        }
    }

    fun updateMemberRole(
        session: UserSession,
        repository: OrganizationRepository,
        teamId: Int,
        member: OrganizationMember,
        role: OrganizationRole,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        scope.launch {
            _state.update { it.copy(actionLoading = true, errorMessage = null, noticeMessage = null) }
            when (
                val result = repository.updateMemberRole(
                    session = session,
                    teamId = teamId,
                    userId = member.userId,
                    role = role.apiValue,
                )
            ) {
                is AppResult.Success -> {
                    val updatedSession = result.data.first
                    onSessionUpdated(updatedSession)
                    reload(
                        session = updatedSession,
                        repository = repository,
                        onSessionUpdated = onSessionUpdated,
                        preferredTeamId = teamId,
                        silent = true,
                        successMessage = result.data.second,
                        onSessionExpired = onSessionExpired,
                    )
                }

                is AppResult.Failure -> {
                    if (result.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(actionLoading = false, errorMessage = null) }
                    } else {
                        _state.update { it.copy(actionLoading = false, errorMessage = result.message) }
                    }
                }
            }
        }
    }

    fun removeMember(
        session: UserSession,
        repository: OrganizationRepository,
        teamId: Int,
        member: OrganizationMember,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        scope.launch {
            _state.update { it.copy(actionLoading = true, errorMessage = null, noticeMessage = null) }
            when (
                val result = repository.removeMember(
                    session = session,
                    teamId = teamId,
                    userId = member.userId,
                )
            ) {
                is AppResult.Success -> {
                    val updatedSession = result.data.first
                    onSessionUpdated(updatedSession)
                    reload(
                        session = updatedSession,
                        repository = repository,
                        onSessionUpdated = onSessionUpdated,
                        preferredTeamId = teamId,
                        silent = true,
                        successMessage = result.data.second,
                        onSessionExpired = onSessionExpired,
                    )
                }

                is AppResult.Failure -> {
                    if (result.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(actionLoading = false, errorMessage = null) }
                    } else {
                        _state.update { it.copy(actionLoading = false, errorMessage = result.message) }
                    }
                }
            }
        }
    }

    fun clearMessages() {
        _state.update { it.copy(noticeMessage = null, errorMessage = null) }
    }

    private suspend fun reload(
        session: UserSession,
        repository: OrganizationRepository,
        onSessionUpdated: (UserSession) -> Unit,
        preferredTeamId: Int?,
        silent: Boolean,
        successMessage: String? = null,
        onSessionExpired: (String) -> Unit = {},
    ) {
        if (!silent) {
            _state.update { it.copy(loading = true, errorMessage = null) }
        }

        val teamsResultDeferred = scope.async { repository.loadMyTeams(session) }
        val invitationsResultDeferred = scope.async { repository.loadMyInvitations(session) }

        val teamsResult = teamsResultDeferred.await()
        val invitationsResult = invitationsResultDeferred.await()

        val teams = (teamsResult as? AppResult.Success)?.data?.second?.items.orEmpty()
        val selectedTeamId = resolveSelectedTeamId(
            current = preferredTeamId,
            teams = teams,
        )
        val membersResult = if (selectedTeamId != null) {
            repository.loadTeamMembers(
                session = (teamsResult as? AppResult.Success)?.data?.first ?: session,
                teamId = selectedTeamId,
            )
        } else {
            null
        }

        listOfNotNull(
            (teamsResult as? AppResult.Success)?.data?.first,
            (invitationsResult as? AppResult.Success)?.data?.first,
            (membersResult as? AppResult.Success)?.data?.first,
        ).lastOrNull()?.let(onSessionUpdated)

        val members = (membersResult as? AppResult.Success)?.data?.second?.members.orEmpty()
        val invitations = (invitationsResult as? AppResult.Success)?.data?.second?.items.orEmpty()
        val failure = listOfNotNull(
            teamsResult as? AppResult.Failure,
            invitationsResult as? AppResult.Failure,
            membersResult as? AppResult.Failure,
        ).firstOrNull()
        if (failure?.notifySessionExpired(onSessionExpired) == true) {
            _state.update { current ->
                current.copy(
                    loading = false,
                    actionLoading = false,
                    teams = teams,
                    selectedTeamId = selectedTeamId,
                    members = members,
                    invitations = invitations,
                    noticeMessage = successMessage ?: current.noticeMessage,
                    errorMessage = null,
                ).withFilteredData()
            }
            return
        }

        _state.update { current ->
            val currentRoleLabel = selectedTeamId?.let { teamId ->
                members.firstOrNull { it.userId == session.userId }?.cachedRoleLabel()?.let { label ->
                    teamId to label
                }
            }
            current.copy(
                loading = false,
                actionLoading = false,
                teams = teams,
                teamRoleLabels = current.teamRoleLabels + listOfNotNull(currentRoleLabel),
                selectedTeamId = selectedTeamId,
                members = members,
                invitations = invitations,
                noticeMessage = successMessage ?: current.noticeMessage,
                errorMessage = failure?.message,
            ).withFilteredData()
        }
    }

    private fun resolveSelectedTeamId(
        current: Int?,
        teams: List<OrganizationTeamSummary>,
    ): Int? {
        if (teams.isEmpty()) {
            return null
        }
        return current?.takeIf { candidate -> teams.any { it.id == candidate } } ?: teams.first().id
    }

    private fun OrganizationUiState.withFilteredData(): OrganizationUiState {
        return copy(
            filteredMembers = members.filter { it.matchesSearch(search) },
            filteredInvitations = invitations.filter { it.matchesSearch(search) },
        )
    }

    private fun OrganizationMember.matchesSearch(keyword: String): Boolean {
        val normalized = keyword.trim().lowercase()
        if (normalized.isBlank()) {
            return true
        }
        return listOfNotNull(
            realName,
            fullName,
            username,
            email,
            department,
            role,
            status,
        ).any { value ->
            value.lowercase().contains(normalized)
        }
    }

    private fun OrganizationInvitation.matchesSearch(keyword: String): Boolean {
        val normalized = keyword.trim().lowercase()
        if (normalized.isBlank()) {
            return true
        }
        return listOfNotNull(
            teamName,
            team?.name,
            inviterName,
            inviter?.realName,
            inviter?.fullName,
            inviter?.username,
            inviterEmail,
            inviter?.email,
            email,
            role,
            status,
            message,
        ).any { value ->
            value.lowercase().contains(normalized)
        }
    }
}

val OrganizationUiState.selectedTeam: OrganizationTeamSummary?
    get() = teams.firstOrNull { it.id == selectedTeamId }

fun OrganizationUiState.currentMember(userId: Int): OrganizationMember? {
    return members.firstOrNull { it.userId == userId }
}

fun OrganizationUiState.canInviteMembers(currentUserId: Int): Boolean {
    return selectedTeamId != null && currentMember(currentUserId)?.isTeamManager() == true
}

fun OrganizationUiState.canManageTarget(
    member: OrganizationMember,
    currentUserId: Int,
): Boolean {
    return canInviteMembers(currentUserId) && !member.isCreator && member.userId != currentUserId
}

fun OrganizationMember.isTeamManager(): Boolean {
    return isCreator || role.equals("ADMIN", ignoreCase = true)
}

private fun OrganizationMember.cachedRoleLabel(): String {
    return when {
        isCreator -> "创建者"
        role.equals("ADMIN", ignoreCase = true) -> "管理员"
        role.equals("GUEST", ignoreCase = true) -> "访客"
        else -> "成员"
    }
}

val OrganizationInvitation.stableId: Int?
    get() = id ?: invitationId
