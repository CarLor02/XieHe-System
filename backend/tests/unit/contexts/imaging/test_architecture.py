"""Regression checks for the imaging context dependency boundary."""

from __future__ import annotations

import ast
from pathlib import Path

from app.contexts.imaging.infrastructure import persistence as imaging_persistence
from app.shared.database.sqlalchemy import Base

BACKEND_ROOT = Path(__file__).resolve().parents[4]
IMAGING_ROOT = BACKEND_ROOT / "app" / "contexts" / "imaging"


def imported_modules(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    modules: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module:
            modules.add(node.module)
        elif isinstance(node, ast.Import):
            modules.update(alias.name for alias in node.names)
    return modules


def test_domain_and_application_do_not_depend_on_persistence() -> None:
    violations: list[str] = []
    forbidden = ("app.models", "app.contexts.imaging.infrastructure")
    for layer in ("domain", "application"):
        for path in sorted((IMAGING_ROOT / layer).rglob("*.py")):
            imports = imported_modules(path)
            blocked = sorted(
                module
                for module in imports
                if any(module.startswith(prefix) for prefix in forbidden)
            )
            if blocked:
                violations.append(f"{path.relative_to(BACKEND_ROOT)}: {blocked}")

    assert violations == []


def test_legacy_root_imaging_models_are_removed() -> None:
    models_root = BACKEND_ROOT / "app" / "models"
    assert not (models_root / "image.py").exists()
    assert not (models_root / "image_file.py").exists()
    assert not (models_root / "image_import.py").exists()


def test_model_registration_entrypoint_does_not_load_repositories() -> None:
    entrypoint = IMAGING_ROOT / "infrastructure" / "persistence" / "__init__.py"
    imports = imported_modules(entrypoint)

    assert not any("repository" in module for module in imports)


def test_model_registration_entrypoint_registers_all_imaging_tables() -> None:
    assert imaging_persistence.ImageFile.__tablename__ == "image_files"
    assert {
        "ai_tasks",
        "image_annotation_item_events",
        "image_annotation_revisions",
        "image_annotations",
        "image_file_team_visibility",
        "image_files",
        "image_import_batches",
        "image_import_items",
    } <= set(Base.metadata.tables)
