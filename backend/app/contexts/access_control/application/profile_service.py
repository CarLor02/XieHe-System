"""个人资料与头像应用用例。"""

from __future__ import annotations

import math
from dataclasses import replace
from typing import Any

from app.core.config import settings
from app.core.system.exceptions import BusinessLogicException, ResourceNotFoundException

from .dto import AccessPrincipal, AvatarUploadSession, UserProfile
from .ports import AvatarStorage, IdentityRepository


class ProfileService:
    def __init__(
        self, repository: IdentityRepository, avatar_storage: AvatarStorage
    ) -> None:
        self._repository = repository
        self._avatar_storage = avatar_storage

    async def get_profile(self, principal: AccessPrincipal) -> UserProfile:
        profile = self._required_profile(self._principal_id(principal))
        return await self._with_avatar_url(profile)

    async def update_profile(
        self, principal: AccessPrincipal, changes: dict[str, Any]
    ) -> UserProfile:
        user_id = self._principal_id(principal)
        phone = changes.get("phone")
        if phone and self._repository.phone_in_use(phone, excluding_user_id=user_id):
            raise BusinessLogicException("该手机号已被使用")
        profile = self._repository.update_profile(user_id, changes)
        if not profile:
            raise ResourceNotFoundException("用户", user_id)
        return await self._with_avatar_url(profile)

    async def create_avatar_upload_session(
        self,
        *,
        principal: AccessPrincipal,
        filename: str,
        size: int,
        mime_type: str,
    ) -> AvatarUploadSession:
        if mime_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise BusinessLogicException("不支持的头像文件类型")
        user_id = self._principal_id(principal)
        bucket = settings.USER_AVATAR_BUCKET
        object_key = f"users/{user_id}/avatar"
        part_size = settings.STORAGE_MULTIPART_PART_SIZE
        result = await self._avatar_storage.create_upload_session(
            bucket=bucket,
            object_key=object_key,
            content_type=mime_type,
            metadata={"user-id": str(user_id), "original-filename": filename},
            part_count=max(1, math.ceil(size / part_size)),
            expires_in=settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
        )
        return AvatarUploadSession(
            storage_bucket=bucket,
            object_key=object_key,
            upload_id=str(result["upload_id"]),
            part_size=part_size,
            expires_in=settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
            parts=list(result["parts"]),
        )

    async def complete_avatar_upload(
        self,
        *,
        principal: AccessPrincipal,
        upload_id: str,
        parts: list[dict[str, Any]],
    ) -> UserProfile:
        user_id = self._principal_id(principal)
        bucket = settings.USER_AVATAR_BUCKET
        object_key = f"users/{user_id}/avatar"
        etag = await self._avatar_storage.complete_upload(
            bucket=bucket,
            object_key=object_key,
            upload_id=upload_id,
            parts=parts,
        )
        profile = self._repository.save_avatar(
            user_id, bucket=bucket, object_key=object_key, etag=etag
        )
        if not profile:
            raise ResourceNotFoundException("用户", user_id)
        return await self._with_avatar_url(profile)

    async def delete_avatar(
        self, principal: AccessPrincipal
    ) -> tuple[UserProfile, bool]:
        user_id = self._principal_id(principal)
        profile = self._required_profile(user_id)
        deleted = bool(profile.avatar_storage_bucket and profile.avatar_object_key)
        if deleted:
            profile = self._repository.mark_avatar_deleted(user_id) or profile
        return await self._with_avatar_url(profile), deleted

    async def _with_avatar_url(self, profile: UserProfile) -> UserProfile:
        if (
            profile.avatar_deleted
            or not profile.avatar_storage_bucket
            or not profile.avatar_object_key
        ):
            return profile
        try:
            avatar_url = await self._avatar_storage.presign_get(
                bucket=profile.avatar_storage_bucket,
                object_key=profile.avatar_object_key,
                expires_in=settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
            )
        except Exception:
            return profile
        return replace(profile, avatar_url=avatar_url)

    def _required_profile(self, user_id: int) -> UserProfile:
        profile = self._repository.get_profile(user_id)
        if not profile:
            raise ResourceNotFoundException("用户", user_id)
        return profile

    @staticmethod
    def _principal_id(principal: AccessPrincipal) -> int:
        raw_id = principal.get("id") or principal.get("user_id")
        if raw_id is None:
            raise ResourceNotFoundException("用户")
        try:
            return int(raw_id)
        except (TypeError, ValueError):
            raise ResourceNotFoundException("用户") from None
