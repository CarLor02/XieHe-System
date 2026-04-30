package com.xiehe.spine.ui.viewmodel.image

import com.xiehe.spine.data.image.ImageFileSummary
import kotlin.test.Test
import kotlin.test.assertEquals

class ImagesFilterPolicyTest {
    @Test
    fun statusFilterLabelsMatchWebReviewStatusText() {
        assertEquals("未审核", ImageStatusFilter.UNREVIEWED.label)
        assertEquals("已审核", ImageStatusFilter.REVIEWED.label)
    }

    @Test
    fun reviewStatusFiltersUseUnreviewedAndReviewedSemantics() {
        val uploaded = image(id = 1, status = "UPLOADED")
        val processed = image(id = 2, status = "PROCESSED")
        val processing = image(id = 3, status = "PROCESSING")
        val items = listOf(uploaded, processed, processing)

        assertEquals(
            listOf(uploaded),
            ImageFilterPolicy.apply(
                ImagesUiState(
                    items = items,
                    statusFilter = ImageStatusFilter.UNREVIEWED,
                ),
            ),
        )
        assertEquals(
            listOf(processed),
            ImageFilterPolicy.apply(
                ImagesUiState(
                    items = items,
                    statusFilter = ImageStatusFilter.REVIEWED,
                ),
            ),
        )
    }

    private fun image(id: Int, status: String): ImageFileSummary {
        return ImageFileSummary(
            id = id,
            fileUuid = "image-$id",
            originalFilename = "image-$id.png",
            status = status,
        )
    }
}
