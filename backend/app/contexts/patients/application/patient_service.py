"""Cache-aware patient commands and queries."""

from __future__ import annotations

from typing import Any

from app.contexts.patients.domain import (
    PatientListQuery,
    PatientNotFound,
)
from app.core.config import cache_settings
from app.shared.cache.aiocache import query_cache
from app.shared.cache.keys import build_cache_key
from app.shared.cache.service import CacheAsideService, CacheGenerationService

from .cache_namespaces import (
    PATIENT_LIST_NAMESPACE,
    patient_archive_namespace,
    patient_detail_namespace,
)
from .ports import PatientRepository


class PatientApplicationService:
    """The single patient use-case boundary used by HTTP adapters."""

    def __init__(
        self,
        repository: PatientRepository,
        *,
        cache: CacheAsideService | None = None,
        generations: CacheGenerationService | None = None,
    ) -> None:
        self._repository = repository
        self._cache = cache or CacheAsideService(query_cache)
        self._generations = generations or CacheGenerationService(query_cache)

    async def list_patients(self, query: PatientListQuery) -> tuple[list[dict[str, Any]], int]:
        async def load() -> dict[str, Any]:
            patients, total = await self._repository.list(query)
            return {
                "items": [patient.to_json_dict() for patient in patients],
                "total": total,
            }

        # EXISTS(image_files) depends on another aggregate and is intentionally not cached.
        if query.has_images is not None:
            result = await load()
        else:
            generation = await self._generations.current(PATIENT_LIST_NAMESPACE)
            key = build_cache_key(
                "patients",
                "list",
                f"v{generation}",
                parameters=query.cache_parameters(),
            )
            result = await self._cache.get_or_load(
                key,
                ttl=cache_settings.PATIENT_LIST_CACHE_TTL_SECONDS,
                loader=load,
            )
        return result["items"], int(result["total"])

    async def get_patient(self, patient_id: int) -> dict[str, Any]:
        namespace = patient_detail_namespace(patient_id)
        generation = await self._generations.current(namespace)
        key = build_cache_key("patients", "detail", patient_id, f"v{generation}")

        async def load() -> dict[str, Any] | None:
            patient = await self._repository.get(patient_id)
            return patient.to_json_dict() if patient else None

        result = await self._cache.get_or_load(
            key,
            ttl=cache_settings.PATIENT_DETAIL_CACHE_TTL_SECONDS,
            loader=load,
        )
        if result is None:
            raise PatientNotFound(patient_id)
        return result

    async def create_patient(self, data: dict[str, Any], *, actor_id: int | None) -> dict[str, Any]:
        patient = await self._repository.create(data, actor_id=actor_id)
        await self._generations.bump_best_effort(PATIENT_LIST_NAMESPACE)
        return patient.to_json_dict()

    async def update_patient(
        self,
        patient_id: int,
        data: dict[str, Any],
        *,
        actor_id: int | None,
    ) -> dict[str, Any]:
        patient = await self._repository.update(patient_id, data, actor_id=actor_id)
        if patient is None:
            raise PatientNotFound(patient_id)
        await self._generations.bump_best_effort(
            PATIENT_LIST_NAMESPACE,
            patient_detail_namespace(patient_id),
            patient_archive_namespace(patient_id),
        )
        return patient.to_json_dict()

    async def delete_patient(self, patient_id: int, *, actor_id: int | None) -> None:
        if not await self._repository.soft_delete(patient_id, actor_id=actor_id):
            raise PatientNotFound(patient_id)
        await self._generations.bump_best_effort(
            PATIENT_LIST_NAMESPACE,
            patient_detail_namespace(patient_id),
            patient_archive_namespace(patient_id),
        )
