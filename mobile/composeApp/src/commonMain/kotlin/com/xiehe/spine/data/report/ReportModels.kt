package com.xiehe.spine.data.report

import com.xiehe.spine.data.patient.Pagination
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ReportPageData(
    val items: List<ReportSummary> = emptyList(),
    val pagination: Pagination,
)

@Serializable
data class ReportSummary(
    val id: Int,
    @SerialName("report_number") val reportNumber: String,
    @SerialName("patient_id") val patientId: Int? = null,
    @SerialName("patient_name") val patientName: String? = null,
    @SerialName("study_id") val studyId: Int? = null,
    @SerialName("report_title") val reportTitle: String,
    val status: String? = null,
    val priority: String? = null,
    @SerialName("primary_diagnosis") val primaryDiagnosis: String? = null,
    @SerialName("reporting_physician") val reportingPhysician: String? = null,
    @SerialName("report_date") val reportDate: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class ReportDetail(
    val id: Int,
    @SerialName("report_number") val reportNumber: String,
    @SerialName("patient_id") val patientId: Int? = null,
    @SerialName("patient_name") val patientName: String? = null,
    @SerialName("study_id") val studyId: Int? = null,
    @SerialName("template_id") val templateId: Int? = null,
    @SerialName("report_title") val reportTitle: String,
    @SerialName("clinical_history") val clinicalHistory: String? = null,
    @SerialName("examination_technique") val examinationTechnique: String? = null,
    val findings: String? = null,
    val impression: String? = null,
    val recommendations: String? = null,
    @SerialName("primary_diagnosis") val primaryDiagnosis: String? = null,
    @SerialName("secondary_diagnosis") val secondaryDiagnosis: String? = null,
    val priority: String? = null,
    val status: String? = null,
    @SerialName("ai_assisted") val aiAssisted: Boolean? = null,
    @SerialName("ai_confidence") val aiConfidence: Double? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("created_by") val createdBy: Int? = null,
    @SerialName("reviewed_by") val reviewedBy: Int? = null,
    @SerialName("reviewed_at") val reviewedAt: String? = null,
)

@Serializable
data class ReportCreateRequest(
    @SerialName("patient_id") val patientId: Int,
    @SerialName("study_id") val studyId: Int? = null,
    @SerialName("template_id") val templateId: Int? = null,
    @SerialName("report_title") val reportTitle: String,
    @SerialName("clinical_history") val clinicalHistory: String? = null,
    @SerialName("examination_technique") val examinationTechnique: String? = null,
    val findings: String? = null,
    val impression: String? = null,
    val recommendations: String? = null,
    @SerialName("primary_diagnosis") val primaryDiagnosis: String? = null,
    @SerialName("secondary_diagnosis") val secondaryDiagnosis: String? = null,
    val priority: String? = null,
)

@Serializable
data class ReportUpdateRequest(
    @SerialName("report_title") val reportTitle: String? = null,
    @SerialName("clinical_history") val clinicalHistory: String? = null,
    @SerialName("examination_technique") val examinationTechnique: String? = null,
    val findings: String? = null,
    val impression: String? = null,
    val recommendations: String? = null,
    @SerialName("primary_diagnosis") val primaryDiagnosis: String? = null,
    @SerialName("secondary_diagnosis") val secondaryDiagnosis: String? = null,
    val priority: String? = null,
)
