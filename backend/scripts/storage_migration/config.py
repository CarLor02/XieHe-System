"""Explicit migration endpoints, independent of the application's active storage."""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

import boto3
from botocore.config import Config
from dotenv import dotenv_values
from mypy_boto3_s3.client import S3Client
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, make_url

from .artifacts import MigrationError

PROJECT_ROOT = Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class Connections:
    source: S3Client
    destination: S3Client
    source_endpoint: str
    destination_endpoint: str


def arguments(parser: argparse.ArgumentParser, *, database: bool = False) -> None:
    parser.add_argument(
        "--env-file", type=Path, help="额外的迁移配置文件，覆盖默认 dotenv"
    )
    parser.add_argument("--source-endpoint", help="MinIO S3 地址（宿主机通常为 :9000）")
    parser.add_argument(
        "--destination-endpoint", help="RustFS S3 地址（宿主机通常为 :9100）"
    )
    if database:
        parser.add_argument("--database-url", help="数据库 URL；建议放在配置文件中")


def values(extra: Path | None) -> dict[str, str]:
    result: dict[str, str] = {}
    for name in [".env.minio", ".env.rustfs", ".env.database"]:
        result.update(
            {
                k: v
                for k, v in dotenv_values(PROJECT_ROOT / "dotenv" / name).items()
                if v is not None
            }
        )
    if extra:
        if not extra.is_file():
            raise MigrationError(f"configuration file missing: {extra}")
        result.update({k: v for k, v in dotenv_values(extra).items() if v is not None})
    result.update(os.environ)
    return result


def endpoint(raw: str) -> str:
    parsed = urlsplit(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise MigrationError("S3 endpoint must be an http(s) URL")
    if (
        parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or parsed.path not in {"", "/"}
    ):
        raise MigrationError("S3 endpoint must not contain credentials, query or path")
    return raw.rstrip("/")


def required(settings: dict[str, str], *names: str) -> str:
    for name in names:
        value = settings.get(name, "")
        if value and not value.startswith("<"):
            return value
    raise MigrationError(f"missing configuration: {' / '.join(names)}")


def connections(args: argparse.Namespace, settings: dict[str, str]) -> Connections:
    source_url = endpoint(
        args.source_endpoint
        or settings.get("MIGRATION_SOURCE_ENDPOINT", "http://127.0.0.1:9000")
    )
    destination_url = endpoint(
        args.destination_endpoint
        or settings.get("MIGRATION_DESTINATION_ENDPOINT", "http://127.0.0.1:9100")
    )
    if source_url == destination_url:
        raise MigrationError("source and destination endpoints must differ")
    config = Config(
        signature_version="s3v4",
        s3={"addressing_style": "path"},
        proxies={},
        connect_timeout=10,
        read_timeout=120,
        retries={"mode": "standard", "max_attempts": 3},
        request_checksum_calculation="when_required",
        response_checksum_validation="when_required",
    )

    def client(url: str, access: str, secret: str) -> S3Client:
        return boto3.client(
            "s3",
            endpoint_url=url,
            aws_access_key_id=access,
            aws_secret_access_key=secret,
            region_name=settings.get("MINIO_REGION", "us-east-1"),
            config=config,
        )

    return Connections(
        client(
            source_url,
            required(settings, "MIGRATION_SOURCE_ACCESS_KEY", "MINIO_ROOT_USER"),
            required(settings, "MIGRATION_SOURCE_SECRET_KEY", "MINIO_ROOT_PASSWORD"),
        ),
        client(
            destination_url,
            required(settings, "MIGRATION_DESTINATION_ACCESS_KEY", "RUSTFS_ACCESS_KEY"),
            required(settings, "MIGRATION_DESTINATION_SECRET_KEY", "RUSTFS_SECRET_KEY"),
        ),
        source_url,
        destination_url,
    )


def database_engine(args: argparse.Namespace, settings: dict[str, str]) -> Engine:
    url = args.database_url or required(
        settings, "MIGRATION_DATABASE_URL", "DATABASE_URL"
    )
    parsed = make_url(url)
    if parsed.get_backend_name() != "mysql":
        raise MigrationError("CLI database operations require MySQL")
    return create_engine(parsed, pool_pre_ping=True)


def database_identity(engine: Engine) -> str:
    return engine.url.render_as_string(hide_password=True)
