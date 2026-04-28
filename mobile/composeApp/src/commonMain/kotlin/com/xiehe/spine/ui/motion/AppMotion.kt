package com.xiehe.spine.ui.motion

import androidx.compose.animation.core.AnimationSpec
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.interaction.InteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset

object AppMotion {
    const val routeFadeInMillis = 240
    const val routeSlideInMillis = 260
    const val routeFadeOutMillis = 180
    const val routeSlideOutMillis = 200

    const val modalScrimMillis = 220
    const val bottomSheetEnterMillis = 240
    const val bottomSheetExitMillis = 200
    const val confirmEnterMillis = 220
    const val confirmExitMillis = 220
    const val toastEnterMillis = 220
    const val toastExitMillis = 220
    const val pressScaleDurationMillis = 120
    const val tabIndicatorMillis = 260
    const val tabLabelColorMillis = 180
    const val loadingSpinMillis = 900
    const val startupSpinMillis = 1000

    const val pressScaleValue = 0.97f
    const val bottomSheetScrimAlpha = 0.26f
    const val confirmScrimAlpha = 0.35f

    private val standardEasing: Easing = FastOutSlowInEasing

    fun routeFadeInSpec(): FiniteAnimationSpec<Float> = tween(
        durationMillis = routeFadeInMillis,
        easing = standardEasing,
    )

    fun routeSlideInSpec(): FiniteAnimationSpec<IntOffset> = tween(
        durationMillis = routeSlideInMillis,
        easing = standardEasing,
    )

    fun routeFadeOutSpec(): FiniteAnimationSpec<Float> = tween(
        durationMillis = routeFadeOutMillis,
        easing = standardEasing,
    )

    fun routeSlideOutSpec(): FiniteAnimationSpec<IntOffset> = tween(
        durationMillis = routeSlideOutMillis,
        easing = standardEasing,
    )

    fun instantSpec(): FiniteAnimationSpec<Float> = tween(durationMillis = 0)

    fun modalScrimSpec(): FiniteAnimationSpec<Float> = tween(
        durationMillis = modalScrimMillis,
        easing = standardEasing,
    )

    fun bottomSheetEnterSpec(): FiniteAnimationSpec<IntOffset> = tween(
        durationMillis = bottomSheetEnterMillis,
        easing = standardEasing,
    )

    fun bottomSheetExitSpec(): FiniteAnimationSpec<IntOffset> = tween(
        durationMillis = bottomSheetExitMillis,
        easing = standardEasing,
    )

    fun confirmEnterSpec(): FiniteAnimationSpec<Float> = tween(
        durationMillis = confirmEnterMillis,
        easing = standardEasing,
    )

    fun confirmExitSpec(): FiniteAnimationSpec<Float> = tween(
        durationMillis = confirmExitMillis,
        easing = standardEasing,
    )

    fun toastEnterSpec(): FiniteAnimationSpec<Float> = tween(
        durationMillis = toastEnterMillis,
        easing = standardEasing,
    )

    fun toastEnterOffsetSpec(): FiniteAnimationSpec<IntOffset> = tween(
        durationMillis = toastEnterMillis,
        easing = standardEasing,
    )

    fun toastExitSpec(): FiniteAnimationSpec<Float> = tween(
        durationMillis = toastExitMillis,
        easing = standardEasing,
    )

    fun toastExitOffsetSpec(): FiniteAnimationSpec<IntOffset> = tween(
        durationMillis = toastExitMillis,
        easing = standardEasing,
    )

    fun confirmEnterOffsetSpec(): FiniteAnimationSpec<IntOffset> = tween(
        durationMillis = confirmEnterMillis,
        easing = standardEasing,
    )

    fun confirmExitOffsetSpec(): FiniteAnimationSpec<IntOffset> = tween(
        durationMillis = confirmExitMillis,
        easing = standardEasing,
    )

    fun pressScaleSpec(): AnimationSpec<Float> = tween(
        durationMillis = pressScaleDurationMillis,
        easing = standardEasing,
    )

    fun tabIndicatorSpec(): AnimationSpec<Dp> = tween(
        durationMillis = tabIndicatorMillis,
        easing = standardEasing,
    )

    fun tabLabelColorSpec(): AnimationSpec<Color> = tween(
        durationMillis = tabLabelColorMillis,
        easing = standardEasing,
    )

    fun loadingSpinSpec() = infiniteRepeatable<Float>(
        animation = tween(durationMillis = loadingSpinMillis, easing = LinearEasing),
        repeatMode = RepeatMode.Restart,
    )

    fun startupSpinSpec() = infiniteRepeatable<Float>(
        animation = tween(durationMillis = startupSpinMillis, easing = LinearEasing),
        repeatMode = RepeatMode.Restart,
    )

    val modalDismissDelayMillis: Long
        get() = modalScrimMillis.toLong()
}

@Composable
fun rememberPressScale(
    interactionSource: InteractionSource,
    enabled: Boolean,
    label: String,
): Float {
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed && enabled) AppMotion.pressScaleValue else 1f,
        animationSpec = AppMotion.pressScaleSpec(),
        label = label,
    )
    return scale
}
