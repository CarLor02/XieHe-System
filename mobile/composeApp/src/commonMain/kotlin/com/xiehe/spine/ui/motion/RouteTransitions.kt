package com.xiehe.spine.ui.motion

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import kotlinx.coroutines.delay

fun appRouteContentTransition(
    initialOrder: Int,
    targetOrder: Int,
): ContentTransform {
    val direction = if (targetOrder >= initialOrder) 1 else -1
    return (
        fadeIn(animationSpec = AppMotion.routeFadeInSpec()) +
            slideInHorizontally(animationSpec = AppMotion.routeSlideInSpec()) { full ->
                direction * full / 6
            }
        ).togetherWith(
            fadeOut(animationSpec = AppMotion.routeFadeOutSpec()) +
                slideOutHorizontally(animationSpec = AppMotion.routeSlideOutSpec()) { full ->
                    -direction * full / 7
                },
        )
}

fun <T> AppRouteTransition(
    initialState: T,
    targetState: T,
    orderOf: (T) -> Int,
): ContentTransform = appRouteContentTransition(
    initialOrder = orderOf(initialState),
    targetOrder = orderOf(targetState),
)

fun overlayEntryEnterTransition(): EnterTransition =
    fadeIn(animationSpec = AppMotion.routeFadeInSpec()) +
        slideInHorizontally(animationSpec = AppMotion.routeSlideInSpec()) { full -> full / 5 }

fun overlayEntryExitTransition(): ExitTransition =
    fadeOut(animationSpec = AppMotion.instantSpec())

@Composable
fun AppOverlayEntryHost(
    visible: Boolean = true,
    modifier: Modifier = Modifier,
    onExited: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    var localVisible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (visible) {
            localVisible = true
        }
    }

    LaunchedEffect(visible) {
        if (visible) {
            localVisible = true
        } else {
            localVisible = false
            delay(maxOf(AppMotion.routeFadeOutMillis, AppMotion.routeSlideOutMillis).toLong())
            onExited?.invoke()
        }
    }

    AnimatedVisibility(
        visible = localVisible,
        modifier = modifier,
        enter = overlayEntryEnterTransition(),
        exit = fadeOut(animationSpec = AppMotion.routeFadeOutSpec()) +
            slideOutHorizontally(animationSpec = AppMotion.routeSlideOutSpec()) { full -> full / 6 },
        label = "app_overlay_entry_host",
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            content()
        }
    }
}

@Composable
fun <T> AppRouteContentHost(
    targetState: T,
    orderOf: (T) -> Int,
    modifier: Modifier = Modifier,
    label: String,
    content: @Composable (T) -> Unit,
) {
    AnimatedContent(
        targetState = targetState,
        transitionSpec = {
            AppRouteTransition(
                initialState = initialState,
                targetState = targetState,
                orderOf = orderOf,
            )
        },
        modifier = modifier,
        label = label,
        content = { state -> content(state) },
    )
}
