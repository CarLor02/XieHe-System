"""影像文件名和内容格式的纯领域规则。"""

from pathlib import Path
from typing import Literal

ImageFileTypeValue = Literal["DICOM", "JPEG", "PNG", "TIFF", "OTHER"]

REPLACE_CONTENT_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tiff", ".tif"}
REPLACE_CONTENT_ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/x-tiff",
}


def build_renamed_filename(original_filename: str, basename: str) -> str:
    """保留真实扩展名，避免展示名与文件内容格式冲突。"""

    renamed_filename = f"{basename}{Path(original_filename).suffix}"
    if len(renamed_filename) > 255:
        raise ValueError("新影像名过长")
    return renamed_filename


def determine_image_file_type(filename: str) -> ImageFileTypeValue:
    extension = Path(filename).suffix.lower()
    if extension in {".dcm", ".dicom"}:
        return "DICOM"
    if extension in {".jpg", ".jpeg"}:
        return "JPEG"
    if extension == ".png":
        return "PNG"
    if extension in {".tif", ".tiff"}:
        return "TIFF"
    return "OTHER"


def validate_replacement_file(filename: str, content_type: str) -> None:
    if Path(filename).suffix.lower() not in REPLACE_CONTENT_ALLOWED_EXTENSIONS:
        raise ValueError("不支持的文件扩展名")
    if content_type not in REPLACE_CONTENT_ALLOWED_MIME_TYPES:
        raise ValueError("不支持的文件类型")
