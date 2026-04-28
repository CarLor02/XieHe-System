package com.xiehe.spine.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.data.auth.AuthRepository
import com.xiehe.spine.data.image.ImageWorkflowStatus
import com.xiehe.spine.data.image.normalizeImageStatus
import com.xiehe.spine.data.patient.PatientRepository
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.ui.components.card.profile.ProfileMenuRow
import com.xiehe.spine.ui.components.card.profile.ProfileOrganizationPalette
import com.xiehe.spine.ui.components.card.profile.ProfilePasswordPalette
import com.xiehe.spine.ui.components.card.profile.ProfilePersonalInfoPalette
import com.xiehe.spine.ui.components.card.profile.ProfileSettingsPalette
import com.xiehe.spine.ui.components.card.profile.ProfileStat
import com.xiehe.spine.ui.components.card.profile.ProfileTag
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.image.ImagesViewModel
import com.xiehe.spine.ui.viewmodel.patient.PatientsViewModel
import com.xiehe.spine.ui.viewmodel.profile.PersonalInfoViewModel

@Composable
fun ProfileScreen(
    session: UserSession,
    personalInfoVm: PersonalInfoViewModel,
    patientsVm: PatientsViewModel,
    imagesVm: ImagesViewModel,
    authRepository: AuthRepository,
    patientRepository: PatientRepository,
    onSessionUpdated: (UserSession) -> Unit,
    onSessionExpired: (String) -> Unit = {},
    onOpenAppearance: () -> Unit,
    onOpenPersonalInfo: () -> Unit,
    onOpenOrganization: () -> Unit,
    onOpenChangePassword: () -> Unit,
    onLogout: () -> Unit,
) {
    val personalInfoState by personalInfoVm.state.collectAsState()
    val patientsState by patientsVm.state.collectAsState()
    val imagesState by imagesVm.state.collectAsState()
    val colors = SpineTheme.colors
    LaunchedEffect(session.accessToken) {
        personalInfoVm.seedFromSession(session)
        personalInfoVm.load(
            session = session,
            repository = authRepository,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
        )
        patientsVm.syncManagedTotalCount(
            session = session,
            repository = patientRepository,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
        )
        imagesVm.syncReviewSummary(
            session = session,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
        )
    }
    val displayName = personalInfoState.realName.ifBlank {
        session.fullName?.takeIf { it.isNotBlank() } ?: session.username
    }
    val roleLabel = profileRoleLabel(personalInfoState.role)
    val titleLabel = personalInfoState.title.ifBlank { "未设置职称" }
    val reviewedCount = imagesState.summaryReviewedCount
    val imageTotalCount = imagesState.summaryTotalCount
    val completionRate = if (imageTotalCount == 0) {
        "0%"
    } else {
        "${((reviewedCount * 100f) / imageTotalCount.toFloat()).toInt()}%"
    }
    val scrollState = rememberScrollState()
    val cardShape = RoundedCornerShape(24.dp)
    val shadowColor = colors.textPrimary.copy(alpha = if (colors.isDark) 0.22f else 0.08f)
    val avatarGlow = colors.primary.copy(alpha = if (colors.isDark) 0.32f else 0.2f)
    val avatarBrush = Brush.linearGradient(listOf(colors.primary.copy(alpha = 0.8f), colors.primary))

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .verticalScroll(scrollState)
            .padding(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 620.dp)
                .shadow(18.dp, cardShape, ambientColor = shadowColor, spotColor = shadowColor)
                .clip(cardShape)
                .background(colors.surface)
                .border(1.dp, colors.borderSubtle, cardShape)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .shadow(16.dp, RoundedCornerShape(20.dp), ambientColor = avatarGlow, spotColor = avatarGlow)
                            .clip(RoundedCornerShape(20.dp))
                            .background(avatarBrush),
                        contentAlignment = Alignment.Center,
                    ) {
                        AppIcon(glyph = IconToken.USER_ROUND, tint = colors.onPrimary, modifier = Modifier.size(28.dp))
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = displayName,
                            style = SpineTheme.typography.title.copy(fontWeight = FontWeight.Bold),
                            color = colors.textPrimary,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            ProfileTag(text = roleLabel, active = true)
                            ProfileTag(text = titleLabel, active = false)
                        }
                    }
                }

                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(colors.surfaceMuted)
                        .border(1.dp, colors.borderSubtle, RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    AppIcon(glyph = IconToken.SCAN_SEARCH, tint = colors.textTertiary, modifier = Modifier.size(18.dp))
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(colors.borderSubtle),
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                ProfileStat(label = "管理患者", value = patientsState.managedTotalCount.toString(), modifier = Modifier.weight(1f))
                ProfileStatDivider(color = colors.borderSubtle)
                ProfileStat(label = "已审核", value = reviewedCount.toString(), modifier = Modifier.weight(1f))
                ProfileStatDivider(color = colors.borderSubtle)
                ProfileStat(label = "完成率", value = completionRate, modifier = Modifier.weight(1f))
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 620.dp)
                .shadow(16.dp, cardShape, ambientColor = shadowColor, spotColor = shadowColor)
                .clip(cardShape)
                .background(colors.surface)
                .border(1.dp, colors.borderSubtle, cardShape),
        ) {
            ProfileMenuRow(
                label = "个人信息",
                glyph = IconToken.PROFILE,
                palette = ProfilePersonalInfoPalette,
                onClick = onOpenPersonalInfo,
                showDivider = true,
            )
            ProfileMenuRow(
                label = "组织管理",
                glyph = IconToken.USERS,
                palette = ProfileOrganizationPalette,
                onClick = onOpenOrganization,
                showDivider = true,
            )
            ProfileMenuRow(
                label = "修改密码",
                glyph = IconToken.LOCK,
                palette = ProfilePasswordPalette,
                onClick = onOpenChangePassword,
                showDivider = true,
            )
            ProfileMenuRow(
                label = "系统设置",
                glyph = IconToken.SETTINGS,
                palette = ProfileSettingsPalette,
                onClick = onOpenAppearance,
                showDivider = false,
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 620.dp)
                .height(56.dp)
                .shadow(10.dp, RoundedCornerShape(20.dp), ambientColor = shadowColor, spotColor = shadowColor)
                .clip(RoundedCornerShape(20.dp))
                .background(colors.surface)
                .border(1.dp, colors.borderSubtle, RoundedCornerShape(20.dp))
                .clickable(onClick = onLogout),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AppIcon(glyph = IconToken.BACK, tint = colors.error, modifier = Modifier.size(16.dp))
                Text(
                    text = "退出登录",
                    style = SpineTheme.typography.body.copy(fontWeight = FontWeight.Bold),
                    color = colors.error,
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun ProfileStatDivider(color: Color) {
    Box(
        modifier = Modifier
            .width(1.dp)
            .height(46.dp)
            .background(color),
    )
}

private fun profileRoleLabel(role: String): String {
    return when (role.trim().lowercase()) {
        "doctor" -> "医生"
        "admin" -> "管理员"
        "system_admin", "system-admin" -> "系统管理员"
        "team_admin", "team-admin" -> "团队管理员"
        "member" -> "成员"
        "guest" -> "访客"
        "" -> "未设置角色"
        else -> role
    }
}
