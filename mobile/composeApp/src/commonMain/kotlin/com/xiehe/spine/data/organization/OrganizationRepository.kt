package com.xiehe.spine.data.organization

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.AuthenticatedApiClient

class OrganizationRepository(
    private val authenticatedApiClient: AuthenticatedApiClient,
) {
    suspend fun loadMyTeams(
        session: UserSession,
    ): AppResult<Pair<UserSession, OrganizationTeamListData>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.get(
                path = "/permissions/teams/my",
                accessToken = accessToken,
            )
        }
    }

    suspend fun loadTeamMembers(
        session: UserSession,
        teamId: Int,
    ): AppResult<Pair<UserSession, OrganizationTeamMembersData>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.get(
                path = "/permissions/teams/$teamId/members",
                accessToken = accessToken,
            )
        }
    }

    suspend fun loadMyInvitations(
        session: UserSession,
    ): AppResult<Pair<UserSession, OrganizationInvitationListData>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.get(
                path = "/permissions/invitations/my",
                accessToken = accessToken,
            )
        }
    }

    suspend fun respondInvitation(
        session: UserSession,
        invitationId: Int,
        accept: Boolean,
    ): AppResult<Pair<UserSession, String>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.postForMessage(
                path = "/permissions/invitations/$invitationId/respond",
                body = OrganizationInvitationRespondRequest(accept = accept),
                accessToken = accessToken,
            )
        }
    }

    suspend fun inviteMember(
        session: UserSession,
        teamId: Int,
        email: String,
        role: String,
        message: String?,
    ): AppResult<Pair<UserSession, String>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.postForMessage(
                path = "/permissions/teams/$teamId/invite",
                body = OrganizationInviteRequest(
                    email = email,
                    role = role,
                    message = message,
                ),
                accessToken = accessToken,
            )
        }
    }

    suspend fun createTeam(
        session: UserSession,
        name: String,
        description: String?,
        hospital: String?,
        department: String?,
        maxMembers: Int?,
    ): AppResult<Pair<UserSession, String>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.postForMessage(
                path = "/permissions/teams",
                body = OrganizationCreateTeamRequest(
                    name = name,
                    description = description,
                    hospital = hospital,
                    department = department,
                    maxMembers = maxMembers,
                ),
                accessToken = accessToken,
            )
        }
    }

    suspend fun updateMemberRole(
        session: UserSession,
        teamId: Int,
        userId: Int,
        role: String,
    ): AppResult<Pair<UserSession, String>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.patchForMessage(
                path = "/permissions/teams/$teamId/members/$userId/role",
                body = OrganizationMemberRoleUpdateRequest(role = role),
                accessToken = accessToken,
            )
        }
    }

    suspend fun removeMember(
        session: UserSession,
        teamId: Int,
        userId: Int,
    ): AppResult<Pair<UserSession, String>> {
        return authenticatedApiClient.call(session) { accessToken ->
            authenticatedApiClient.apiClient.deleteForMessage(
                path = "/permissions/teams/$teamId/members/$userId",
                accessToken = accessToken,
            )
        }
    }
}
