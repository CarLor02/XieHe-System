package com.xiehe.spine.data.image

import com.xiehe.spine.data.patient.Pagination
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ImageFilePageData(
    val items: List<ImageFileSummary>,
    val pagination: Pagination,
    val fromCache: Boolean = false,
)

@Serializable
data class ImageFileSummary(
    val id: Int,
    @SerialName("file_uuid") val fileUuid: String,
    @SerialName("original_filename") val originalFilename: String,
    @SerialName("file_type") val fileType: String? = null,
    @SerialName("mime_type") val mimeType: String? = null,
    @SerialName("file_size") val fileSize: Long? = null,
    @SerialName("storage_path") val storagePath: String? = null,
    @SerialName("thumbnail_path") val thumbnailPath: String? = null,
    @SerialName("uploaded_by") val uploadedBy: Int? = null,
    @SerialName("uploader_name") val uploaderName: String? = null,
    @SerialName("patient_id") val patientId: Int? = null,
    @SerialName("patient_name") val patientName: String? = null,
    val modality: String? = null,
    @SerialName("body_part") val bodyPart: String? = null,
    @SerialName("study_date") val studyDate: String? = null,
    val description: String? = null,
    val annotation: String? = null,
    val status: String? = null,
    @SerialName("upload_progress") val uploadProgress: Int? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("uploaded_at") val uploadedAt: String? = null,
)

@Serializable
data class UploadSingleImageData(
    @SerialName("file_id") val fileId: String,
    val filename: String,
    val size: Long? = null,
    @SerialName("mime_type") val mimeType: String? = null,
    @SerialName("upload_url") val uploadUrl: String? = null,
    val status: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class ImageStatsSummary(
    @SerialName("total_files") val totalFiles: Int,
    @SerialName("total_size") val totalSize: Long,
    @SerialName("by_type") val byType: Map<String, Int> = emptyMap(),
    @SerialName("by_status") val byStatus: Map<String, Int> = emptyMap(),
    @SerialName("by_modality") val byModality: Map<String, Int> = emptyMap(),
)

@Serializable
data class UpdateAnnotationRequest(
    val annotation: String,
)
