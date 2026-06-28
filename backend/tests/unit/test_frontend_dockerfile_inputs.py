from __future__ import annotations

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
