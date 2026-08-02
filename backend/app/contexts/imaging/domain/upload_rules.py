"""影像上传文件名、类型和对象键规则。"""

import re
from pathlib import Path

ALLOWED_UPLOAD_EXTENSIONS = {
    ".dcm",
    ".dicom",
    ".jpg",
    ".jpeg",
    ".png",
    ".tiff",
    ".tif",
}
ALLOWED_UPLOAD_MIME_TYPES = {
    "application/dicom",
    "application/octet-stream",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/x-tiff",
}


def validate_upload_file(filename: str, mime_type: str) -> None:
    if Path(filename).suffix.lower() not in ALLOWED_UPLOAD_EXTENSIONS:
        raise ValueError("不支持的文件扩展名")
    if mime_type not in ALLOWED_UPLOAD_MIME_TYPES:
        raise ValueError("不支持的文件类型")


def build_storage_object_key(file_uuid: str, filename: str) -> str:
    name = Path(filename).name.strip() or "image"
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", name)[:180]
    return f"{file_uuid}/{safe_name}"
