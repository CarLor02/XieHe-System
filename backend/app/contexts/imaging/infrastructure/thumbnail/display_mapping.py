"""Map decoded source pixels to an 8-bit thumbnail display image."""

from __future__ import annotations

from PIL import Image

_UINT16_GRAYSCALE_MODES = frozenset({"I;16", "I;16L", "I;16B", "I;16N"})
_UINT16_MAX = 65535
_UINT8_MAX = 255


def map_to_thumbnail_display_image(
    image: Image.Image,
    *,
    source_format: str,
    source_mode: str,
) -> Image.Image:
    """Return an 8-bit grayscale or color image suitable for WebP encoding."""

    if _is_uint16_grayscale(source_format=source_format, source_mode=source_mode):
        # Pillow exposes 16-bit grayscale PNG as mode I and clips values above 255
        # when I is converted directly to RGB. Scale the encoded unsigned range first.
        integer_image = image if image.mode == "I" else image.convert("I")
        return integer_image.point(
            lambda value: value * _UINT8_MAX / _UINT16_MAX
        ).convert("L")

    if source_mode in {"I", "F"} or image.mode in {"I", "F"}:
        raise ValueError(
            f"不支持无法确定显示范围的高位深像素编码: "
            f"format={source_format or 'UNKNOWN'}, mode={source_mode}"
        )

    if image.mode in {"1", "L"}:
        return image.convert("L")
    if image.mode in {"RGB", "RGBA"}:
        return image
    return image.convert("RGB")


def _is_uint16_grayscale(*, source_format: str, source_mode: str) -> bool:
    if source_mode in _UINT16_GRAYSCALE_MODES:
        return True
    # PNG has no 32-bit integer grayscale encoding; Pillow loads its 16-bit
    # grayscale samples as mode I, unlike TIFF where I may genuinely be 32-bit.
    return source_format == "PNG" and source_mode == "I"
