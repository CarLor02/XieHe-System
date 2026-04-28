package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.image.ImageCategory
import com.xiehe.spine.data.patient.PatientSummary

data class UploadFilePayload(
    val name: String,
    val mimeType: String,
    val bytes: ByteArray,
)

data class ImageUploadUiState(
    val loadingPatients: Boolean = false,
    val uploading: Boolean = false,
    val patients: List<PatientSummary> = emptyList(),
    val selectedPatientId: Int? = null,
    val selectedExamType: ImageCategory = ImageCategory.FRONT,
    val examTypes: List<ImageCategory> = ImageCategory.entries,
    val selectedFile: UploadFilePayload? = null,
    val errorMessage: String? = null,
    val successMessage: String? = null,
)
