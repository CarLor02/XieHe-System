package com.xiehe.spine.data.organization

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class OrganizationTeamListData(
    val items: List<OrganizationTeamSummary> = emptyList(),
    val total: Int = 0,
)

@Serializable
data class OrganizationTeamSummary(
    val id: Int,
    val name: String,
    val description: String? = null,
    val hospital: String? = null,
    val department: String? = null,
    @SerialName("creator_name") val creatorName: String? = null,
    @SerialName("member_count") val memberCount: Int = 0,
    @SerialName("max_members") val maxMembers: Int? = null,
    @SerialName("is_member") val isMember: Boolean = false,
    @SerialName("join_status") val joinStatus: String? = null,
    @SerialName("join_request_id") val joinRequestId: Int? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class OrganizationTeamMembersData(
    val team: OrganizationTeamSummary,
    val members: List<OrganizationMember> = emptyList(),
)

@Serializable
data class OrganizationMember(
    @SerialName("user_id") val userId: Int,
    val username: String? = null,
    @SerialName("real_name") val realName: String? = null,
    @SerialName("full_name") val fullName: String? = null,
    val email: String? = null,
    val role: String? = null,
    val status: String? = null,
    val department: String? = null,
    @SerialName("is_creator") val isCreator: Boolean = false,
    @SerialName("is_system_admin") val isSystemAdmin: Boolean = false,
    @SerialName("system_admin_level") val systemAdminLevel: Int? = null,
    @SerialName("joined_at") val joinedAt: String? = null,
)

@Serializable
data class OrganizationInvitationListData(
    val items: List<OrganizationInvitation> = emptyList(),
    val total: Int = 0,
)

@Serializable
data class OrganizationInvitation(
    val id: Int? = null,
    @SerialName("invitation_id") val invitationId: Int? = null,
    @SerialName("team_id") val teamId: Int? = null,
    @SerialName("team_name") val teamName: String? = null,
    val team: OrganizationInvitationTeam? = null,
    @SerialName("inviter_name") val inviterName: String? = null,
    @SerialName("inviter_email") val inviterEmail: String? = null,
    val inviter: OrganizationInvitationUser? = null,
    val email: String? = null,
    val role: String? = null,
    val status: String? = null,
    val message: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
)

@Serializable
data class OrganizationInvitationTeam(
    val id: Int? = null,
    val name: String? = null,
    val hospital: String? = null,
    val department: String? = null,
)

@Serializable
data class OrganizationInvitationUser(
    val id: Int? = null,
    val username: String? = null,
    @SerialName("real_name") val realName: String? = null,
    @SerialName("full_name") val fullName: String? = null,
    val email: String? = null,
)

@Serializable
data class OrganizationInvitationRespondRequest(
    val accept: Boolean,
)

@Serializable
data class OrganizationInviteRequest(
    val email: String,
    val role: String = OrganizationRole.MEMBER.apiValue,
    val message: String? = null,
)

@Serializable
data class OrganizationCreateTeamRequest(
    val name: String,
    val description: String? = null,
    val hospital: String? = null,
    val department: String? = null,
    @SerialName("max_members") val maxMembers: Int? = null,
)

@Serializable
data class OrganizationMemberRoleUpdateRequest(
    val role: String,
)

enum class OrganizationRole(
    val apiValue: String,
    val label: String,
) {
    ADMIN(apiValue = "ADMIN", label = "管理员"),
    MEMBER(apiValue = "MEMBER", label = "成员"),
    GUEST(apiValue = "GUEST", label = "访客"),
}
