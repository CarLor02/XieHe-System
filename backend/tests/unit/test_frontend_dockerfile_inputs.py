from __future__ import annotations

import json
import shlex
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


def _local_copy_sources(dockerfile: Path) -> list[tuple[int, str]]:
    sources: list[tuple[int, str]] = []

    for line_number, raw_line in enumerate(
        dockerfile.read_text(encoding="utf-8").splitlines(),
        start=1,
    ):
        line = raw_line.strip()
        if not line or line.startswith("#") or not line.upper().startswith("COPY "):
            continue

        parts = shlex.split(line)
        if any(part.startswith("--from=") for part in parts[1:]):
            continue

        operands = [part for part in parts[1:] if not part.startswith("--")]
        if len(operands) < 2:
            continue

        for source in operands[:-1]:
            sources.append((line_number, source))

    return sources


def test_frontend_dockerfile_copy_sources_exist_in_build_context() -> None:
    dockerfile = REPO_ROOT / "frontend" / "Dockerfile"

    missing_sources = [
        f"line {line_number}: {source}"
        for line_number, source in _local_copy_sources(dockerfile)
        if not (REPO_ROOT / source).exists()
    ]

    assert missing_sources == []


def test_frontend_dockerfile_copies_all_local_workspace_dependencies() -> None:
    dockerfile = REPO_ROOT / "frontend" / "Dockerfile"
    dockerfile_text = dockerfile.read_text(encoding="utf-8")
    frontend_manifest = json.loads(
        (REPO_ROOT / "frontend" / "package.json").read_text(encoding="utf-8")
    )
    local_dependencies = sorted(
        name for name in frontend_manifest["dependencies"] if name.startswith("@xiehe/")
    )
    copied_sources = {source for _, source in _local_copy_sources(dockerfile)}

    missing_manifests = [
        f"packages/xiehe-{name.removeprefix('@xiehe/')}/package.json"
        for name in local_dependencies
        if f"packages/xiehe-{name.removeprefix('@xiehe/')}/package.json"
        not in copied_sources
    ]

    assert missing_manifests == []
    assert "COPY packages/ ./packages/" in dockerfile_text
