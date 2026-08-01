"""Cache-aware patient archive reads retained outside the mounted API."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from app.contexts.patients.domain import PatientNotFound
from app.core.config import cache_settings
from app.shared.cache.aiocache import query_cache
from app.shared.cache.keys import build_cache_key
from app.shared.cache.service import CacheAsideService, CacheGenerationService

from .cache_namespaces import patient_archive_namespace
from .ports import PatientArchiveRepository


class PatientArchiveApplicationService:
    """Serve archive reads without making the legacy archive router public."""

    def __init__(
        self,
        repository: PatientArchiveRepository,
        *,
        cache: CacheAsideService | None = None,
        generations: CacheGenerationService | None = None,
    ) -> None:
        self._repository = repository
        self._cache = cache or CacheAsideService(query_cache)
        self._generations = generations or CacheGenerationService(query_cache)

    async def get_summary(self, patient_id: int) -> dict[str, Any]:
        return await self._get_cached(
            patient_id, "summary", self._repository.get_summary
        )

    async def get_full_archive(self, patient_id: int) -> dict[str, Any]:
        return await self._get_cached(
            patient_id, "full", self._repository.get_full_archive
        )

    async def export_full_archive(self, patient_id: int) -> dict[str, Any]:
        """Exports always read the database and never reuse a query-cache snapshot."""

        result = await self._repository.get_full_archive(patient_id)
        if result is None:
            raise PatientNotFound(patient_id)
        return result

    async def _get_cached(
        self,
        patient_id: int,
        view: str,
        loader_method: Callable[[int], Awaitable[dict[str, Any] | None]],
    ) -> dict[str, Any]:
        namespace = patient_archive_namespace(patient_id)
        generation = await self._generations.current(namespace)
        key = build_cache_key("patients", "archive", patient_id, view, f"v{generation}")

        async def load() -> dict[str, Any] | None:
            return await loader_method(patient_id)

        result = await self._cache.get_or_load(
            key,
            ttl=cache_settings.PATIENT_DETAIL_CACHE_TTL_SECONDS,
            loader=load,
        )
        if result is None:
            raise PatientNotFound(patient_id)
        return result
