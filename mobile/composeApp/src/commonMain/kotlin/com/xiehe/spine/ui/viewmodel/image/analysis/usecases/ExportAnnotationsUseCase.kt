package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.currentEpochSeconds
import kotlin.time.Instant
import kotlinx.serialization.json.Json

class ExportAnnotationsUseCase {
    private val jsonCodec = Json {
        ignoreUnknownKeys = true
        prettyPrint = true
        encodeDefaults = false
    }

    operator fun invoke(state: ImageAnalysisUiState): String {
        val payload = AnnotationPersistenceMapper.buildExportSnapshot(
            state = state,
            savedAt = Instant.fromEpochSeconds(currentEpochSeconds()).toString(),
        )
        return jsonCodec.encodeToString(payload)
    }
}
