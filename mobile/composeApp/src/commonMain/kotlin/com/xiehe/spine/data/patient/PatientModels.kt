package com.xiehe.spine.data.patient

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PatientPageData(
    val items: List<PatientSummary>,
    val pagination: Pagination,
)

@Serializable
data class Pagination(
    val total: Int,
    val page: Int,
    @SerialName("page_size") val pageSize: Int,
    @SerialName("total_pages") val totalPages: Int,
)

@Serializable
data class PatientSummary(
    val id: Int,
    @SerialName("patient_id") val patientId: String,
    val name: String,
    val gender: String,
    @SerialName("birth_date") val birthDate: String? = null,
    val age: Int? = null,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    @SerialName("emergency_contact_name") val emergencyContactName: String? = null,
    @SerialName("emergency_contact_phone") val emergencyContactPhone: String? = null,
    @SerialName("id_card") val idCard: String? = null,
    @SerialName("insurance_number") val insuranceNumber: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("avatar") val avatar: String? = null,
    val status: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class PatientDetail(
    val id: Int,
    @SerialName("patient_id") val patientId: String,
    val name: String,
    val gender: String,
    @SerialName("birth_date") val birthDate: String? = null,
    val age: Int? = null,
    val phone: String? = null,
    val email: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("avatar") val avatar: String? = null,
    val address: String? = null,
    @SerialName("emergency_contact_name") val emergencyContactName: String? = null,
    @SerialName("emergency_contact_phone") val emergencyContactPhone: String? = null,
    @SerialName("id_card") val idCard: String? = null,
    @SerialName("insurance_number") val insuranceNumber: String? = null,
    @SerialName("medical_history") val medicalHistory: String? = null,
    val status: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class CreatePatientRequest(
    @SerialName("patient_id") val patientId: String,
    val name: String,
    val gender: String,
    @SerialName("birth_date") val birthDate: String? = null,
    val phone: String? = null,
    @SerialName("id_card") val idCard: String? = null,
    val email: String? = null,
    val address: String? = null,
    @SerialName("emergency_contact_name") val emergencyContactName: String? = null,
    @SerialName("emergency_contact_phone") val emergencyContactPhone: String? = null,
    @SerialName("insurance_number") val insuranceNumber: String? = null,
)

@Serializable
data class UpdatePatientRequest(
    val name: String? = null,
    val gender: String? = null,
    @SerialName("birth_date") val birthDate: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    @SerialName("emergency_contact_name") val emergencyContactName: String? = null,
    @SerialName("emergency_contact_phone") val emergencyContactPhone: String? = null,
    @SerialName("id_card") val idCard: String? = null,
    @SerialName("insurance_number") val insuranceNumber: String? = null,
)
