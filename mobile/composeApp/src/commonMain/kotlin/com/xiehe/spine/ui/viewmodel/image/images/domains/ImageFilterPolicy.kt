package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.image.ImageFileSummary
import com.xiehe.spine.data.image.ImageWorkflowStatus
import com.xiehe.spine.data.image.normalizeImageStatus

object ImageFilterPolicy {
    fun apply(state: ImagesUiState): List<ImageFileSummary> {
        val keyword = state.search.trim().lowercase()
        return state.items.filter { item ->
            val matchesSearch = keyword.isBlank() || item.matchesSearch(keyword)
            val matchesType = state.typeFilter.category?.let {
                item.description?.trim() == state.typeFilter.label
            } ?: true
            val matchesStatus = when (state.statusFilter) {
                ImageStatusFilter.ALL -> true
                ImageStatusFilter.PENDING_REVIEW -> normalizeImageStatus(item.status) == ImageWorkflowStatus.UPLOADED
                ImageStatusFilter.ARCHIVED -> normalizeImageStatus(item.status) == ImageWorkflowStatus.PROCESSED
                ImageStatusFilter.PROCESSING -> normalizeImageStatus(item.status) == ImageWorkflowStatus.PROCESSING
                ImageStatusFilter.FAILED -> normalizeImageStatus(item.status) == ImageWorkflowStatus.FAILED
            }
            matchesSearch && matchesType && matchesStatus
        }
    }

    private fun ImageFileSummary.matchesSearch(keyword: String): Boolean {
        return listOfNotNull(
            patientName,
            patientId?.toString(),
            originalFilename,
            description,
            modality,
            bodyPart,
            uploaderName,
        ).any { value ->
            value.lowercase().contains(keyword)
        }
    }
}
