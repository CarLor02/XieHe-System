package com.xiehe.spine.ui.viewmodel.image

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.convert
import kotlinx.cinterop.useContents
import kotlinx.cinterop.usePinned
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import platform.CoreGraphics.CGContextScaleCTM
import platform.CoreGraphics.CGContextTranslateCTM
import platform.CoreGraphics.CGImageCreateWithImageInRect
import platform.CoreGraphics.CGImageGetHeight
import platform.CoreGraphics.CGImageGetWidth
import platform.CoreGraphics.CGRectMake
import platform.Foundation.NSData
import platform.Foundation.create
import platform.UIKit.UIGraphicsBeginImageContextWithOptions
import platform.UIKit.UIGraphicsEndImageContext
import platform.UIKit.UIGraphicsGetCurrentContext
import platform.UIKit.UIGraphicsGetImageFromCurrentImageContext
import platform.UIKit.UIImage
import platform.UIKit.UIImageJPEGRepresentation
import platform.UIKit.UIImageOrientationUp
import platform.UIKit.UIImagePNGRepresentation
import platform.posix.memcpy
import kotlin.math.roundToInt

actual object UploadImageTransformer {
    actual suspend fun flipHorizontally(
        bytes: ByteArray,
        mimeType: String,
    ): ImageTransformOutput? = withContext(Dispatchers.Default) {
        val image = UIImage(data = bytes.toNSData()) ?: return@withContext null
        val imageSize = image.size
        UIGraphicsBeginImageContextWithOptions(imageSize, false, image.scale)
        val context = UIGraphicsGetCurrentContext()
        if (context == null) {
            UIGraphicsEndImageContext()
            return@withContext null
        }
        imageSize.useContents {
            CGContextTranslateCTM(context, width, 0.0)
            CGContextScaleCTM(context, -1.0, 1.0)
            image.drawInRect(CGRectMake(0.0, 0.0, width, height))
        }
        val flipped = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        flipped?.encode(mimeType)
    }

    actual suspend fun crop(
        bytes: ByteArray,
        mimeType: String,
        area: ImageCropArea,
    ): ImageTransformOutput? = withContext(Dispatchers.Default) {
        val image = UIImage(data = bytes.toNSData()) ?: return@withContext null
        val cgImage = image.CGImage ?: return@withContext null
        val pixelWidth = CGImageGetWidth(cgImage).toDouble()
        val pixelHeight = CGImageGetHeight(cgImage).toDouble()
        val sourceX = (area.x.coerceIn(0f, 1f) * pixelWidth).roundToInt().coerceIn(0, pixelWidth.toInt() - 1)
        val sourceY = (area.y.coerceIn(0f, 1f) * pixelHeight).roundToInt().coerceIn(0, pixelHeight.toInt() - 1)
        val sourceWidth = (area.width.coerceIn(0.01f, 1f) * pixelWidth)
            .roundToInt()
            .coerceIn(1, pixelWidth.toInt() - sourceX)
        val sourceHeight = (area.height.coerceIn(0.01f, 1f) * pixelHeight)
            .roundToInt()
            .coerceIn(1, pixelHeight.toInt() - sourceY)
        val croppedCgImage = CGImageCreateWithImageInRect(
            cgImage,
            CGRectMake(
                sourceX.toDouble(),
                sourceY.toDouble(),
                sourceWidth.toDouble(),
                sourceHeight.toDouble(),
            ),
        ) ?: return@withContext null
        UIImage.imageWithCGImage(croppedCgImage, image.scale, UIImageOrientationUp).encode(mimeType)
    }
}

@OptIn(ExperimentalForeignApi::class)
private fun ByteArray.toNSData(): NSData {
    return usePinned { pinned ->
        NSData.create(bytes = pinned.addressOf(0), length = size.convert())
    }
}

@OptIn(ExperimentalForeignApi::class)
private fun NSData.toByteArray(): ByteArray {
    val length = length.toInt()
    if (length <= 0) return ByteArray(0)
    val source = bytes ?: return ByteArray(0)
    return ByteArray(length).also { target ->
        target.usePinned { pinned ->
            memcpy(pinned.addressOf(0), source, length.convert())
        }
    }
}

private fun UIImage.encode(requestedMimeType: String): ImageTransformOutput? {
    val normalizedMimeType = requestedMimeType.lowercase()
    val encoded = if (normalizedMimeType == "image/jpeg" || normalizedMimeType == "image/jpg") {
        UIImageJPEGRepresentation(this, 0.92)
    } else {
        UIImagePNGRepresentation(this)
    } ?: return null
    val outputMimeType = if (normalizedMimeType == "image/jpeg" || normalizedMimeType == "image/jpg") {
        "image/jpeg"
    } else {
        "image/png"
    }
    return ImageTransformOutput(bytes = encoded.toByteArray(), mimeType = outputMimeType)
}
