package com.xiehe.spine.ui.components.form.file

import kotlinx.cinterop.BetaInteropApi
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.convert
import kotlinx.cinterop.usePinned
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import platform.Foundation.NSTemporaryDirectory
import platform.Foundation.NSURL
import platform.UIKit.UIActivityViewController
import platform.UIKit.UIApplication
import platform.UIKit.UIDocumentPickerDelegateProtocol
import platform.UIKit.UIDocumentPickerViewController
import platform.UIKit.UIViewController
import platform.UniformTypeIdentifiers.UTTypeImage
import platform.UniformTypeIdentifiers.UTTypeJSON
import platform.UniformTypeIdentifiers.UTTypePlainText
import platform.darwin.NSObject
import platform.posix.SEEK_END
import platform.posix.fclose
import platform.posix.fopen
import platform.posix.fread
import platform.posix.fseek
import platform.posix.ftell
import platform.posix.fwrite
import platform.posix.rewind

private const val fallbackImageName = "upload_image.png"
private const val fallbackJsonName = "annotations.json"

private object IosDocumentPresenter {
    var currentDelegate: NSObject? = null
}

private fun topViewController(): UIViewController? {
    var controller = UIApplication.sharedApplication.keyWindow?.rootViewController
    while (controller?.presentedViewController != null) {
        controller = controller.presentedViewController
    }
    return controller
}

private fun fileNameFromUrl(url: NSURL?, fallback: String): String {
    val path = url?.lastPathComponent
    return if (path.isNullOrBlank()) fallback else path
}

@OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)
private fun readBinaryFile(path: String): ByteArray? {
    val file = fopen(path, "rb") ?: return null
    return try {
        fseek(file, 0, SEEK_END)
        val size = ftell(file).toInt()
        rewind(file)
        if (size <= 0) {
            return ByteArray(0)
        }
        ByteArray(size).also { buffer ->
            buffer.usePinned { pinned ->
                fread(pinned.addressOf(0), 1.convert(), size.convert(), file)
            }
        }
    } finally {
        fclose(file)
    }
}

private fun imageMimeType(fileName: String): String {
    return when (fileName.substringAfterLast('.', "").lowercase()) {
        "jpg", "jpeg" -> "image/jpeg"
        "heic" -> "image/heic"
        "webp" -> "image/webp"
        else -> "image/png"
    }
}

private fun readImageFile(url: NSURL): LocalImageFile? {
    val path = url.path ?: return null
    val bytes = readBinaryFile(path) ?: return null
    if (bytes.isEmpty()) {
        return null
    }
    val name = fileNameFromUrl(url, fallbackImageName)
    return LocalImageFile(
        name = name,
        mimeType = imageMimeType(name),
        bytes = bytes,
    )
}

private fun readJsonFile(url: NSURL): LocalJsonFile? {
    val path = url.path ?: return null
    val bytes = readBinaryFile(path) ?: return null
    if (bytes.isEmpty()) {
        return null
    }
    val text = bytes.decodeToString()
    if (text.isBlank()) {
        return null
    }
    return LocalJsonFile(
        name = fileNameFromUrl(url, fallbackJsonName),
        mimeType = "application/json",
        text = text,
    )
}

private class IosDocumentPickerDelegate(
    private val onUrlsPicked: (List<NSURL>) -> Unit,
    private val onCancelled: () -> Unit,
) : NSObject(), UIDocumentPickerDelegateProtocol {
    override fun documentPickerWasCancelled(controller: UIDocumentPickerViewController) {
        onCancelled()
    }

    override fun documentPicker(
        controller: UIDocumentPickerViewController,
        didPickDocumentsAtURLs: List<*>,
    ) {
        onUrlsPicked(didPickDocumentsAtURLs.filterIsInstance<NSURL>())
    }
}

private fun presentDocumentPicker(
    contentTypes: List<Any>,
    onUrlsPicked: (List<NSURL>) -> Unit,
    onCancelled: () -> Unit,
) {
    val presenter = topViewController()
    if (presenter == null) {
        onCancelled()
        return
    }
    val picker = UIDocumentPickerViewController(
        forOpeningContentTypes = contentTypes,
        asCopy = true,
    )
    val delegate = IosDocumentPickerDelegate(
        onUrlsPicked = { urls ->
            IosDocumentPresenter.currentDelegate = null
            onUrlsPicked(urls)
        },
        onCancelled = {
            IosDocumentPresenter.currentDelegate = null
            onCancelled()
        },
    )
    picker.delegate = delegate
    IosDocumentPresenter.currentDelegate = delegate
    presenter.presentViewController(picker, animated = true, completion = null)
}

internal fun launchIosImagePicker(onFilePicked: (LocalImageFile?) -> Unit) {
    presentDocumentPicker(
        contentTypes = listOf(UTTypeImage),
        onUrlsPicked = { urls -> onFilePicked(urls.firstOrNull()?.let(::readImageFile)) },
        onCancelled = { onFilePicked(null) },
    )
}

internal fun launchIosJsonPicker(onFilePicked: (LocalJsonFile?) -> Unit) {
    presentDocumentPicker(
        contentTypes = listOf(UTTypeJSON, UTTypePlainText),
        onUrlsPicked = { urls -> onFilePicked(urls.firstOrNull()?.let(::readJsonFile)) },
        onCancelled = { onFilePicked(null) },
    )
}

@OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)
private fun writeTempFile(fileName: String, bytes: ByteArray): String? {
    val safeName = fileName.replace("/", "_")
    val path = NSTemporaryDirectory() + safeName
    val file = fopen(path, "wb") ?: return null
    return try {
        if (bytes.isNotEmpty()) {
            bytes.usePinned { pinned ->
                fwrite(pinned.addressOf(0), 1.convert(), bytes.size.convert(), file)
            }
        }
        path
    } finally {
        fclose(file)
    }
}

internal suspend fun shareFileOnIos(
    fileName: String,
    bytes: ByteArray,
): FileSaveResult = withContext(Dispatchers.Main) {
    val presenter = topViewController() ?: return@withContext FileSaveResult.Failure("无法打开系统共享面板")
    val path = writeTempFile(fileName, bytes) ?: return@withContext FileSaveResult.Failure("创建临时文件失败")
    val url = NSURL.fileURLWithPath(path)
    val controller = UIActivityViewController(
        activityItems = listOf(url),
        applicationActivities = null,
    )
    presenter.presentViewController(controller, animated = true, completion = null)
    FileSaveResult.Success("系统共享面板")
}
