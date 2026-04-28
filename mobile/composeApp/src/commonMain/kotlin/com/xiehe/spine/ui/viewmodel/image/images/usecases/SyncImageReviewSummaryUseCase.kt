package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.image.ImageFileRepository
import com.xiehe.spine.data.image.ImageWorkflowStatus
import com.xiehe.spine.data.image.normalizeImageStatus

class SyncImageReviewSummaryUseCase(
    private val imageFileRepository: ImageFileRepository,
) {
    suspend operator fun invoke(
        session: UserSession,
    ): SyncImageReviewSummaryOutcome {
        return when (val result = imageFileRepository.loadAllImageFiles(session)) {
            is AppResult.Success -> {
                val updatedSession = result.data.first
                val images = result.data.second
                SyncImageReviewSummaryOutcome.Success(
                    session = updatedSession,
                    totalCount = images.size,
                    reviewedCount = images.count { image ->
                        normalizeImageStatus(image.status) == ImageWorkflowStatus.PROCESSED
                    },
                )
            }

            is AppResult.Failure -> SyncImageReviewSummaryOutcome.Failure(result)
        }
    }
}

sealed interface SyncImageReviewSummaryOutcome {
    data class Success(
        val session: UserSession,
        val totalCount: Int,
        val reviewedCount: Int,
    ) : SyncImageReviewSummaryOutcome

    data class Failure(val error: AppResult.Failure) : SyncImageReviewSummaryOutcome
}
