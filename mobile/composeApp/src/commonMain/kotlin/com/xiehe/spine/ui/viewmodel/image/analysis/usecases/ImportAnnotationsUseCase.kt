package com.xiehe.spine.ui.viewmodel.image

import kotlinx.serialization.json.Json

class ImportAnnotationsUseCase {
    private val jsonCodec = Json {
        ignoreUnknownKeys = true
        prettyPrint = true
        encodeDefaults = false
    }

    operator fun invoke(json: String): Result<ImportedAnnotations> {
        return runCatching { jsonCodec.decodeFromString<ExportAnnotationSnapshot>(json) }
            .map(AnnotationPersistenceMapper::importSnapshot)
    }
}
