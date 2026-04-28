package com.xiehe.spine.ui.screens.image

import com.xiehe.spine.notifySessionExpired
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.core.model.AppResult
import com.xiehe.spine.core.store.UserSession
import com.xiehe.spine.data.image.ImageFileRepository
import com.xiehe.spine.data.image.ImageFileSummary
import com.xiehe.spine.ui.components.card.shared.Card
import com.xiehe.spine.ui.components.form.file.FileSaveResult
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.components.icon.shared.AppIcon
import com.xiehe.spine.ui.components.card.image.ImageTaskAction
import com.xiehe.spine.ui.components.card.image.ImageTaskActionStyle
import com.xiehe.spine.ui.components.card.image.ImageTaskCard
import com.xiehe.spine.ui.components.feedback.shared.FloatingToast
import com.xiehe.spine.ui.components.feedback.shared.LoadingOverlay
import com.xiehe.spine.ui.components.form.picker.OptionPickerOverlay
import com.xiehe.spine.ui.components.text.shared.Text
import com.xiehe.spine.ui.components.form.input.TextField
import com.xiehe.spine.ui.components.card.image.inferExamType
import com.xiehe.spine.ui.components.form.file.rememberDownloadedFileSaver
import com.xiehe.spine.ui.motion.AppConfirmDialogHost
import com.xiehe.spine.ui.theme.SpineTheme
import com.xiehe.spine.ui.viewmodel.image.ImageStatusFilter
import com.xiehe.spine.ui.viewmodel.image.ImageTypeFilter
import com.xiehe.spine.ui.viewmodel.image.ImagesViewModel
import kotlinx.coroutines.launch

private enum class ImagesPicker {
    TYPE,
    STATUS,
}

private data class DownloadToastState(
    val id: Int,
    val message: String,
)

