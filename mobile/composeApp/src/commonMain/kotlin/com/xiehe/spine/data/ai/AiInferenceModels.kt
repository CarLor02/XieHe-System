package com.xiehe.spine.data.ai

import com.xiehe.spine.data.measurement.MeasurementPoint
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AiDetectResponse(
    @SerialName("imageId") val imageId: String? = null,
    @SerialName("imageWidth") val imageWidth: Int? = null,
    @SerialName("imageHeight") val imageHeight: Int? = null,
    @SerialName("pose_keypoints") val poseKeypoints: Map<String, AiPointNode> = emptyMap(),
    val vertebrae: Map<String, AiVertebraNode> = emptyMap(),
)

@Serializable
data class AiPredictResponse(
    @SerialName("imageId") val imageId: String? = null,
    @SerialName("imageWidth") val imageWidth: Int? = null,
    @SerialName("imageHeight") val imageHeight: Int? = null,
    val measurements: List<AiPredictMeasurement> = emptyList(),
)

@Serializable
data class AiPredictMeasurement(
    val type: String,
    val points: List<MeasurementPoint> = emptyList(),
    val angle: Double? = null,
    @SerialName("upper_vertebra") val upperVertebra: String? = null,
    @SerialName("lower_vertebra") val lowerVertebra: String? = null,
    @SerialName("apex_vertebra") val apexVertebra: String? = null,
)

@Serializable
data class AiPointNode(
    val x: Double,
    val y: Double,
    val confidence: Double? = null,
    val conf: Double? = null,
)

@Serializable
data class AiVertebraNode(
    val corners: AiVertebraCorners? = null,
    val confidence: Double? = null,
    @SerialName("class_id") val classId: Int? = null,
)

@Serializable
data class AiVertebraCorners(
    @SerialName("top_left") val topLeft: AiPointNode? = null,
    @SerialName("top_right") val topRight: AiPointNode? = null,
    @SerialName("bottom_left") val bottomLeft: AiPointNode? = null,
    @SerialName("bottom_right") val bottomRight: AiPointNode? = null,
    @SerialName("top_mid") val topMid: AiPointNode? = null,
    @SerialName("bottom_mid") val bottomMid: AiPointNode? = null,
    val center: AiPointNode? = null,
)
