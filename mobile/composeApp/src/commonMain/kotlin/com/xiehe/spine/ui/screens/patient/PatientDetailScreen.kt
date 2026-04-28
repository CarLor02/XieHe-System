package com.xiehe.spine.ui.screens.patient

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.image.ImageFileRepository
import com.xiehe.spine.data.patient.PatientRepository
import com.xiehe.spine.ui.components.card.patient.PatientBasicInfoCard
import com.xiehe.spine.ui.components.card.patient.PatientImageRecordsCard
import com.xiehe.spine.ui.components.card.patient.PatientOverviewCards
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.patient.PatientDetailViewModel

@Composable
fun PatientDetailScreen(
    patientId: Int,
    vm: PatientDetailViewModel,
    session: UserSession,
    patientRepository: PatientRepository,
    imageRepository: ImageFileRepository,
    onSessionUpdated: (UserSession) -> Unit,
    onSessionExpired: (String) -> Unit = {},
    onOpenAnalysis: (Int, Int?, String) -> Unit,
    onOpenImageUpload: () -> Unit,
) {
    val state by vm.state.collectAsState()

    DisposableEffect(patientId) {
        onDispose { vm.clear() }
    }

    LaunchedEffect(patientId, session.accessToken) {
        vm.load(
            patientId = patientId,
            session = session,
            patientRepository = patientRepository,
            imageRepository = imageRepository,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SpineTheme.colors.background),
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            state.noticeMessage?.let {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = it,
                            style = SpineTheme.typography.subhead.copy(color = SpineTheme.colors.warning),
                        )
                    }
                }
            }

            state.errorMessage?.let {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = it,
                            style = SpineTheme.typography.subhead.copy(color = SpineTheme.colors.error),
                        )
                    }
                }
            }

            val detail = state.detail
            if (detail == null) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Text(text = if (state.loading) "加载患者详情中..." else "暂无患者详情")
                    }
                }
            } else {
                item {
                    PatientBasicInfoCard(detail = detail)
                }

                item {
                    PatientOverviewCards(
                        detail = detail,
                        relatedImages = state.relatedImages,
                    )
                }

                item {
                    PatientImageRecordsCard(
                        images = state.relatedImages,
                        onOpenAnalysis = onOpenAnalysis,
                        onUploadImage = onOpenImageUpload,
                    )
                }
            }
        }

        if (state.loading) {
            LoadingOverlay(message = "...正在加载中")
        } else if (state.deleting) {
            LoadingOverlay(message = "...正在删除患者")
        }
    }
}
