package com.xiehe.spine.data.report

import com.xiehe.spine.data.image.ImageCategory

fun mapImageCategoryToReportExamType(examType: String): String? {
    return when (ImageCategory.fromRaw(examType) ?: ImageCategory.fromLabel(examType)) {
        ImageCategory.FRONT,
        ImageCategory.LEFT_BENDING,
        ImageCategory.RIGHT_BENDING,
        -> "正位X光片"

        ImageCategory.SIDE -> "侧位X光片"
        ImageCategory.POSTURE_PHOTO -> null
        null -> examType.takeIf { it == "正位X光片" || it == "侧位X光片" }
    }
}
