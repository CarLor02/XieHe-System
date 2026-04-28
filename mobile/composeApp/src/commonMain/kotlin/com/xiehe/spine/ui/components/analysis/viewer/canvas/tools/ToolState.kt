package com.xiehe.spine.ui.components.analysis.viewer.canvas.tools

import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_ARROW
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_BOX
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_CIRCLE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_ELLIPSE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_HORIZONTAL_LINE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_ANGLE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_LENGTH
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_POLYGON
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_AUX_VERTICAL_LINE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_MOVE
import com.xiehe.spine.ui.components.analysis.viewer.catalog.TOOL_VERTEBRA_CENTER
import com.xiehe.spine.ui.components.analysis.viewer.catalog.getAnnotationTool

private val auxiliaryToolIds = setOf(
    TOOL_AUX_CIRCLE,
    TOOL_AUX_ELLIPSE,
    TOOL_AUX_BOX,
    TOOL_AUX_ARROW,
    TOOL_AUX_POLYGON,
    TOOL_VERTEBRA_CENTER,
    TOOL_AUX_LENGTH,
    TOOL_AUX_ANGLE,
    TOOL_AUX_HORIZONTAL_LINE,
    TOOL_AUX_VERTICAL_LINE,
)

fun isMoveTool(toolId: String): Boolean = toolId == TOOL_MOVE

fun isAuxiliaryTool(toolId: String): Boolean = toolId in auxiliaryToolIds

fun supportsDoubleTapFinish(toolId: String): Boolean {
    return getAnnotationTool(toolId)?.supportsDoubleTapFinish == true
}

fun shouldClearToolState(oldToolId: String, newToolId: String): Boolean {
    if (oldToolId == newToolId) return false
    return isAuxiliaryTool(oldToolId) || isAuxiliaryTool(newToolId)
}
