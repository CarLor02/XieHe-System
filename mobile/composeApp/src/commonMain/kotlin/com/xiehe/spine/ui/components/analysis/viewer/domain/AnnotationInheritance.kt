package com.xiehe.spine.ui.components.analysis.viewer.domain

import com.xiehe.spine.data.measurement.MeasurementPoint
import com.xiehe.spine.ui.components.analysis.viewer.AnnotationMeasurement
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_C7_OFFSET
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_CL
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LL_L1_L4
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LL_L1_S1
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_LL_L4_S1
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PI
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_PT
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SACRAL
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SS
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_SVA
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TPA
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_TS

internal data class PointInheritanceRule(
    val fromType: String,
    val sourcePointIndices: List<Int>,
    val destinationPointIndices: List<Int>,
)

internal data class SharedAnatomicalPoint(
    val participants: List<SharedAnatomicalPointParticipant>,
)

internal data class SharedAnatomicalPointParticipant(
    val toolId: String,
    val typeName: String,
    val pointIndex: Int,
)

data class InheritedPointsResult(
    val points: List<MeasurementPoint>,
    val count: Int,
)

private val pointInheritanceRules = mapOf(
    TOOL_C7_OFFSET to listOf(
        PointInheritanceRule(
            fromType = "Sacral",
            sourcePointIndices = listOf(0, 1),
            destinationPointIndices = listOf(4, 5),
        ),
    ),
    TOOL_TS to listOf(
        PointInheritanceRule(
            fromType = "Sacral",
            sourcePointIndices = listOf(0, 1),
            destinationPointIndices = listOf(2, 3),
        ),
    ),
    TOOL_SACRAL to listOf(
        PointInheritanceRule(
            fromType = "TS(Trunk Shift)",
            sourcePointIndices = listOf(4, 5),
            destinationPointIndices = listOf(0, 1),
        ),
        PointInheritanceRule(
            fromType = "TTS",
            sourcePointIndices = listOf(2, 3),
            destinationPointIndices = listOf(0, 1),
        ),
    ),
    TOOL_SVA to listOf(
        PointInheritanceRule(
            fromType = "C2-C7 CL",
            sourcePointIndices = listOf(2, 3),
            destinationPointIndices = listOf(0, 1),
        ),
        PointInheritanceRule(
            fromType = "SS",
            sourcePointIndices = listOf(1),
            destinationPointIndices = listOf(4),
        ),
    ),
    TOOL_CL to listOf(
        PointInheritanceRule(
            fromType = "SVA",
            sourcePointIndices = listOf(0, 1),
            destinationPointIndices = listOf(2, 3),
        ),
    ),
    TOOL_SS to listOf(
        PointInheritanceRule(
            fromType = "SVA",
            sourcePointIndices = listOf(4),
            destinationPointIndices = listOf(1),
        ),
    ),
)

private val sharedAnatomicalPointGroups = listOf(
    SharedAnatomicalPoint(
        participants = listOf(
            SharedAnatomicalPointParticipant(TOOL_LL_L1_L4, "LL L1-L4", 0),
            SharedAnatomicalPointParticipant(TOOL_LL_L1_S1, "LL L1-S1", 0),
        ),
    ),
    SharedAnatomicalPoint(
        participants = listOf(
            SharedAnatomicalPointParticipant(TOOL_LL_L1_L4, "LL L1-L4", 1),
            SharedAnatomicalPointParticipant(TOOL_LL_L1_S1, "LL L1-S1", 1),
        ),
    ),
    SharedAnatomicalPoint(
        participants = listOf(
            SharedAnatomicalPointParticipant(TOOL_LL_L1_S1, "LL L1-S1", 2),
            SharedAnatomicalPointParticipant(TOOL_LL_L4_S1, "LL L4-S1", 2),
            SharedAnatomicalPointParticipant(TOOL_TPA, "TPA", 5),
            SharedAnatomicalPointParticipant(TOOL_PI, "PI", 1),
            SharedAnatomicalPointParticipant(TOOL_PT, "PT", 1),
            SharedAnatomicalPointParticipant(TOOL_SS, "SS", 0),
        ),
    ),
    SharedAnatomicalPoint(
        participants = listOf(
            SharedAnatomicalPointParticipant(TOOL_LL_L1_S1, "LL L1-S1", 3),
            SharedAnatomicalPointParticipant(TOOL_LL_L4_S1, "LL L4-S1", 3),
            SharedAnatomicalPointParticipant(TOOL_TPA, "TPA", 6),
            SharedAnatomicalPointParticipant(TOOL_PI, "PI", 2),
            SharedAnatomicalPointParticipant(TOOL_PT, "PT", 2),
            SharedAnatomicalPointParticipant(TOOL_SS, "SS", 1),
        ),
    ),
    SharedAnatomicalPoint(
        participants = listOf(
            SharedAnatomicalPointParticipant(TOOL_TPA, "TPA", 4),
            SharedAnatomicalPointParticipant(TOOL_PI, "PI", 0),
            SharedAnatomicalPointParticipant(TOOL_PT, "PT", 0),
        ),
    ),
)

fun buildInheritedPointMap(
    toolId: String,
    measurements: List<AnnotationMeasurement>,
): Map<Int, MeasurementPoint> {
    val inherited = linkedMapOf<Int, MeasurementPoint>()

    pointInheritanceRules[toolId].orEmpty().forEach { rule ->
        val source = findMeasurementForInheritance(rule.fromType, measurements) ?: return@forEach
        rule.sourcePointIndices.indices.forEach { index ->
            val sourceIndex = rule.sourcePointIndices[index]
            val destinationIndex = rule.destinationPointIndices[index]
            source.points.getOrNull(sourceIndex)?.let { point ->
                inherited[destinationIndex] = point
            }
        }
    }

    sharedAnatomicalPointGroups.forEach { group ->
        val ownParticipant = group.participants.firstOrNull { it.toolId == toolId } ?: return@forEach
        if (inherited.containsKey(ownParticipant.pointIndex)) return@forEach

        for (participant in group.participants) {
            if (participant.toolId == toolId) continue
            val source = findMeasurementForInheritance(participant.typeName, measurements) ?: continue
            val sourcePoint = source.points.getOrNull(participant.pointIndex) ?: continue
            inherited[ownParticipant.pointIndex] = sourcePoint
            break
        }
    }

    return inherited.toSortedMap()
}

fun getInheritedPoints(
    toolId: String,
    measurements: List<AnnotationMeasurement>,
): InheritedPointsResult {
    val inheritedMap = buildInheritedPointMap(toolId, measurements)
    return InheritedPointsResult(
        points = inheritedMap.values.toList(),
        count = inheritedMap.size,
    )
}

fun getEffectivePointsNeeded(
    toolId: String,
    totalPointsNeeded: Int,
    measurements: List<AnnotationMeasurement>,
): Int {
    return (totalPointsNeeded - buildInheritedPointMap(toolId, measurements).size).coerceAtLeast(0)
}

private fun findMeasurementForInheritance(
    expectedType: String,
    measurements: List<AnnotationMeasurement>,
): AnnotationMeasurement? {
    return measurements.firstOrNull { measurement ->
        when (expectedType) {
            "TTS" -> measurement.type == "TS" || (measurement.type == "TTS" && measurement.points.size < 6)
            "TS(Trunk Shift)" -> measurement.type == "TS(Trunk Shift)" || (measurement.type == "TTS" && measurement.points.size >= 6)
            else -> measurement.type == expectedType
        }
    }
}