@Composable
fun ImagesScreen(
    vm: ImagesViewModel,
    session: UserSession,
    repository: ImageFileRepository,
    onSessionUpdated: (UserSession) -> Unit,
    onSessionExpired: (String) -> Unit = {},
    showInlineSearch: Boolean = true,
    onOpenAnalysis: (Int, Int?, String) -> Unit = { _, _, _ -> },
) {
    val state by vm.state.collectAsState()
    var picker by remember { mutableStateOf<ImagesPicker?>(null) }
    var pendingDeleteItem by remember { mutableStateOf<ImageFileSummary?>(null) }
    var deleteDialogVisible by remember { mutableStateOf(false) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var actionSuccess by remember { mutableStateOf<String?>(null) }
    var actionLoadingMessage by remember { mutableStateOf<String?>(null) }
    var downloadToast by remember { mutableStateOf<DownloadToastState?>(null) }
    var nextDownloadToastId by remember { mutableStateOf(0) }
    val coroutineScope = rememberCoroutineScope()
    val saver = rememberDownloadedFileSaver()

    LaunchedEffect(session.accessToken) {
        vm.refreshIfNeeded(
            session = session,
            onSessionUpdated = onSessionUpdated,
            onSessionExpired = onSessionExpired,
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SpineTheme.colors.background),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (showInlineSearch) {
                TextField(
                    value = state.search,
                    onValueChange = vm::updateSearch,
                    placeholder = "搜索患者姓名、影像类别或文件名",
                    modifier = Modifier.fillMaxWidth(),
                    leadingGlyph = IconToken.SEARCH,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    text = state.typeFilter.label,
                    active = state.typeFilter != ImageTypeFilter.ALL,
                    glyph = IconToken.IMAGE,
                    onClick = { picker = ImagesPicker.TYPE },
                    modifier = Modifier.width(110.dp),
                )
                FilterChip(
                    text = state.statusFilter.label,
                    active = state.statusFilter != ImageStatusFilter.ALL,
                    glyph = IconToken.CHECK,
                    onClick = { picker = ImagesPicker.STATUS },
                    modifier = Modifier.width(110.dp),
                )
            }

            state.errorMessage?.let {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Text(text = it, style = SpineTheme.typography.subhead.copy(color = SpineTheme.colors.error))
                }
            }
            actionError?.let {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Text(text = it, style = SpineTheme.typography.subhead.copy(color = SpineTheme.colors.error))
                }
            }
            actionSuccess?.let {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Text(text = it, style = SpineTheme.typography.subhead.copy(color = SpineTheme.colors.success))
                }
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(state.filteredItems, key = { it.id }) { file ->
                    ImageTaskCard(
                        item = file,
                        session = session,
                        repository = repository,
                        onSessionUpdated = onSessionUpdated,
                        compactActionText = true,
                        actions = listOf(
                            ImageTaskAction(
                                text = "标注分析",
                                glyph = IconToken.MAGIC_WAND,
                                style = ImageTaskActionStyle.PRIMARY,
                                onClick = {
                                    onOpenAnalysis(
                                        file.id,
                                        file.patientId,
                                        inferExamType(file),
                                    )
                                },
                            ),
                            ImageTaskAction(
                                text = "下载",
                                glyph = IconToken.DOWNLOAD,
                                style = ImageTaskActionStyle.OUTLINE,
                                onClick = {
                                    coroutineScope.launch {
                                        actionError = null
                                        actionSuccess = null
                                        actionLoadingMessage = "...正在下载中"
                                        when (val result = repository.downloadImageBytes(session, file.id)) {
                                            is AppResult.Success -> {
                                                val activeSession = result.data.first
                                                onSessionUpdated(activeSession)
                                                val saveResult = saver.save(
                                                    fileName = file.originalFilename.ifBlank { "image_${file.id}.png" },
                                                    mimeType = file.mimeType ?: "image/png",
                                                    bytes = result.data.second,
                                                )
                                                when (saveResult) {
                                                    is FileSaveResult.Success -> {
                                                        val downloadHint = buildString {
                                                            append(file.originalFilename)
                                                            if (saveResult.location.isNullOrBlank()) {
                                                                append("已下载")
                                                            } else {
                                                                append("已下载到")
                                                                append(saveResult.location)
                                                            }
                                                        }
                                                        downloadToast = DownloadToastState(
                                                            id = nextDownloadToastId + 1,
                                                            message = downloadHint,
                                                        )
                                                        nextDownloadToastId += 1
                                                    }

                                                    is FileSaveResult.Failure -> {
                                                        actionError = saveResult.message
                                                    }
                                                }
                                            }

                                            is AppResult.Failure -> {
                                                if (result.notifySessionExpired(onSessionExpired)) {
                                                    actionError = null
                                                } else {
                                                    actionError = result.message
                                                }
                                            }
                                        }
                                        actionLoadingMessage = null
                                    }
                                },
                            ),
                            ImageTaskAction(
                                text = "删除",
                                glyph = IconToken.DELETE,
                                style = ImageTaskActionStyle.DANGER,
                                onClick = {
                                    pendingDeleteItem = file
                                    deleteDialogVisible = true
                                    actionError = null
                                    actionSuccess = null
                                },
                            ),
                        ),
                    )
                }

                item {
                    if (state.loading) {
                        Text(
                            text = "加载中...",
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            style = SpineTheme.typography.subhead,
                        )
                    } else if (state.filteredItems.isEmpty() && state.errorMessage == null) {
                        Text(
                            text = "暂无影像数据",
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            style = SpineTheme.typography.subhead,
                            color = SpineTheme.colors.textSecondary,
                        )
                    }
                }
            }
        }

        if ((state.loading && state.filteredItems.isEmpty()) || actionLoadingMessage != null) {
            LoadingOverlay(message = actionLoadingMessage ?: "...正在加载中")
        }

        downloadToast?.let { toast ->
            key(toast.id) {
                FloatingToast(
                    message = toast.message,
                    accentColor = SpineTheme.colors.info,
                    icon = IconToken.DOWNLOAD,
                    onDismiss = { downloadToast = null },
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 24.dp),
                )
            }
        }

        pendingDeleteItem?.let { item ->
            AppConfirmDialogHost(
                visible = deleteDialogVisible,
                title = "删除影像",
                message = "确认删除影像“${item.originalFilename}”吗？该操作不可恢复。",
                confirmText = "删除",
                cancelText = "取消",
                confirmButtonColor = SpineTheme.colors.error,
                cancelButtonColor = SpineTheme.colors.textSecondary,
                confirmTextColor = SpineTheme.colors.onPrimary,
                cancelTextColor = SpineTheme.colors.onPrimary,
                onDismissRequest = { deleteDialogVisible = false },
                onDismissed = {
                    if (!deleteDialogVisible) {
                        pendingDeleteItem = null
                    }
                },
                onConfirm = {
                    coroutineScope.launch {
                        deleteDialogVisible = false
                        actionError = null
                        actionSuccess = null
                        actionLoadingMessage = "...正在删除中"
                        when (val result = repository.deleteImageFile(session, item.id)) {
                            is AppResult.Success -> {
                                val activeSession = result.data.first
                                onSessionUpdated(activeSession)
                                vm.refresh(
                                    session = activeSession,
                                    onSessionUpdated = onSessionUpdated,
                                    onSessionExpired = onSessionExpired,
                                )
                                actionSuccess = result.data.second
                            }

                            is AppResult.Failure -> {
                                if (result.notifySessionExpired(onSessionExpired)) {
                                    actionError = null
                                } else {
                                    actionError = result.message
                                }
                            }
                        }
                        actionLoadingMessage = null
                    }
                },
            )
        }
    }

    when (picker) {
        ImagesPicker.TYPE -> OptionPickerOverlay(
            title = "选择影像类别",
            options = ImageTypeFilter.entries.map { it.label },
            selected = state.typeFilter.label,
            onDismiss = { picker = null },
            onSelect = { selected ->
                ImageTypeFilter.entries.firstOrNull { it.label == selected }?.let(vm::updateTypeFilter)
                picker = null
            },
        )

        ImagesPicker.STATUS -> OptionPickerOverlay(
            title = "选择影像状态",
            options = ImageStatusFilter.entries.map { it.label },
            selected = state.statusFilter.label,
            onDismiss = { picker = null },
            onSelect = { selected ->
                ImageStatusFilter.entries.firstOrNull { it.label == selected }?.let(vm::updateStatusFilter)
                picker = null
            },
        )

        null -> Unit
    }
}

@Composable
private fun FilterChip(
    text: String,
    active: Boolean,
    glyph: IconToken,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = SpineTheme.colors
    val shape = RoundedCornerShape(SpineTheme.radius.full)
    Row(
        modifier = modifier
            .height(40.dp)
            .clip(shape)
            .border(
                width = 1.dp,
                color = if (active) colors.primary.copy(alpha = 0.28f) else colors.borderSubtle,
                shape = shape,
            )
            .background(
                if (active) colors.primaryMuted else colors.surface,
                shape,
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        AppIcon(
            glyph = glyph,
            tint = if (active) colors.primary else colors.textSecondary,
            modifier = Modifier.size(16.dp),
        )
        Text(
            text = text,
            style = SpineTheme.typography.body.copy(fontWeight = FontWeight.SemiBold),
            color = if (active) colors.primary else colors.textSecondary,
            maxLines = 1,
        )
    }
}
