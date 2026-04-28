package com.xiehe.spine.ui.components.overlay

import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.components.card.welcomeInstruction.WelcomeInstructionCard
import com.xiehe.spine.ui.components.card.welcomeInstruction.WelcomeInstructionStep
import com.xiehe.spine.ui.components.icon.shared.IconToken
import com.xiehe.spine.ui.motion.AppModalHost
import com.xiehe.spine.ui.motion.AppMotion

@Composable
fun WelcomeInstructionOverlay(
    visible: Boolean,
    onFinish: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var stepIndex by remember(visible) { mutableIntStateOf(0) }
    val steps = remember { welcomeInstructionSteps() }

    AppModalHost(
        visible = visible,
        onDismissRequest = onFinish,
        modifier = modifier,
        scrimAlpha = 0.68f,
        dismissOnScrimTap = false,
        enter = fadeIn(animationSpec = AppMotion.confirmEnterSpec()) +
            slideInVertically(animationSpec = AppMotion.confirmEnterOffsetSpec()) { it / 6 },
        exit = fadeOut(animationSpec = AppMotion.confirmExitSpec()) +
            slideOutVertically(animationSpec = AppMotion.confirmExitOffsetSpec()) { it / 8 },
    ) {
        WelcomeInstructionCard(
            step = steps[stepIndex],
            stepIndex = stepIndex,
            totalSteps = steps.size,
            onSkip = onFinish,
            onBack = if (stepIndex > 0) {
                { stepIndex -= 1 }
            } else {
                null
            },
            onNext = {
                if (stepIndex == steps.lastIndex) {
                    onFinish()
                } else {
                    stepIndex += 1
                }
            },
            modifier = Modifier.padding(horizontal = 24.dp),
        )
    }
}

private fun welcomeInstructionSteps(): List<WelcomeInstructionStep> = listOf(
    WelcomeInstructionStep(
        icon = IconToken.HEART_PULSE,
        title = "欢迎使用脊柱影像分析系统",
        body = "专为脊柱科医生设计的智能影像分析平台，让我们快速了解核心功能。",
        actionLabel = "下一步",
        actionIcon = IconToken.ARROW_RIGHT,
    ),
    WelcomeInstructionStep(
        icon = IconToken.LAYOUT_DASHBOARD,
        title = "工作台 — 掌握全局",
        body = "在这里查看今日数据概览、待处理任务和近期动态，快速了解工作进展。",
        actionLabel = "下一步",
        actionIcon = IconToken.ARROW_RIGHT,
    ),
    WelcomeInstructionStep(
        icon = IconToken.USER_ROUND,
        title = "患者中心 — 管理患者",
        body = "查看所有患者信息、历史影像记录，支持快速搜索和筛选。",
        actionLabel = "下一步",
        actionIcon = IconToken.ARROW_RIGHT,
    ),
    WelcomeInstructionStep(
        icon = IconToken.IMAGE,
        title = "影像中心 — 上传与分析",
        body = "上传 X 光片，按类型和状态筛选，点击“标注分析”进入智能标注工作台。",
        actionLabel = "下一步",
        actionIcon = IconToken.ARROW_RIGHT,
    ),
    WelcomeInstructionStep(
        icon = IconToken.HOURGLASS,
        title = "待处理任务 — 快速响应",
        body = "工作台中的待处理任务按优先级排序，点击右侧箭头可直接进入标注页面。",
        actionLabel = "下一步",
        actionIcon = IconToken.ARROW_RIGHT,
    ),
    WelcomeInstructionStep(
        icon = IconToken.CHECK,
        title = "一切就绪！",
        body = "您已了解系统的核心功能。如需帮助，可随时在个人中心查看使用指南。",
        actionLabel = "开始使用",
        actionIcon = IconToken.BELL,
    ),
)
