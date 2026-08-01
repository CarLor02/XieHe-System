from __future__ import annotations

from datetime import datetime

import pytest

from app.contexts.patients.application.patient_service import PatientApplicationService
from app.contexts.patients.domain import PatientListQuery, PatientSnapshot


def snapshot(patient_id: int = 1) -> PatientSnapshot:
    return PatientSnapshot(
        id=patient_id,
        patient_id=f"P{patient_id}",
        name="测试患者",
        gender="男",
        birth_date=None,
        age=None,
        phone=None,
        email=None,
        address=None,
        emergency_contact_name=None,
        emergency_contact_phone=None,
        id_card=None,
        insurance_number=None,
        status="ACTIVE",
        created_at=datetime(2026, 1, 1),
        updated_at=None,
    )


class FakeRepository:
    def __init__(self) -> None:
        self.list_calls = 0
        self.patient = snapshot()

    async def list(self, query):
        self.list_calls += 1
        return [self.patient], 1

    async def get(self, patient_id):
        return self.patient if patient_id == self.patient.id else None

    async def create(self, data, *, actor_id):
        return self.patient

    async def update(self, patient_id, data, *, actor_id):
        return self.patient if patient_id == self.patient.id else None

    async def soft_delete(self, patient_id, *, actor_id):
        return patient_id == self.patient.id


class MemoryCache:
    enabled = True

    def __init__(self) -> None:
        self.values: dict[str, object] = {}

    async def get(self, key):
        return self.values.get(key)

    async def set(self, key, value, *, ttl):
        self.values[key] = value
        return True

    async def delete(self, key):
        return int(self.values.pop(key, None) is not None)

    async def increment(self, key, amount=1):
        current = self.values.get(key, 0)
        self.values[key] = (current if isinstance(current, int) else 0) + amount
        return self.values[key]


@pytest.mark.asyncio
async def test_patient_list_is_cached_but_has_images_query_bypasses_cache() -> None:
    repository = FakeRepository()
    cache = MemoryCache()
    from app.shared.cache.service import CacheAsideService, CacheGenerationService

    service = PatientApplicationService(
        repository,
        cache=CacheAsideService(cache),
        generations=CacheGenerationService(cache),
    )
    query = PatientListQuery()
    await service.list_patients(query)
    await service.list_patients(query)
    assert repository.list_calls == 1

    image_query = PatientListQuery(has_images=True)
    await service.list_patients(image_query)
    await service.list_patients(image_query)
    assert repository.list_calls == 3


@pytest.mark.asyncio
async def test_patient_update_invalidates_list_and_detail_generations() -> None:
    repository = FakeRepository()
    cache = MemoryCache()
    from app.shared.cache.service import CacheAsideService, CacheGenerationService

    service = PatientApplicationService(
        repository,
        cache=CacheAsideService(cache),
        generations=CacheGenerationService(cache),
    )
    await service.update_patient(1, {"name": "更新"}, actor_id=7)

    assert cache.values["generation:patients:list"] == 1
    assert cache.values["generation:patients:detail:1"] == 1
    assert cache.values["generation:patients:archive:1"] == 1
