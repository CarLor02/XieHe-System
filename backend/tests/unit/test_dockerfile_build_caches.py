from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

DOWNLOAD_STEPS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    (
        "backend/Dockerfile",
        "apt-get install",
        ("target=/var/cache/apt", "target=/var/lib/apt"),
    ),
    ("backend/Dockerfile", "uv sync", ("target=/root/.cache/uv",)),
    ("frontend/Dockerfile", "apk add", ("target=/var/cache/apk",)),
    ("frontend/Dockerfile", "npm ci", ("target=/root/.npm",)),
    (
        "model/ap/Dockerfile",
        "apt-get install",
        ("target=/var/cache/apt", "target=/var/lib/apt"),
    ),
    ("model/ap/Dockerfile", "pip install", ("target=/root/.cache/pip",)),
    (
        "model/lat/Dockerfile",
        "apt-get install",
        ("target=/var/cache/apt", "target=/var/lib/apt"),
    ),
    ("model/lat/Dockerfile", "pip install", ("target=/root/.cache/pip",)),
    (
        "backend/app/services/logging-service/Dockerfile",
        "go mod download",
        ("target=/go/pkg/mod",),
    ),
    (
        "backend/app/services/logging-service/Dockerfile",
        "go build",
        ("target=/go/pkg/mod", "target=/root/.cache/go-build"),
    ),
    (
        "backend/app/services/logging-service/Dockerfile",
        "apk add",
        ("target=/var/cache/apk",),
    ),
    (
        "backend/app/services/storage-service/Dockerfile",
        "go mod download",
        ("target=/go/pkg/mod",),
    ),
    (
        "backend/app/services/storage-service/Dockerfile",
        "go build",
        ("target=/go/pkg/mod", "target=/root/.cache/go-build"),
    ),
)


def _dockerfile_instructions(path: Path) -> list[str]:
    instructions: list[str] = []
    current: list[str] = []

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        stripped = raw_line.strip()
        if not current and (not stripped or stripped.startswith("#")):
            continue

        current.append(stripped.removesuffix("\\").rstrip())
        if not stripped.endswith("\\"):
            instructions.append(" ".join(current))
            current = []

    if current:
        instructions.append(" ".join(current))

    return instructions


def test_dependency_download_steps_use_locked_buildkit_caches() -> None:
    for relative_path, command, required_targets in DOWNLOAD_STEPS:
        instructions = [
            instruction
            for instruction in _dockerfile_instructions(REPO_ROOT / relative_path)
            if instruction.startswith("RUN ") and command in instruction
        ]

        assert instructions, f"{relative_path} has no RUN instruction for {command}"
        for instruction in instructions:
            assert "--mount=type=cache" in instruction
            assert "id=xiehe-" in instruction
            assert "sharing=locked" in instruction
            for target in required_targets:
                assert target in instruction


def test_apk_download_steps_do_not_disable_the_cache() -> None:
    apk_dockerfiles = (
        "frontend/Dockerfile",
        "backend/app/services/logging-service/Dockerfile",
    )

    for relative_path in apk_dockerfiles:
        apk_instructions = [
            instruction
            for instruction in _dockerfile_instructions(REPO_ROOT / relative_path)
            if instruction.startswith("RUN ") and "apk add" in instruction
        ]

        assert apk_instructions
        assert all(
            "apk add --no-cache" not in instruction for instruction in apk_instructions
        )


def test_apt_download_steps_keep_packages_in_the_cache_mount() -> None:
    apt_dockerfiles = (
        "backend/Dockerfile",
        "model/ap/Dockerfile",
        "model/lat/Dockerfile",
    )

    for relative_path in apt_dockerfiles:
        apt_instructions = [
            instruction
            for instruction in _dockerfile_instructions(REPO_ROOT / relative_path)
            if instruction.startswith("RUN ") and "apt-get install" in instruction
        ]

        assert apt_instructions
        assert all(
            "rm -f /etc/apt/apt.conf.d/docker-clean" in instruction
            for instruction in apt_instructions
        )
        assert all(
            'APT::Keep-Downloaded-Packages "true"' in instruction
            for instruction in apt_instructions
        )
