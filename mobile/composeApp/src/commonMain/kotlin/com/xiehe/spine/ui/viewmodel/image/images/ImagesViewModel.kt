package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.currentEpochSeconds
import com.xiehe.spine.notifySessionExpired
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.image.ImageFileRepository
import com.xiehe.spine.ui.viewmodel.shared.BaseViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class ImagesViewModel(
    imageFileRepository: ImageFileRepository,
    private val refreshImagesUseCase: RefreshImagesUseCase = RefreshImagesUseCase(imageFileRepository),
    private val syncImageReviewSummaryUseCase: SyncImageReviewSummaryUseCase = SyncImageReviewSummaryUseCase(imageFileRepository),
) : BaseViewModel() {
    private val _state = MutableStateFlow(ImagesUiState())
    val state: StateFlow<ImagesUiState> = _state.asStateFlow()

    fun updateSearch(value: String) {
        _state.update { current ->
            val next = current.copy(search = value)
            next.copy(filteredItems = ImageFilterPolicy.apply(next))
        }
    }

    fun updateTypeFilter(value: ImageTypeFilter) {
        _state.update { current ->
            val next = current.copy(typeFilter = value)
            next.copy(filteredItems = ImageFilterPolicy.apply(next))
        }
    }

    fun updateStatusFilter(value: ImageStatusFilter) {
        _state.update { current ->
            val next = current.copy(statusFilter = value)
            next.copy(filteredItems = ImageFilterPolicy.apply(next))
        }
    }

    fun refreshIfNeeded(
        session: UserSession,
        onSessionUpdated: (UserSession) -> Unit,
        force: Boolean = false,
        onSessionExpired: (String) -> Unit = {},
    ) {
        val snapshot = _state.value
        if (snapshot.loading) return
        if (!force && snapshot.items.isNotEmpty()) {
            val now = currentEpochSeconds()
            val last = snapshot.lastLoadedAtEpochSeconds ?: 0L
            if ((now - last) < 20L) return
        }
        refresh(session, onSessionUpdated, onSessionExpired)
    }

    fun refresh(
        session: UserSession,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        scope.launch {
            _state.update { it.copy(loading = true, errorMessage = null) }
            when (val outcome = refreshImagesUseCase(session)) {
                is RefreshImagesOutcome.Success -> {
                    onSessionUpdated(outcome.session)
                    _state.update { current ->
                        current.copy(
                            loading = false,
                            lastLoadedAtEpochSeconds = outcome.lastLoadedAtEpochSeconds,
                            items = outcome.items,
                            filteredItems = ImageFilterPolicy.apply(
                                current.copy(items = outcome.items),
                            ),
                            summaryTotalCount = outcome.summaryTotalCount,
                            summaryReviewedCount = outcome.summaryReviewedCount,
                            errorMessage = null,
                        )
                    }
                }

                is RefreshImagesOutcome.Failure -> {
                    if (outcome.error.notifySessionExpired(onSessionExpired)) {
                        _state.update { it.copy(loading = false, errorMessage = null) }
                    } else {
                        _state.update { it.copy(loading = false, errorMessage = outcome.error.message) }
                    }
                }
            }
        }
    }

    fun syncReviewSummary(
        session: UserSession,
        onSessionUpdated: (UserSession) -> Unit,
        onSessionExpired: (String) -> Unit = {},
    ) {
        scope.launch {
            when (val outcome = syncImageReviewSummaryUseCase(session)) {
                is SyncImageReviewSummaryOutcome.Success -> {
                    onSessionUpdated(outcome.session)
                    _state.update {
                        it.copy(
                            summaryTotalCount = outcome.totalCount,
                            summaryReviewedCount = outcome.reviewedCount,
                        )
                    }
                }

                is SyncImageReviewSummaryOutcome.Failure -> {
                    outcome.error.notifySessionExpired(onSessionExpired)
                }
            }
        }
    }
}
