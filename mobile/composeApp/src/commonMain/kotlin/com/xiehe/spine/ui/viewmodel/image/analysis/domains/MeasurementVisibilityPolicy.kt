package com.xiehe.spine.ui.viewmodel.image

object MeasurementVisibilityPolicy {
    fun toggle(hiddenKeys: Set<String>, key: String): Set<String> {
        val next = hiddenKeys.toMutableSet()
        if (!next.add(key)) {
            next.remove(key)
        }
        return next
    }

    fun setAllVisible(
        measurements: List<ImageAnalysisMeasurement>,
        visible: Boolean,
    ): Set<String> {
        return if (visible) {
            emptySet()
        } else {
            measurements.mapTo(mutableSetOf()) { it.key }
        }
    }

    fun setKindVisible(
        measurements: List<ImageAnalysisMeasurement>,
        hiddenKeys: Set<String>,
        kind: AnalysisMeasurementKind,
        visible: Boolean,
    ): Set<String> {
        val targetKeys = measurements
            .filter { it.kind == kind && it.panelVisible }
            .map { it.key }
        if (targetKeys.isEmpty()) return hiddenKeys
        val hidden = hiddenKeys.toMutableSet()
        if (visible) {
            hidden.removeAll(targetKeys.toSet())
        } else {
            hidden.addAll(targetKeys)
        }
        return hidden
    }
}
