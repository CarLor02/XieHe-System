"""Copy current bucket contents and publish a fully verified, stable manifest."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

from botocore.exceptions import ClientError
from mypy_boto3_s3.client import S3Client

from .artifacts import Manifest, MigrationError, ObjectEvidence, now
from .config import Connections
from .s3 import assert_state, copy_object, download, inspect, listing


def optional(client: S3Client, operation: str, bucket: str) -> dict[str, Any]:
    method: Callable[..., dict[str, Any]] = getattr(client, operation)
    try:
        return method(Bucket=bucket)
    except ClientError as exc:
        if str(exc.response["Error"].get("Code")) in {
            "NoSuchBucketPolicy",
            "NoSuchCORSConfiguration",
        }:
            return {}
        raise


def ensure_bucket(source: S3Client, destination: S3Client, bucket: str) -> None:
    # History/retention require a separate strategy; this tool cannot silently flatten them.
    if source.get_bucket_versioning(Bucket=bucket).get("Status"):
        raise MigrationError(
            f"versioned bucket is not supported by current-object migration: {bucket}"
        )
    try:
        destination.head_bucket(Bucket=bucket)
    except ClientError as exc:
        if str(exc.response["Error"].get("Code")) not in {
            "404",
            "NoSuchBucket",
            "NotFound",
        }:
            raise
        destination.create_bucket(Bucket=bucket)


def copy_bucket_settings(source: S3Client, destination: S3Client, bucket: str) -> None:
    policy = optional(source, "get_bucket_policy", bucket).get("Policy")
    target_policy = optional(destination, "get_bucket_policy", bucket).get("Policy")
    if policy:
        destination.put_bucket_policy(Bucket=bucket, Policy=policy)
    elif target_policy:
        raise MigrationError(f"destination has an unexpected bucket policy: {bucket}")
    cors = optional(source, "get_bucket_cors", bucket).get("CORSRules")
    target_cors = optional(destination, "get_bucket_cors", bucket).get("CORSRules")
    if cors:
        destination.put_bucket_cors(
            Bucket=bucket, CORSConfiguration={"CORSRules": cors}
        )
    elif target_cors:
        raise MigrationError(f"destination has unexpected CORS rules: {bucket}")


def migrate(
    connections: Connections,
    buckets: list[str] | None,
    workers: int,
    overwrite: bool,
    progress: Callable[[int, int], None],
) -> Manifest:
    source, destination = connections.source, connections.destination
    selected = buckets or [
        bucket["Name"] for bucket in source.list_buckets().get("Buckets", [])
    ]
    if not selected or len(set(selected)) != len(selected):
        raise MigrationError("bucket list must be nonempty and unique")
    for bucket in selected:
        ensure_bucket(source, destination, bucket)
    before = listing(source, selected)

    def migrate_one(ref: tuple[str, str]) -> ObjectEvidence:
        state = inspect(source, *ref)
        if (state.size, state.etag, state.last_modified) != before[ref]:
            raise MigrationError(f"source changed since listing: {ref}")
        return copy_object(source, destination, state, overwrite=overwrite)

    objects = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for evidence in pool.map(migrate_one, sorted(before)):
            objects.append(evidence)
            progress(len(objects), len(before))
    if listing(source, selected) != before:
        raise MigrationError(
            "source inventory changed; stop writers and repeat before publishing a manifest"
        )
    for bucket in selected:
        copy_bucket_settings(source, destination, bucket)
    return Manifest(
        source_endpoint=connections.source_endpoint,
        destination_endpoint=connections.destination_endpoint,
        completed_at=now(),
        buckets=selected,
        objects=objects,
    )


def verify(connections: Connections, manifest: Manifest, *, full: bool = False) -> None:
    if (connections.source_endpoint, connections.destination_endpoint) != (
        manifest.source_endpoint,
        manifest.destination_endpoint,
    ):
        raise MigrationError("configured endpoints differ from manifest")
    expected = {
        (o.source.bucket, o.source.key): (
            o.source.size,
            o.source.etag,
            o.source.last_modified,
        )
        for o in manifest.objects
    }
    if listing(connections.source, manifest.buckets) != expected:
        raise MigrationError("source inventory differs from manifest; copy again")
    for obj in manifest.objects:
        assert_state(connections.source, obj.source)
        assert_state(connections.destination, obj.destination)
        if full and (
            download(connections.source, obj.source) != obj.sha256
            or download(connections.destination, obj.destination) != obj.sha256
        ):
            raise MigrationError(
                f"content mismatch: {obj.source.bucket}/{obj.source.key}"
            )
