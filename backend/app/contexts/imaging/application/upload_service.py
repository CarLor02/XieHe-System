"""Single-image upload facade backed by durable upload sessions."""

from __future__ import annotations

from app.contexts.imaging.application.dto import (
    CompleteUpload,
    PageResult,
    UploadFileSpec,
    UploadRecord,
    UploadSession,
    UploadStatus,
)
from app.contexts.imaging.application.ports import UploadRepository
from app.contexts.imaging.domain import ImageAccessActor

from .errors import AuthenticationRequiredError
from .upload_session_service import ImageUploadSessionService


class ImageUploadService:
    def __init__(
        self,
        repository: UploadRepository,
        sessions: ImageUploadSessionService,
    ) -> None:
        self._repository = repository
        self._sessions = sessions

    async def create_session(
        self, spec: UploadFileSpec, actor: ImageAccessActor
    ) -> UploadSession:
        return await self._sessions.create(spec, actor)

    async def complete_session(
        self,
        session_id: str,
        completion: CompleteUpload,
        actor: ImageAccessActor,
    ) -> UploadStatus:
        return await self._sessions.complete(session_id, completion, actor)

    def get_status(self, session_id: str, actor: ImageAccessActor) -> UploadStatus:
        return self._sessions.get_status(session_id, actor)

    def list_records(
        self,
        *,
        actor: ImageAccessActor,
        page: int,
        page_size: int,
        patient_id: int | None,
    ) -> PageResult[UploadRecord]:
        if actor.user_id is None:
            raise AuthenticationRequiredError("当前用户ID无效")
        return self._repository.list_records(
            owner_id=actor.user_id,
            page=page,
            page_size=page_size,
            patient_id=patient_id,
        )
