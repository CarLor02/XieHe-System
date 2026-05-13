from __future__ import annotations

import httpx
import pytest

from app.services.storage_gateway import StorageGateway


@pytest.mark.asyncio
async def test_storage_gateway_reuses_lifecycle_client() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"code": 200, "data": {"url": "http://files/image.png"}})

    gateway = StorageGateway(
        base_url="http://storage-service",
        token="test-token",
        timeout=1.0,
        async_transport=httpx.MockTransport(handler),
    )

    await gateway.start()
    first_client = gateway._client

    first_url = await gateway.presign_get(bucket="bucket", object_key="a.png", expires_in=60)
    second_url = await gateway.presign_get(bucket="bucket", object_key="b.png", expires_in=60)

    assert first_url == "http://files/image.png"
    assert second_url == "http://files/image.png"
    assert gateway._client is first_client
    assert [request.headers["X-Storage-Service-Token"] for request in requests] == [
        "test-token",
        "test-token",
    ]

    await gateway.stop()

    assert gateway._client is None
