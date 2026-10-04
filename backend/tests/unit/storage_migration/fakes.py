"""An in-memory S3 transport implementing the operations used by migration tests."""

from __future__ import annotations

import hashlib
import io
from datetime import datetime, timezone
from typing import Any, BinaryIO, cast
from urllib.parse import parse_qsl

from botocore.exceptions import ClientError
from botocore.response import StreamingBody
from mypy_boto3_s3.client import S3Client


def error(code: str) -> ClientError:
    return ClientError({"Error": {"Code": code, "Message": code}}, "S3")


class FakeS3:
    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], dict[str, Any]] = {}
        self.policies: dict[str, str] = {}
        self.buckets: set[str] = set()
        self.uploads = 0
        self.change_during_read = False

    @property
    def client(self) -> S3Client:
        return cast(S3Client, self)

    def seed(
        self,
        bucket: str,
        key: str,
        body: bytes,
        *,
        multipart: bool = False,
        **extra: Any,
    ) -> None:
        md5 = hashlib.md5(body).digest()
        etag = hashlib.md5(md5).hexdigest() + "-1" if multipart else md5.hex()
        self.buckets.add(bucket)
        self.objects[(bucket, key)] = {
            "Body": body,
            "ETag": f'"{etag}"',
            "ContentLength": len(body),
            "ContentType": "image/png",
            "Metadata": {"file-uuid": "sample"},
            "LastModified": datetime(2026, 10, 4, tzinfo=timezone.utc),
            "Tags": {},
            **extra,
        }

    def list_buckets(self) -> dict[str, Any]:
        return {"Buckets": [{"Name": b} for b in sorted(self.buckets)]}

    def get_bucket_versioning(self, **kwargs: Any) -> dict[str, Any]:
        return {}

    def head_bucket(self, *, Bucket: str) -> None:
        if Bucket not in self.buckets:
            raise error("404")

    def create_bucket(self, *, Bucket: str) -> None:
        self.buckets.add(Bucket)

    def get_bucket_policy(self, *, Bucket: str) -> dict[str, Any]:
        if Bucket not in self.policies:
            raise error("NoSuchBucketPolicy")
        return {"Policy": self.policies[Bucket]}

    def put_bucket_policy(self, *, Bucket: str, Policy: str) -> None:
        self.policies[Bucket] = Policy

    def get_bucket_cors(self, **kwargs: Any) -> dict[str, Any]:
        raise error("NoSuchCORSConfiguration")

    def get_paginator(self, name: str) -> FakeS3:
        return self

    def paginate(self, *, Bucket: str) -> list[dict[str, Any]]:
        return [
            {
                "Contents": [
                    {
                        "Key": key,
                        "Size": obj["ContentLength"],
                        "ETag": obj["ETag"],
                        "LastModified": obj["LastModified"],
                    }
                    for (bucket, key), obj in self.objects.items()
                    if bucket == Bucket
                ]
            }
        ]

    def head_object(self, *, Bucket: str, Key: str) -> dict[str, Any]:
        if (Bucket, Key) not in self.objects:
            raise error("404")
        result = {k: v for k, v in self.objects[(Bucket, Key)].items() if k != "Body"}
        result["LastModified"] = result["LastModified"].replace(microsecond=0)
        return result

    def get_object_tagging(self, *, Bucket: str, Key: str) -> dict[str, Any]:
        result = {
            "TagSet": [
                {"Key": k, "Value": v}
                for k, v in self.objects[(Bucket, Key)]["Tags"].items()
            ]
        }
        return result

    def get_object(self, *, Bucket: str, Key: str, IfMatch: str) -> dict[str, Any]:
        obj = self.objects[(Bucket, Key)]
        if obj["ETag"] != IfMatch:
            raise error("PreconditionFailed")
        result = {"Body": StreamingBody(io.BytesIO(obj["Body"]), obj["ContentLength"])}
        if self.change_during_read:
            self.seed(Bucket, Key, b"changed")
        return result

    def upload_fileobj(
        self,
        body: BinaryIO,
        bucket: str,
        key: str,
        *,
        ExtraArgs: dict[str, Any],
        Config: Any,
    ) -> None:
        self.uploads += 1
        self.seed(
            bucket,
            key,
            body.read(),
            Tags=dict(parse_qsl(ExtraArgs.get("Tagging", ""))),
            **{k: v for k, v in ExtraArgs.items() if k != "Tagging"},
        )
