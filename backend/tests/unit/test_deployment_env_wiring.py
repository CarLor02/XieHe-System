from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]


def read(path: str) -> str:
    return (REPO_ROOT / path).read_text(encoding="utf-8")


def test_compose_wrapper_loads_all_required_dotenv_files() -> None:
    compose_sh = read("scripts/compose.sh")

    for env_file in (
        "dotenv/.env.runtime",
        "dotenv/.env.ports",
        "dotenv/.env.database",
        "dotenv/.env.redis",
        "dotenv/.env.minio",
        "dotenv/.env.kafka",
        "dotenv/.env.storage",
        "dotenv/.env.logging",
        "dotenv/.env.concurrency",
        "dotenv/.env.backend",
        "dotenv/.env.frontend",
    ):
        assert f'"{env_file}"' in compose_sh


def test_python_settings_load_concurrency_dotenv_files() -> None:
    base_settings = read("backend/app/core/config/base.py")

    assert '"dotenv/.env.concurrency"' in base_settings
    assert '"../dotenv/.env.concurrency"' in base_settings


def test_backend_compose_injects_python_settings_env_names() -> None:
    backend_compose = read("infrastructure/docker/compose/backend.yml")

    for name in (
        "BACKEND_CORS_ORIGINS",
        "AI_OBJECT_CONCURRENCY_LIMIT",
        "BATCH_PRESIGN_CONCURRENCY_LIMIT",
        "LEGACY_DIAGNOSIS_CONCURRENCY_LIMIT",
        "REPORT_EXPORT_CONCURRENCY_LIMIT",
    ):
        assert f"{name}:" in backend_compose


def test_redis_compose_mounts_existing_config_file() -> None:
    redis_compose = read("infrastructure/docker/compose/redis.yml")
    redis_config = REPO_ROOT / "infrastructure" / "redis" / "redis.conf"

    assert "../../redis/redis.conf:/usr/local/etc/redis/redis.conf:ro" in redis_compose
    assert redis_config.is_file()


def test_pc_deploy_generates_required_dotenv_files() -> None:
    deploy_script = read("deploy_pc.sh")

    for env_file in (
        ".env.kafka",
        ".env.logging",
        ".env.concurrency",
    ):
        assert f'write_if_missing "{env_file}"' in deploy_script
