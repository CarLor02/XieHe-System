"""S3 reads and verified copies; ETag is a version token, never a content hash."""

from __future__ import annotations

import hashlib
import tempfile
from datetime import datetime
from typing import Any, BinaryIO
from urllib.parse import urlencode

from boto3.s3.transfer import TransferConfig
from botocore.exceptions import ClientError
from mypy_boto3_s3.client import S3Client

from .artifacts import MigrationError, ObjectEvidence, ObjectState

HEADERS = (
    "ContentType",
    "CacheControl",
    "ContentDisposition",
    "ContentEncoding",
    "ContentLanguage",
    "Expires",
)
TRANSFER = TransferConfig(
    multipart_threshold=64 * 1024 * 1024,
    multipart_chunksize=8 * 1024 * 1024,
    use_threads=False,
)


def missing(exc: ClientError) -> bool:
    return str(exc.response["Error"].get("Code")) in {
        "404",
        "NoSuchKey",
        "NotFound",
        "NoSuchBucket",
    }


def inspect(client: S3Client, bucket: str, key: str) -> ObjectState:
    raw = client.head_object(Bucket=bucket, Key=key)
    if raw.get("ObjectLockMode") or raw.get("ObjectLockLegalHoldStatus") == "ON":
        raise MigrationError(
            f"retained/locked object requires a dedicated migration: {bucket}/{key}"
        )
    headers: dict[str, str] = {}
    for field in HEADERS:
        value = raw.get(field)
        if value is not None:
            headers[field] = (
                value.isoformat() if isinstance(value, datetime) else str(value)
            )
    tags = client.get_object_tagging(Bucket=bucket, Key=key).get("TagSet", [])
    return ObjectState(
        bucket=bucket,
        key=key,
        size=raw["ContentLength"],
        etag=raw["ETag"].strip('"'),
        last_modified=raw["LastModified"].isoformat(timespec="seconds"),
        headers=headers,
        metadata=raw.get("Metadata", {}),
        tags={tag["Key"]: tag["Value"] for tag in tags},
    )


def maybe_inspect(client: S3Client, bucket: str, key: str) -> ObjectState | None:
    try:
        return inspect(client, bucket, key)
    except ClientError as exc:
        if missing(exc):
            return None
        raise


def listing(
    client: S3Client, buckets: list[str]
) -> dict[tuple[str, str], tuple[int, str, str]]:
    result = {}
    for bucket in buckets:
        for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket):
            for obj in page.get("Contents", []):
                result[(bucket, obj["Key"])] = (
                    obj["Size"],
                    obj["ETag"].strip('"'),
                    # HEAD uses HTTP-date (seconds); listings may include milliseconds.
                    obj["LastModified"].isoformat(timespec="seconds"),
                )
    return result


def assert_state(client: S3Client, expected: ObjectState) -> None:
    if inspect(client, expected.bucket, expected.key) != expected:
        raise MigrationError(f"object changed: {expected.bucket}/{expected.key}")


def download(
    client: S3Client, state: ObjectState, destination: BinaryIO | None = None
) -> str:
    response = client.get_object(
        Bucket=state.bucket, Key=state.key, IfMatch=f'"{state.etag}"'
    )
    sha = hashlib.sha256()
    size = 0
    try:
        for chunk in response["Body"].iter_chunks(chunk_size=1024 * 1024):
            sha.update(chunk)
            size += len(chunk)
            if destination is not None:
                destination.write(chunk)
    finally:
        response["Body"].close()
    if size != state.size:
        raise MigrationError(f"download size changed: {state.bucket}/{state.key}")
    return sha.hexdigest()


def metadata_matches(source: ObjectState, destination: ObjectState) -> bool:
    # Rclone may have added timestamps in an earlier copy; retain existing extras.
    return (
        source.headers == destination.headers
        and source.tags == destination.tags
        and all(destination.metadata.get(k) == v for k, v in source.metadata.items())
    )


def copy_object(
    source_client: S3Client,
    destination_client: S3Client,
    source: ObjectState,
    *,
    key: str | None = None,
    overwrite: bool = False,
) -> ObjectEvidence:
    destination_key = source.key if key is None else key
    with tempfile.TemporaryFile(mode="w+b") as body:
        sha = download(source_client, source, body)
        target = maybe_inspect(destination_client, source.bucket, destination_key)
        if target is not None:
            equal = target.size == source.size and metadata_matches(source, target)
            if equal and download(destination_client, target) == sha:
                assert_state(source_client, source)
                assert_state(destination_client, target)
                return ObjectEvidence(source=source, destination=target, sha256=sha)
            if not overwrite:
                raise MigrationError(
                    f"destination differs; use --overwrite only before cutover: {source.bucket}/{destination_key}"
                )
        body.seek(0)
        extra: dict[str, Any] = {**source.headers, "Metadata": source.metadata}
        if "Expires" in extra:
            extra["Expires"] = datetime.fromisoformat(extra["Expires"])
        if source.tags:
            extra["Tagging"] = urlencode(source.tags)
        destination_client.upload_fileobj(
            body, source.bucket, destination_key, ExtraArgs=extra, Config=TRANSFER
        )
    target = inspect(destination_client, source.bucket, destination_key)
    if (
        target.size != source.size
        or not metadata_matches(source, target)
        or download(destination_client, target) != sha
    ):
        raise MigrationError(
            f"copy verification failed: {source.bucket}/{destination_key}"
        )
    assert_state(source_client, source)
    assert_state(destination_client, target)
    return ObjectEvidence(source=source, destination=target, sha256=sha)
