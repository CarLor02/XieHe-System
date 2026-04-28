package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.catalog.ANNOTATION_TOOL_CATALOG
import com.xiehe.spine.ui.components.analysis.viewer.catalog.AnnotationToolDefinition
import com.xiehe.spine.ui.components.analysis.viewer.domain.buildInheritedPointMap
import com.xiehe.spine.ui.components.analysis.viewer.domain.getEffectivePointsNeeded
import com.xiehe.spine.ui.components.analysis.viewer.domain.getInheritedPoints

data class ManualMeasurementBatch(
    val addedMeasurements: List<ImageAnalysisMeasurement>,
    val primaryMeasurement: ImageAnalysisMeasurement,
    val finalPoints: List<MeasurementPoint>,
)

object ManualMeasurementComposer {
    fun effectiveInteractionPoints(
        tool: AnnotationToolDefinition,
        measurements: List<ImageAnalysisMeasurement>,
    ): Int {
        if (tool.pointsNeeded > 0) {
            return getEffectivePointsNeeded(
                toolId = tool.id,
                totalPointsNeeded = tool.pointsNeeded,
                measurements = measurements,
            )
        }
        return tool.interactionPointsNeeded
    }

    fun buildBatch(
        tool: AnnotationToolDefinition,
        userPoints: List<MeasurementPoint>,
        measurements: List<ImageAnalysisMeasurement>,
        standardDistanceMm: Double?,
        standardDistancePoints: List<MeasurementPoint>,
        nextMeasurementKey: (String) -> String,
    ): ManualMeasurementBatch? {
        val finalPoints = assemblePoints(tool, userPoints, measurements) ?: return null
        val primaryMeasurement = ManualMeasurementBuilder.build(
            toolId = tool.id,
            points = finalPoints,
            measurementKey = nextMeasurementKey(tool.id),
            standardDistanceMm = standardDistanceMm,
            standardDistancePoints = standardDistancePoints,
        ) ?: return null

        val accumulated = (measurements + primaryMeasurement).toMutableList()
        val autoCreated = mutableListOf<ImageAnalysisMeasurement>()

        ANNOTATION_TOOL_CATALOG.forEach { candidate ->
            if (candidate.pointsNeeded <= 0) return@forEach
            if (accumulated.any { it.type == candidate.measurementType }) return@forEach

            val inherited = getInheritedPoints(candidate.id, accumulated)
            if (inherited.count < candidate.pointsNeeded) return@forEach

            val autoPoints = inherited.points.take(candidate.pointsNeeded)
            val autoMeasurement = ManualMeasurementBuilder.build(
                toolId = candidate.id,
                points = autoPoints,
                measurementKey = nextMeasurementKey(candidate.id),
                standardDistanceMm = standardDistanceMm,
                standardDistancePoints = standardDistancePoints,
            ) ?: return@forEach

            accumulated += autoMeasurement
            autoCreated += autoMeasurement
        }

        return ManualMeasurementBatch(
            addedMeasurements = buildList {
                add(primaryMeasurement)
                addAll(autoCreated)
            },
            primaryMeasurement = primaryMeasurement,
            finalPoints = finalPoints,
        )
    }

    private fun assemblePoints(
        tool: AnnotationToolDefinition,
        userPoints: List<MeasurementPoint>,
        measurements: List<ImageAnalysisMeasurement>,
    ): List<MeasurementPoint>? {
        if (tool.pointsNeeded <= 0) return userPoints

        val inheritedMap = buildInheritedPointMap(tool.id, measurements)
        if (inheritedMap.isEmpty()) return userPoints

        val allPoints = MutableList<MeasurementPoint?>(tool.pointsNeeded) { null }
        var userPointIndex = 0

        for (index in 0 until tool.pointsNeeded) {
            val inheritedPoint = inheritedMap[index]
            allPoints[index] = inheritedPoint ?: userPoints.getOrNull(userPointIndex++)
        }

        return if (allPoints.any { it == null }) {
            null
        } else {
            allPoints.filterNotNull()
        }
    }
}
