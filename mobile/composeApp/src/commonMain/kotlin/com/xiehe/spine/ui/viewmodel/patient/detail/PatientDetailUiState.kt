package com.xiehe.spine.ui.viewmodel.patient

import com.xiehe.spine.data.image.ImageFileSummary
import com.xiehe.spine.data.patient.PatientDetail

data class PatientDetailUiState(
    val loading: Boolean = false,
    val deleting: Boolean = false,
    val detail: PatientDetail? = null,
    val relatedImages: List<ImageFileSummary> = emptyList(),
    val relatedLoading: Boolean = false,
    val noticeMessage: String? = null,
    val errorMessage: String? = null,
)
