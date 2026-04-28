package com.xiehe.spine.ui.components.form.picker

import com.xiehe.spine.ui.components.text.shared.Text
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.xiehe.spine.ui.theme.SpineTheme
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.map

@Composable
fun WheelPickerColumn(
    options: List<String>,
    selectedIndex: Int,
    onSelectedIndexChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
    visibleRows: Int = 3,
) {
    val rowHeight = 56.dp
    val safeSelected = selectedIndex.coerceIn(0, (options.size - 1).coerceAtLeast(0))
    val listState = rememberLazyListState(initialFirstVisibleItemIndex = safeSelected)
    val flingBehavior = rememberSnapFlingBehavior(lazyListState = listState)
    var internalSelected by remember { mutableIntStateOf(safeSelected) }

    LaunchedEffect(safeSelected) {
        if (safeSelected != internalSelected) {
            internalSelected = safeSelected
            listState.animateScrollToItem(safeSelected)
        }
    }

    LaunchedEffect(listState, options.size) {
        snapshotFlow { listState.isScrollInProgress }
            .filter { !it }
            .map {
                val offset = listState.firstVisibleItemScrollOffset
                val base = listState.firstVisibleItemIndex
                val next = if (offset > 28) base + 1 else base
                next.coerceIn(0, (options.size - 1).coerceAtLeast(0))
            }
            .distinctUntilChanged()
            .collect { idx ->
                internalSelected = idx
                onSelectedIndexChange(idx)
                listState.animateScrollToItem(idx)
            }
    }

    Box(
        modifier = modifier
            .height(rowHeight * visibleRows)
            .width(96.dp),
        contentAlignment = Alignment.Center,
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            state = listState,
            flingBehavior = flingBehavior,
            verticalArrangement = Arrangement.Center,
            contentPadding = PaddingValues(vertical = rowHeight),
        ) {
            itemsIndexed(options) { index, label ->
                val distance = kotlin.math.abs(index - internalSelected)
                val alpha = when (distance) {
                    0 -> 1f
                    1 -> 0.35f
                    else -> 0.2f
                }
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(rowHeight),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = label,
                        style = if (distance == 0) {
                            SpineTheme.typography.title.copy(fontWeight = FontWeight.SemiBold)
                        } else {
                            SpineTheme.typography.title
                        },
                        color = SpineTheme.colors.textPrimary.copy(alpha = alpha),
                    )
                }
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .offset(y = (-rowHeight / 2))
                .height(1.dp)
                .background(SpineTheme.colors.borderSubtle),
        ) {}
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .offset(y = (rowHeight / 2))
                .height(1.dp)
                .background(SpineTheme.colors.borderSubtle),
        ) {}
    }
}
