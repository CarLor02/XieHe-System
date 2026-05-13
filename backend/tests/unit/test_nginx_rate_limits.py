from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]


def _read_config(relative_path: str) -> str:
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


def test_frontend_nginx_declares_api_rate_limit_zones() -> None:
    config = _read_config("frontend/nginx.conf")

    assert "limit_req_zone $binary_remote_addr zone=api_general:10m rate=20r/s;" in config
    assert "limit_req_zone $binary_remote_addr zone=api_auth:10m rate=5r/m;" in config
    assert "limit_req_zone $binary_remote_addr zone=api_heavy:10m rate=2r/s;" in config
    assert "limit_req_zone $binary_remote_addr zone=api_upload:10m rate=5r/s;" in config
    assert "limit_conn_zone $binary_remote_addr zone=api_addr_conn:10m;" in config


def test_frontend_nginx_limits_high_risk_backend_paths() -> None:
    config = _read_config("frontend/nginx.conf")

    assert "location ~ ^/api/v1/auth/(login|logout)$" in config
    assert "location ~ ^/api/v1/auth/(register|refresh|password/(reset|reset/confirm|change))$" in config
    assert "limit_req zone=api_auth burst=3 nodelay;" in config
    assert "location = /api/v1/image-files/download-urls" in config
    assert "location ~ ^/api/v1/image-files/[0-9]+/ai/" in config
    assert "location ^~ /api/v1/ai-diagnosis/ai/" in config
    assert "location ^~ /api/v1/report-export/" in config
    assert "limit_req zone=api_heavy burst=4 nodelay;" in config
    assert "location ~ ^/api/v1/upload/sessions/[0-9]+/complete$" in config
    assert "limit_req zone=api_upload burst=10 nodelay;" in config
    assert "location /api/" in config
    assert "limit_req zone=api_general burst=40 nodelay;" in config


def test_outer_nginx_uses_same_rate_limit_zone_names() -> None:
    config = _read_config("infrastructure/nginx/nginx.conf")

    assert "zone=api_general:10m" in config
    assert "zone=api_auth:10m" in config
    assert "zone=api_heavy:10m" in config
    assert "zone=api_upload:10m" in config
