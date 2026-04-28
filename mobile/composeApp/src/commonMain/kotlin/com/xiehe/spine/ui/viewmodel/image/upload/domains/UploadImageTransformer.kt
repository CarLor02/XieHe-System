package com.xiehe.spine.ui.viewmodel.image

data class ImageCropArea(
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float,
)

data class ImageTransformOutput(
    val bytes: ByteArray,
    val mimeType: String,
)

expect object UploadImageTransformer {
    suspend fun flipHorizontally(
        bytes: ByteArray,
        mimeType: String,
    ): ImageTransformOutput?

    suspend fun crop(
        bytes: ByteArray,
        mimeType: String,
        area: ImageCropArea,
    ): ImageTransformOutput?
}
