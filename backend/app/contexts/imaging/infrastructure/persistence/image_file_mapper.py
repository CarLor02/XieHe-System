"""Map persistence-independent image values to SQLAlchemy models."""

from app.contexts.imaging.domain import ImageFileDraft

from .image_file_models import ImageFile


def image_file_from_draft(draft: ImageFileDraft) -> ImageFile:
    return ImageFile(
        file_uuid=draft.file_uuid,
        original_filename=draft.original_filename,
        file_type=draft.file_type,
        mime_type=draft.mime_type,
        storage_bucket=draft.storage_bucket,
        object_key=draft.object_key,
        file_size=draft.file_size,
        file_hash=draft.file_hash,
        uploaded_by=draft.uploaded_by,
        patient_id=draft.patient_id,
        study_date=draft.study_date,
        description=draft.description,
        status=draft.status,
        upload_progress=draft.upload_progress,
    )
