package com.xiehe.spine.ui.motion

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.card.shared.OperationVerifyCard
import kotlinx.coroutines.delay

@Composable
fun AppModalHost(
    visible: Boolean,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    alignment: Alignment = Alignment.Center,
    scrimAlpha: Float = AppMotion.confirmScrimAlpha,
    dismissOnScrimTap: Boolean = true,
    onDismissed: (() -> Unit)? = null,
    enter: EnterTransition,
    exit: ExitTransition,
    content: @Composable () -> Unit,
) {
    var rendered by remember { mutableStateOf(visible) }
    var localVisible by remember { mutableStateOf(false) }

    LaunchedEffect(visible) {
        if (visible) {
            rendered = true
            delay(16)
            localVisible = true
        } else if (rendered) {
            localVisible = false
            delay(AppMotion.modalDismissDelayMillis)
            rendered = false
            onDismissed?.invoke()
        }
    }

    if (!rendered) {
        return
    }

    val overlayAlpha by animateFloatAsState(
        targetValue = if (visible) scrimAlpha.coerceIn(0f, 1f) else 0f,
        animationSpec = AppMotion.modalScrimSpec(),
        label = "app_modal_scrim_alpha",
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = overlayAlpha))
            .clickable(
                enabled = dismissOnScrimTap,
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onDismissRequest,
            ),
        contentAlignment = alignment,
    ) {
        AnimatedVisibility(
            visible = localVisible,
            enter = enter,
            exit = exit,
            label = "app_modal_visibility",
        ) {
            Box(
                modifier = Modifier.clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = {},
                ),
            ) {
                content()
            }
        }
    }
}

@Composable
fun AppBottomSheetHost(
    visible: Boolean,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    scrimAlpha: Float = AppMotion.bottomSheetScrimAlpha,
    dismissOnScrimTap: Boolean = true,
    onDismissed: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    AppModalHost(
        visible = visible,
        onDismissRequest = onDismissRequest,
        modifier = modifier,
        alignment = Alignment.BottomCenter,
        scrimAlpha = scrimAlpha,
        dismissOnScrimTap = dismissOnScrimTap,
        onDismissed = onDismissed,
        enter = fadeIn(animationSpec = AppMotion.confirmEnterSpec()) +
            slideInVertically(animationSpec = AppMotion.bottomSheetEnterSpec()) { it / 2 },
        exit = fadeOut(animationSpec = AppMotion.routeFadeOutSpec()) +
            slideOutVertically(animationSpec = AppMotion.bottomSheetExitSpec()) { it / 2 },
    ) {
        content()
    }
}

@Composable
fun AppConfirmDialogHost(
    visible: Boolean,
    title: String,
    message: String,
    onDismissRequest: () -> Unit,
    onConfirm: () -> Unit,
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(horizontal = 20.dp),
    confirmText: String = "确认",
    cancelText: String = "取消",
    confirmButtonColor: Color,
    cancelButtonColor: Color,
    confirmTextColor: Color,
    cancelTextColor: Color,
    dismissOnScrimTap: Boolean = true,
    onDismissed: (() -> Unit)? = null,
) {
    AppModalHost(
        visible = visible,
        onDismissRequest = onDismissRequest,
        modifier = modifier,
        alignment = Alignment.Center,
        dismissOnScrimTap = dismissOnScrimTap,
        onDismissed = onDismissed,
        enter = fadeIn(animationSpec = AppMotion.confirmEnterSpec()) +
            slideInVertically(animationSpec = AppMotion.confirmEnterOffsetSpec()) { it / 4 },
        exit = fadeOut(animationSpec = AppMotion.confirmExitSpec()) +
            slideOutVertically(animationSpec = AppMotion.confirmExitOffsetSpec()) { it / 5 },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(contentPadding),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OperationVerifyCard(
                title = title,
                message = message,
                confirmText = confirmText,
                cancelText = cancelText,
                confirmButtonColor = confirmButtonColor,
                cancelButtonColor = cancelButtonColor,
                confirmTextColor = confirmTextColor,
                cancelTextColor = cancelTextColor,
                onCancel = onDismissRequest,
                onConfirm = onConfirm,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
