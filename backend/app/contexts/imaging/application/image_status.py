"""影像应用用例共享的状态集合。"""

from app.models.image_file import ImageFileStatusEnum

READY_FILE_STATUSES = {
    ImageFileStatusEnum.UPLOADED,
    ImageFileStatusEnum.PROCESSED,
}
