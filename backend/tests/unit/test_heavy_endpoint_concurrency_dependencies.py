from __future__ import annotations

import inspect

import pytest
from fastapi.params import Depends

from app.api.v1.endpoints.imaging.handlers import diagnosis, files
from app.api.v1.endpoints.reports.handlers import export
from app.core.system.concurrency import (
    ConcurrencyGate,
    require_ai_object_slot,
    require_batch_presign_slot,
    require_legacy_diagnosis_slot,
    require_report_export_slot,
)


def _dependency_functions(endpoint) -> set[object]:
    dependencies: set[object] = set()
    for parameter in inspect.signature(endpoint).parameters.values():
        if isinstance(parameter.default, Depends):
            dependencies.add(parameter.default.dependency)
    return dependencies


def test_heavy_endpoints_declare_concurrency_dependencies() -> None:
    assert require_batch_presign_slot in _dependency_functions(files.get_image_file_download_urls)
    assert require_ai_object_slot in _dependency_functions(files.run_image_file_ai_predict)
    assert require_ai_object_slot in _dependency_functions(files.run_image_file_ai_detect_keypoints)
    assert require_legacy_diagnosis_slot in _dependency_functions(diagnosis.analyze_image)
    assert require_legacy_diagnosis_slot in _dependency_functions(diagnosis.batch_analyze_images)
    assert require_legacy_diagnosis_slot in _dependency_functions(diagnosis.compare_models)
    assert require_report_export_slot in _dependency_functions(export.export_single_report)
    assert require_report_export_slot in _dependency_functions(export.export_batch_reports)


@pytest.mark.asyncio
async def test_batch_export_skips_work_when_report_gate_is_full(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    gate = ConcurrencyGate(name="test-report-export", limit=1)
    calls: list[str] = []

    async def fake_process(*args, **kwargs) -> None:
        calls.append("process")

    monkeypatch.setattr(export, "report_export_gate", gate, raising=False)
    monkeypatch.setattr(export, "_process_batch_export", fake_process, raising=False)
    monkeypatch.setattr(export.logger, "emit_event", lambda *args, **kwargs: True)

    async with gate.acquire():
        await export.process_batch_export("task-1", [], "pdf", None, True, None)

    assert calls == []
