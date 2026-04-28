package com.xiehe.spine.data.image

enum class ImageWorkflowStatus {
    UPLOADED,
    PROCESSING,
    PROCESSED,
    FAILED,
    UNKNOWN,
}

fun normalizeImageStatus(rawStatus: String?): ImageWorkflowStatus {
    return when (rawStatus?.trim()?.uppercase()) {
        "UPLOADED", "PENDING", "PENDING_REVIEW", "已上传", "待审核", "待处理" -> ImageWorkflowStatus.UPLOADED
        "PROCESSING", "IN_PROGRESS", "处理中", "分析中" -> ImageWorkflowStatus.PROCESSING
        "PROCESSED", "COMPLETED", "DONE", "ARCHIVED", "已完成", "已归档" -> ImageWorkflowStatus.PROCESSED
        "FAILED", "ERROR", "失败" -> ImageWorkflowStatus.FAILED
        else -> ImageWorkflowStatus.UNKNOWN
    }
}
