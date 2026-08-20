from __future__ import annotations

import io

import httpx
import pytest

from app.shared.storage import StorageServiceClient, StorageServiceError


@pytest.mark.asyncio
async def test_storage_service_client_reuses_lifecycle_client() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200, json={"code": 200, "data": {"url": "http://files/image.png"}}
        )

    client = StorageServiceClient(
        base_url="http://storage-service",
        token="test-token",
        timeout=1.0,
        async_transport=httpx.MockTransport(handler),
    )

    await client.start()
    first_client = client._client

    first_url = await client.presign_get(
        bucket="bucket", object_key="a.png", expires_in=60
    )
    second_url = await client.presign_get(
        bucket="bucket", object_key="b.png", expires_in=60
    )

    assert first_url == "http://files/image.png"
    assert second_url == "http://files/image.png"
    assert client._client is first_client
    assert [request.headers["X-Storage-Service-Token"] for request in requests] == [
        "test-token",
        "test-token",
    ]

    await client.stop()

    assert client._client is None


@pytest.mark.asyncio
async def test_storage_service_client_preserves_http_status_for_error_classification() -> (
    None
):
    client = StorageServiceClient(
        base_url="http://storage-service",
        token="test-token",
        timeout=1.0,
        async_transport=httpx.MockTransport(
            lambda _request: httpx.Response(404, text="object not found")
        ),
    )

    with pytest.raises(StorageServiceError) as exc_info:
        await client.stat_object(bucket="bucket", object_key="missing.png")

    assert exc_info.value.status_code == 404
    await client.stop()


@pytest.mark.asyncio
async def test_streaming_download_preserves_http_status_for_error_classification() -> (
    None
):
    client = StorageServiceClient(
        base_url="http://storage-service",
        token="test-token",
        timeout=1.0,
        async_transport=httpx.MockTransport(
            lambda _request: httpx.Response(404, text="object not found")
        ),
    )

    with pytest.raises(StorageServiceError) as exc_info:
        await client.download_object_to(
            bucket="bucket",
            object_key="missing.png",
            destination=io.BytesIO(),
        )

    assert exc_info.value.status_code == 404
    await client.stop()


@pytest.mark.asyncio
@pytest.mark.parametrize("streaming", [False, True])
async def test_storage_service_client_wraps_transport_failures(streaming: bool) -> None:
    def fail(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    client = StorageServiceClient(
        base_url="http://storage-service",
        token="test-token",
        timeout=1.0,
        async_transport=httpx.MockTransport(fail),
    )

    with pytest.raises(StorageServiceError, match="unavailable") as exc_info:
        if streaming:
            await client.download_object_to(
                bucket="bucket",
                object_key="missing.png",
                destination=io.BytesIO(),
            )
        else:
            await client.stat_object(bucket="bucket", object_key="missing.png")

    assert exc_info.value.status_code is None
    await client.stop()
