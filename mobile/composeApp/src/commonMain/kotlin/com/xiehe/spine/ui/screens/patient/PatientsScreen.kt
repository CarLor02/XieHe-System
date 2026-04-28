package com.xiehe.spine.ui.screens.patient

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.patient.PatientRepository
import com.xiehe.spine.ui.components.card.patient.PatientSummaryCard
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.form.picker.OptionPickerOverlay
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.patient.GenderFilter
import com.xiehe.spine.ui.viewmodel.patient.PatientsViewModel
import androidx.compose.foundation.layout.Row
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

@Composable
fun PatientsScreen(
    vm: PatientsViewModel,
    session: UserSession,
    repository: PatientRepository,
    onSessionUpdated: (UserSession) -> Unit,
    onSessionExpired: (String) -> Unit = {},
    onOpenPatient: (Int) -> Unit,
    showInlineSearch: Boolean = true,
    onEditPatient: (Int) -> Unit,
) {
    val state by vm.state.collectAsState()
    val listState = rememberLazyListState()
    var showGenderPicker by remember { mutableStateOf(false) }

    LaunchedEffect(session.accessToken, state.search, state.genderFilter, state.ageFilter) {
        delay(260)
        vm.refresh(session, repository, onSessionUpdated, onSessionExpired)
    }

    LaunchedEffect(listState.canScrollForward, state.page, state.totalPages, state.loadingMore) {
        if (!listState.canScrollForward && state.page < state.totalPages && !state.loadingMore) {
            vm.loadMore(session, repository, onSessionUpdated, onSessionExpired)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SpineTheme.colors.background),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (showInlineSearch) {
                com.xiehe.spine.ui.components.form.input.TextField(
                    value = state.search,
                    onValueChange = vm::updateSearch,
                    placeholder = "搜索患者姓名、ID或手机号",
                    modifier = Modifier.fillMaxWidth(),
                    leadingGlyph = com.xiehe.spine.ui.components.icon.shared.IconToken.SEARCH,
                )
            }

            GenderFilterChip(
                text = "性别: ${state.genderFilter.label.removePrefix("全部")}".let {
                    if (state.genderFilter == GenderFilter.ALL) "性别: 全部" else it
                },
                onClick = { showGenderPicker = true },
            )

            state.errorMessage?.let {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = it,
                        style = SpineTheme.typography.subhead.copy(color = SpineTheme.colors.error),
                    )
                }
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                state = listState,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(state.items, key = { it.id }) { patient ->
                    PatientSummaryCard(
                        patient = patient,
                        onOpenPatient = { onOpenPatient(patient.id) },
                        onEditPatient = { onEditPatient(patient.id) },
                    )
                }

                item {
                    if (state.loading || state.loadingMore) {
                        Text(
                            text = "加载中...",
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(8.dp),
                            style = SpineTheme.typography.subhead,
                            color = SpineTheme.colors.textSecondary,
                        )
                    }
                }
            }
        }

        if (state.loading && state.items.isEmpty()) {
            LoadingOverlay(message = "...正在加载中")
        }
    }

    if (showGenderPicker) {
        OptionPickerOverlay(
            title = "选择性别",
            options = GenderFilter.entries.map { it.label },
            selected = state.genderFilter.label,
            onDismiss = { showGenderPicker = false },
            onSelect = { selected ->
                GenderFilter.entries.firstOrNull { it.label == selected }?.let(vm::updateGenderFilter)
                showGenderPicker = false
            },
        )
    }
}

@Composable
private fun GenderFilterChip(
    text: String,
    onClick: () -> Unit,
) {
    val colors = SpineTheme.colors
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(colors.surface)
            .border(1.dp, colors.borderSubtle, RoundedCornerShape(999.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "≡",
            style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.Bold),
            color = colors.primary,
        )
        Text(
            text = text,
            style = SpineTheme.typography.subhead.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textSecondary,
        )
    }
}
