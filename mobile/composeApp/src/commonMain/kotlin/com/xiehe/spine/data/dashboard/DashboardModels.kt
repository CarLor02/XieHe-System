package com.xiehe.spine.data.dashboard

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DashboardOverview(
    @SerialName("total_patients") val totalPatients: Int,
    @SerialName("new_patients_today") val newPatientsToday: Int,
    @SerialName("new_patients_week") val newPatientsWeek: Int,
    @SerialName("active_patients") val activePatients: Int,
    @SerialName("total_images") val totalImages: Int,
    @SerialName("images_today") val imagesToday: Int,
    @SerialName("images_week") val imagesWeek: Int,
    @SerialName("pending_images") val pendingImages: Int,
    @SerialName("processed_images") val processedImages: Int,
    @SerialName("completion_rate") val completionRate: Double,
    @SerialName("average_processing_time") val averageProcessingTime: Double,
    @SerialName("system_alerts") val systemAlerts: Int,
)
