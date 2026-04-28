package com.xiehe.spine.ui.viewmodel.organization

import com.xiehe.spine.data.organization.OrganizationInvitation
import com.xiehe.spine.data.organization.OrganizationMember
import com.xiehe.spine.data.organization.OrganizationTeamSummary

enum class OrganizationTab {
    MEMBERS,
    INVITES,
}

data class OrganizationUiState(
    val loading: Boolean = false,
    val actionLoading: Boolean = false,
    val activeTab: OrganizationTab = OrganizationTab.MEMBERS,
    val search: String = "",
    val teams: List<OrganizationTeamSummary> = emptyList(),
    val teamRoleLabels: Map<Int, String> = emptyMap(),
    val selectedTeamId: Int? = null,
    val members: List<OrganizationMember> = emptyList(),
    val filteredMembers: List<OrganizationMember> = emptyList(),
    val invitations: List<OrganizationInvitation> = emptyList(),
    val filteredInvitations: List<OrganizationInvitation> = emptyList(),
    val noticeMessage: String? = null,
    val errorMessage: String? = null,
)
