package com.xiehe.spine.ui.viewmodel.image

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import kotlin.math.roundToInt

actual object UploadImageTransformer {
    actual suspend fun flipHorizontally(
        bytes: ByteArray,
        mimeType: String,
    ): ImageTransformOutput? = withContext(Dispatchers.Default) {
        val source = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return@withContext null
        val matrix = Matrix().apply { preScale(-1f, 1f) }
        val flipped = Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
        encodeBitmap(flipped, mimeType).also {
            if (flipped !== source) flipped.recycle()
            source.recycle()
        }
    }

    actual suspend fun crop(
        bytes: ByteArray,
        mimeType: String,
        area: ImageCropArea,
    ): ImageTransformOutput? = withContext(Dispatchers.Default) {
        val source = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return@withContext null
        val sourceX = (area.x.coerceIn(0f, 1f) * source.width).roundToInt().coerceIn(0, source.width - 1)
        val sourceY = (area.y.coerceIn(0f, 1f) * source.height).roundToInt().coerceIn(0, source.height - 1)
        val sourceWidth = (area.width.coerceIn(0.01f, 1f) * source.width)
            .roundToInt()
            .coerceIn(1, source.width - sourceX)
        val sourceHeight = (area.height.coerceIn(0.01f, 1f) * source.height)
            .roundToInt()
            .coerceIn(1, source.height - sourceY)
        val cropped = Bitmap.createBitmap(source, sourceX, sourceY, sourceWidth, sourceHeight)
        encodeBitmap(cropped, mimeType).also {
            if (cropped !== source) cropped.recycle()
            source.recycle()
        }
    }
}

private fun encodeBitmap(
    bitmap: Bitmap,
    requestedMimeType: String,
): ImageTransformOutput? {
    val normalizedMimeType = requestedMimeType.lowercase()
    val format = when (normalizedMimeType) {
        "image/jpeg", "image/jpg" -> Bitmap.CompressFormat.JPEG
        "image/png" -> Bitmap.CompressFormat.PNG
        else -> Bitmap.CompressFormat.PNG
    }
    val outputMimeType = when (format) {
        Bitmap.CompressFormat.JPEG -> "image/jpeg"
        else -> "image/png"
    }
    val quality = if (format == Bitmap.CompressFormat.JPEG) 92 else 100
    return ByteArrayOutputStream().use { stream ->
        if (!bitmap.compress(format, quality, stream)) {
            null
        } else {
            ImageTransformOutput(bytes = stream.toByteArray(), mimeType = outputMimeType)
        }
    }
}
