package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.image.ImageCategory
import com.xiehe.spine.data.image.ImageFileSummary

enum class ImageTypeFilter(
    val label: String,
    val category: ImageCategory? = null,
) {
    ALL("全部类型"),
    FRONT("正位X光片", ImageCategory.FRONT),
    SIDE("侧位X光片", ImageCategory.SIDE),
    LEFT_BENDING("左侧曲位", ImageCategory.LEFT_BENDING),
    RIGHT_BENDING("右侧曲位", ImageCategory.RIGHT_BENDING),
    POSTURE_PHOTO("体态照片", ImageCategory.POSTURE_PHOTO),
}

enum class ImageStatusFilter(val label: String) {
    ALL("全部状态"),
    PENDING_REVIEW("待审核"),
    ARCHIVED("已归档"),
    PROCESSING("处理中"),
    FAILED("失败"),
}

data class ImagesUiState(
    val loading: Boolean = false,
    val lastLoadedAtEpochSeconds: Long? = null,
    val search: String = "",
    val typeFilter: ImageTypeFilter = ImageTypeFilter.ALL,
    val statusFilter: ImageStatusFilter = ImageStatusFilter.ALL,
    val items: List<ImageFileSummary> = emptyList(),
    val filteredItems: List<ImageFileSummary> = emptyList(),
    val summaryTotalCount: Int = 0,
    val summaryReviewedCount: Int = 0,
    val errorMessage: String? = null,
)
