package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.image.ImageCategory
import com.xiehe.spine.data.patient.PatientSummary

enum class UploadFileStatus(val label: String) {
    PENDING("待上传"),
    UPLOADING("上传中"),
    COMPLETED("上传完成"),
    ERROR("上传失败"),
}

data class UploadFilePayload(
    val id: String,
    val name: String,
    val mimeType: String,
    val bytes: ByteArray,
    val sourceBytes: ByteArray = bytes,
    val sourceMimeType: String = mimeType,
    val examType: ImageCategory = ImageCategory.FRONT,
    val flipped: Boolean = false,
    val cropped: Boolean = false,
    val status: UploadFileStatus = UploadFileStatus.PENDING,
)

data class ImageUploadUiState(
    val loadingPatients: Boolean = false,
    val uploading: Boolean = false,
    val patients: List<PatientSummary> = emptyList(),
    val selectedPatientId: Int? = null,
    val selectedExamType: ImageCategory = ImageCategory.FRONT,
    val examTypes: List<ImageCategory> = ImageCategory.entries,
    val uploadFiles: List<UploadFilePayload> = emptyList(),
    val errorMessage: String? = null,
    val successMessage: String? = null,
)
