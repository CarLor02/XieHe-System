from __future__ import annotations

import httpx
import pytest

from app.shared.storage import StorageServiceClient


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
