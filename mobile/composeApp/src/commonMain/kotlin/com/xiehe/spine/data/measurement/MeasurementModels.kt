package com.xiehe.spine.data.measurement

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class ImageMeasurementsData(
    val measurements: List<ImageMeasurementItem> = emptyList(),
    val reportText: String? = null,
    val savedAt: String? = null,
    val standardDistance: Double? = null,
    val standardDistancePoints: List<MeasurementPoint> = emptyList(),
)

@Serializable
data class ImageMeasurementItem(
    val id: String? = null,
    val type: String,
    val value: JsonElement? = null,
    val angle: JsonElement? = null,
    val points: List<MeasurementPoint> = emptyList(),
    val description: String? = null,
    @SerialName("upper_vertebra") val upperVertebra: String? = null,
    @SerialName("lower_vertebra") val lowerVertebra: String? = null,
    @SerialName("apex_vertebra") val apexVertebra: String? = null,
)

@Serializable
data class MeasurementPoint(
    val x: Double,
    val y: Double,
)

@Serializable
data class SaveMeasurementsRequest(
    val examType: String,
    @SerialName("imageId") val imageId: String,
    @SerialName("patientId") val patientId: String? = null,
    val measurements: List<SaveMeasurementItem>,
    val reportText: String,
    val savedAt: String,
)

@Serializable
data class SaveMeasurementItem(
    val id: String? = null,
    val type: String,
    val value: String? = null,
    val points: List<MeasurementPoint>,
    val description: String? = null,
)

@Serializable
data class SaveMeasurementsResult(
    val count: Int? = null,
    @SerialName("image_file_id") val imageFileId: Int? = null,
    @SerialName("measurement_id") val measurementId: Int? = null,
)

@Serializable
data class GenerateReportRequest(
    val examType: String,
    @SerialName("imageId") val imageId: String,
    val measurements: List<GenerateReportMeasurementItem>,
)

@Serializable
data class GenerateReportMeasurementItem(
    val description: String? = null,
    val type: String,
    val value: String,
)

@Serializable
data class GenerateReportResult(
    val report: String = "",
    val generatedAt: String? = null,
)
