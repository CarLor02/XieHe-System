#!/usr/bin/env python3
"""Copy legacy local upload files into MinIO through the storage service.

Run after `alembic upgrade head`. The Alembic migration strips the old
`completed/` prefix into `image_files.object_key`; this script therefore looks
for local files at `<uploads-dir>/completed/<object_key>` first.
"""

from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path
from urllib.parse import quote

import requests
from sqlalchemy import create_engine, text


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate local uploads to MinIO")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"), required=not os.getenv("DATABASE_URL"))
    parser.add_argument("--uploads-dir", default=os.getenv("LEGACY_UPLOADS_DIR", "/app/uploads"))
    parser.add_argument("--backup-dir", required=True)
    parser.add_argument("--storage-service-url", default=os.getenv("STORAGE_SERVICE_URL", "http://storage-service:8090"))
    parser.add_argument("--storage-service-token", default=os.getenv("STORAGE_SERVICE_TOKEN", "dev-storage-service-token"))
    parser.add_argument("--bucket", default=os.getenv("IMAGE_FILE_BUCKET", "medical_image_files"))
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def backup_uploads(uploads_dir: Path, backup_dir: Path, dry_run: bool) -> None:
    source = uploads_dir / "completed"
    target = backup_dir / "completed"
    if not source.exists():
        raise FileNotFoundError(f"legacy completed directory not found: {source}")
    if dry_run:
        print(f"[dry-run] would backup {source} -> {target}")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        print(f"backup already exists, keeping: {target}")
        return
    shutil.copytree(source, target)
    print(f"backup created: {target}")


def storage_headers(token: str) -> dict[str, str]:
    return {"X-Storage-Service-Token": token}


def upload_file(service_url: str, token: str, bucket: str, object_key: str, file_path: Path) -> dict:
    encoded_key = quote(object_key, safe="/")
    url = f"{service_url.rstrip('/')}/objects/{bucket}/{encoded_key}"
    with file_path.open("rb") as handle:
        response = requests.put(url, headers=storage_headers(token), data=handle, timeout=300)
    response.raise_for_status()
    payload = response.json()
    if isinstance(payload, dict) and "code" in payload and "data" in payload:
        return payload.get("data") or {}
    return payload


def find_local_file(uploads_dir: Path, object_key: str) -> Path | None:
    candidates = [
        uploads_dir / "completed" / object_key,
        uploads_dir / object_key,
    ]
    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


def main() -> int:
    args = parse_args()
    uploads_dir = Path(args.uploads_dir)
    backup_dir = Path(args.backup_dir)
    backup_uploads(uploads_dir, backup_dir, args.dry_run)

    engine = create_engine(args.database_url)
    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, object_key, storage_bucket, storage_etag
                FROM image_files
                WHERE is_deleted = 0
                ORDER BY id
                """
            )
        ).mappings().all()

        migrated = 0
        missing = 0
        for row in rows:
            object_key = row["object_key"]
            bucket = row["storage_bucket"] or args.bucket
            file_path = find_local_file(uploads_dir, object_key)
            if not file_path:
                missing += 1
                print(f"[missing] image_files.id={row['id']} object_key={object_key}")
                continue

            if args.dry_run:
                print(f"[dry-run] would upload {file_path} -> {bucket}/{object_key}")
                continue

            result = upload_file(
                args.storage_service_url,
                args.storage_service_token,
                bucket,
                object_key,
                file_path,
            )
            conn.execute(
                text(
                    """
                    UPDATE image_files
                    SET storage_bucket = :bucket,
                        storage_etag = :etag
                    WHERE id = :id
                    """
                ),
                {"bucket": bucket, "etag": result.get("etag"), "id": row["id"]},
            )
            migrated += 1
            print(f"[ok] image_files.id={row['id']} -> {bucket}/{object_key}")

    print(f"done: migrated={migrated}, missing={missing}, dry_run={args.dry_run}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
