#!/usr/bin/env python3
"""批量导出带标注的影像训练数据（原图 + 归一化坐标 JSON）。

纯 HTTP 客户端脚本：通过后端公开 API 登录、分页查询、批量拉取标注与下载
地址，再从对象存储直链下载原图。不依赖 app 包或数据库直连，因此可在任意
能访问后端地址（Docker 是否暴露端口取决于部署配置）的机器上运行。下载后
会应用 EXIF Orientation、物理转正像素并重新编码为真正的 PNG，避免训练工具
忽略或丢失 EXIF 后造成图像与标注错位。

导出格式与前端 `frontend/app/imaging/features/batch-export` 的
`training-data` 导出内容一致：
- `{basename}.png`：物理转正且不依赖 EXIF 的 PNG 图像
- `{basename}_label.json`：归一化到 [0, 1] 的椎体角点/单点坐标

用法示例：
    python backend/scripts/batch_export_training_data.py \\
        --base-url http://<server-ip>:8080 \\
        --output ./training_export \\
        --description 正位X光片 \\
        --start-date 2026-01-01 --end-date 2026-08-01

用户名/密码建议通过环境变量 XIEHE_USERNAME / XIEHE_PASSWORD 传入，
或不传时交互式输入，避免出现在命令行历史中。

若部署环境的 MinIO 预签名下载直链使用了外部不可达的地址（例如
`MINIO_PUBLIC_ENDPOINT` 配置成了内网 IP 或已变更的旧公网 IP），可通过
`--resolve host:port:ip`（可重复传入，语义同 curl --resolve）把该 host:port
强制解析到实际可达的 IP，同时保留原始 Host 请求头以维持签名有效，例如：
    --resolve 115.190.121.59:3030:115.190.64.93
"""

from __future__ import annotations

import argparse
import getpass
import io
import json
import os
import re
import socket
import sys
import threading
import time
from collections.abc import Iterable, Sequence
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import requests
from PIL import Image, ImageOps, UnidentifiedImageError

POSE_LABELS = {"CR", "CL", "IR", "IL", "SR", "SL"}
DEFAULT_PAGE_SIZE = 100
BATCH_CHUNK_SIZE = 100
DOWNLOAD_RETRIES = 3
DOWNLOAD_RETRY_BACKOFF_SECONDS = 2.0
STATUS_CHOICES = [
    "UPLOADING",
    "UPLOADED",
    "PROCESSING",
    "PROCESSED",
    "FAILED",
    "ARCHIVED",
    "DELETED",
]
FILE_TYPE_CHOICES = ["DICOM", "JPEG", "PNG", "TIFF", "OTHER"]
_INVALID_FILENAME_CHARS = re.compile(r'[\\/:*?"<>|]')


class ApiError(RuntimeError):
    """后端 API 返回错误响应时抛出。"""


def parse_resolve_overrides(
    entries: Sequence[str] | None,
) -> dict[tuple[str, int], str]:
    """解析形如 host:port:ip 的 --resolve 参数（语义同 curl --resolve）。"""
    overrides: dict[tuple[str, int], str] = {}
    for entry in entries or []:
        parts = entry.split(":")
        if len(parts) != 3:
            raise ApiError(f"--resolve 参数格式错误，应为 host:port:ip，实际: {entry}")
        host, port_str, ip = parts
        try:
            port = int(port_str)
        except ValueError as exc:
            raise ApiError(f"--resolve 参数端口非法: {entry}") from exc
        overrides[(host, port)] = ip
    return overrides


def install_resolve_overrides(overrides: dict[tuple[str, int], str]) -> None:
    """在进程内覆写 DNS 解析结果，等价于 curl --resolve：

    只改变 TCP 连接目标 IP，不改变请求发送的 Host 头，因此不会破坏基于
    Host 签名的预签名 URL（如 MinIO presigned GET）。

    同时把涉及的 host 加入 NO_PROXY，避免本机系统代理（HTTP_PROXY 等环境
    变量）接管连接后导致 DNS 覆写失效——因为代理场景下实际发起 TCP 连接
    的是代理进程本身，而不是本进程的 socket.getaddrinfo。
    """
    if not overrides:
        return
    original_getaddrinfo = socket.getaddrinfo

    def patched_getaddrinfo(
        host: Any, port: Any, *args: Any, **kwargs: Any
    ) -> list[Any]:
        override_ip = overrides.get((host, int(port))) if host is not None else None
        if override_ip is not None:
            host = override_ip
        return original_getaddrinfo(host, port, *args, **kwargs)

    socket.getaddrinfo = patched_getaddrinfo

    hosts = {host for host, _ in overrides}
    existing_no_proxy = {
        entry.strip()
        for entry in os.environ.get("NO_PROXY", os.environ.get("no_proxy", "")).split(
            ","
        )
        if entry.strip()
    }
    merged_no_proxy = ",".join(sorted(existing_no_proxy | hosts))
    os.environ["NO_PROXY"] = merged_no_proxy
    os.environ["no_proxy"] = merged_no_proxy


@dataclass(frozen=True)
class ExportFilters:
    description: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    file_status: str | None = None
    file_type: str | None = None
    search: str | None = None
    uploaded_by: int | None = None
    team_ids: str | None = None

    def as_query_params(self) -> dict[str, str]:
        params: dict[str, str] = {}
        if self.description:
            params["description"] = self.description
        if self.start_date:
            params["start_date"] = self.start_date
        if self.end_date:
            params["end_date"] = self.end_date
        if self.file_status:
            params["file_status"] = self.file_status
        if self.file_type:
            params["file_type"] = self.file_type
        if self.search:
            params["search"] = self.search
        if self.uploaded_by is not None:
            params["uploaded_by"] = str(self.uploaded_by)
        if self.team_ids:
            params["team_ids"] = self.team_ids
        return params


@dataclass
class ExportStats:
    exported_with_label: int = 0
    exported_image_only: int = 0
    skipped_missing_dimensions: int = 0
    skipped_dimension_mismatch: int = 0
    failed: list[str] = field(default_factory=list)
    lock: threading.Lock = field(default_factory=threading.Lock)


def _extract_data(response: requests.Response) -> dict[str, Any]:
    if response.status_code >= 400:
        raise ApiError(f"请求失败 [{response.status_code}]: {response.text[:500]}")
    payload = response.json()
    data = payload.get("data")
    if not isinstance(data, dict):
        raise ApiError("响应缺少 data 字段")
    return data


class ApiClient:
    """后端 API v1 的轻量 HTTP 客户端。"""

    def __init__(self, base_url: str, *, timeout: float, verify_ssl: bool) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._session = requests.Session()
        self._session.verify = verify_ssl
        self._credentials: tuple[str, str] | None = None
        self._auth_lock = threading.Lock()

    def login(self, username: str, password: str) -> None:
        self._credentials = (username, password)
        self._do_login(username, password)

    def _do_login(self, username: str, password: str) -> None:
        response = self._session.post(
            f"{self._base_url}/api/v1/auth/login",
            json={"username": username, "password": password, "remember_me": True},
            timeout=self._timeout,
        )
        data = _extract_data(response)
        self._session.headers["Authorization"] = f"Bearer {data['access_token']}"

    def _reauthenticate(self) -> None:
        """访问令牌过期（多线程长时间导出场景常见）时重新登录。

        多个下载线程可能同时撞到 401，用锁避免并发重复登录。
        """
        if self._credentials is None:
            raise ApiError("未登录，无法重新认证")
        with self._auth_lock:
            self._do_login(*self._credentials)

    def _request_with_reauth(
        self, method: str, url: str, **kwargs: Any
    ) -> requests.Response:
        response = self._session.request(method, url, timeout=self._timeout, **kwargs)
        if response.status_code == 401:
            self._reauthenticate()
            response = self._session.request(
                method, url, timeout=self._timeout, **kwargs
            )
        return response

    def list_images(
        self, filters: ExportFilters, *, page: int, page_size: int
    ) -> tuple[list[dict[str, Any]], int]:
        params: dict[str, Any] = {"page": page, "page_size": page_size}
        params.update(filters.as_query_params())
        response = self._request_with_reauth(
            "GET", f"{self._base_url}/api/v1/image-files", params=params
        )
        data = _extract_data(response)
        items = data.get("items")
        if not isinstance(items, list):
            raise ApiError("影像列表响应格式异常")
        pagination = data.get("pagination") or {}
        total = int(pagination.get("total", len(items)))
        return items, total

    def get_annotations(self, ids: Sequence[int]) -> dict[int, dict[str, Any] | None]:
        response = self._request_with_reauth(
            "POST",
            f"{self._base_url}/api/v1/image-files/annotations/batch",
            json={"ids": list(ids)},
        )
        data = _extract_data(response)
        items = data.get("items")
        if not isinstance(items, list):
            raise ApiError("标注批量查询响应格式异常")
        return {int(item["id"]): item.get("annotation") for item in items}

    def get_download_urls(
        self, ids: Sequence[int]
    ) -> tuple[dict[int, str], dict[int, str]]:
        response = self._request_with_reauth(
            "POST",
            f"{self._base_url}/api/v1/image-files/download-urls",
            json={"ids": list(ids), "variant": "original"},
        )
        data = _extract_data(response)
        raw_items = data.get("items") or {}
        raw_errors = data.get("errors") or {}
        urls = {int(key): str(value["url"]) for key, value in raw_items.items()}
        errors = {
            int(key): str(value.get("message", "下载地址获取失败"))
            for key, value in raw_errors.items()
        }
        return urls, errors

    def download_bytes(self, url: str) -> bytes:
        # 下载直链是对象存储的预签名 URL，认证信息已内含在查询参数中；
        # 若沿用 session 的 Authorization 头会导致对象存储判定为
        # "multiple authentication types" 而拒绝请求，因此这里必须去掉。
        response = requests.get(url, timeout=self._timeout, verify=self._session.verify)
        response.raise_for_status()
        return response.content


def sanitize_filename(name: str) -> str:
    return _INVALID_FILENAME_CHARS.sub("_", name).strip() or "unnamed"


def filename_base(image: dict[str, Any]) -> str:
    """生成导出文件的基础文件名，以影像 ID 为前缀保证全局唯一。

    多张影像的 `original_filename` 可能重复（例如同名截图），仅用原始
    文件名会导致互相覆盖，因此始终加上 ID 前缀区分。
    """
    original = sanitize_filename(
        image.get("original_filename") or f"image_{image['id']}"
    )
    dot_index = original.rfind(".")
    stem = original[:dot_index] if dot_index > 0 else original
    return f"{image['id']}_{stem}"


def iter_all_images(
    client: ApiClient, filters: ExportFilters, *, page_size: int
) -> Iterable[dict[str, Any]]:
    page = 1
    while True:
        items, total = client.list_images(filters, page=page, page_size=page_size)
        if not items:
            return
        yield from items
        if page * page_size >= total:
            return
        page += 1


def chunked(items: Sequence[int], size: int) -> Iterable[Sequence[int]]:
    for offset in range(0, len(items), size):
        yield items[offset : offset + size]


def normalize_image_for_training_export(image_bytes: bytes) -> tuple[bytes, int, int]:
    """应用 EXIF 方向并返回不依赖元数据方向的 PNG 字节及实际尺寸。"""
    try:
        with Image.open(io.BytesIO(image_bytes)) as source:
            normalized = ImageOps.exif_transpose(source)
            normalized.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ApiError(f"无法解码下载的图像: {exc}") from exc

    # Pillow 的 PNG writer 不支持 CMYK、YCbCr 等模式；转换这些模式时保留
    # 可见像素。常见的灰度、RGB、RGBA、调色板和 16 位灰度则原样保留。
    png_modes = {"1", "L", "LA", "P", "RGB", "RGBA", "I", "I;16"}
    if normalized.mode not in png_modes:
        normalized = normalized.convert("RGB")

    width, height = normalized.size
    if width <= 0 or height <= 0:
        raise ApiError(f"转正后的图像尺寸非法: {width}x{height}")

    # 不把原始 EXIF 重新写入 PNG；像素已经物理转正，后续读取不再依赖
    # Orientation 标签。
    normalized.info.pop("exif", None)
    output = io.BytesIO()
    try:
        normalized.save(output, format="PNG")
    except OSError as exc:
        raise ApiError(f"无法将转正图像编码为 PNG: {exc}") from exc
    return output.getvalue(), width, height


def build_training_label_payload(
    image: dict[str, Any],
    vertebrae_layer: list[dict[str, Any]],
    image_width: float,
    image_height: float,
) -> dict[str, Any]:
    """与前端 buildTrainingLabelBlob 完全一致的坐标归一化逻辑。"""
    vertebrae: list[dict[str, Any]] = []
    for annotation in vertebrae_layer:
        label = str(annotation.get("label", ""))
        source = annotation.get("source")
        corners = annotation.get("corners") or []
        if label in POSE_LABELS:
            point = corners[0] if corners else {"x": 0, "y": 0}
            vertebrae.append(
                {
                    "label": label,
                    "type": "point",
                    "source": source,
                    "point": {
                        "x": point["x"] / image_width,
                        "y": point["y"] / image_height,
                    },
                }
            )
            continue
        vertebrae.append(
            {
                "label": label,
                "type": "vertebra",
                "source": source,
                "corners": [
                    {"x": corner["x"] / image_width, "y": corner["y"] / image_height}
                    for corner in corners
                ],
            }
        )

    return {
        "imageId": image["id"],
        "originalFilename": image.get("original_filename") or "",
        "imageWidth": image_width,
        "imageHeight": image_height,
        "vertebrae": vertebrae,
    }


def _record_failure(stats: ExportStats, message: str) -> None:
    with stats.lock:
        stats.failed.append(message)


def _download_with_retry(
    client: ApiClient,
    image_id: int,
    base: str,
    download_url: str | None,
    download_error: str | None,
    stats: ExportStats,
) -> bytes | None:
    """下载图片字节，遇到预签名过期（403）或瞬时网络错误时自动重试。

    每次重试前都会重新获取一次下载直链，避免因为排队等待导致预签名
    URL（默认 900 秒有效期）过期而失败。
    """
    last_error: str | None = None
    for attempt in range(1, DOWNLOAD_RETRIES + 1):
        is_last_attempt = attempt == DOWNLOAD_RETRIES
        if download_error or not download_url:
            last_error = download_error or "无下载地址"
            if is_last_attempt:
                _record_failure(stats, f"{image_id} ({base}): {last_error}")
                return None
        else:
            try:
                return client.download_bytes(download_url)
            except requests.RequestException as exc:
                last_error = f"下载失败 {exc}"
                if is_last_attempt:
                    _record_failure(stats, f"{image_id} ({base}): {last_error}")
                    return None
        time.sleep(DOWNLOAD_RETRY_BACKOFF_SECONDS * attempt)
        try:
            urls, errors = client.get_download_urls([image_id])
        except requests.RequestException as exc:
            download_url = None
            download_error = f"刷新下载地址失败 {exc}"
            continue
        download_url = urls.get(image_id)
        download_error = errors.get(image_id)
    if last_error is not None:
        _record_failure(stats, f"{image_id} ({base}): {last_error}")
    return None


def export_one_image(
    client: ApiClient,
    image: dict[str, Any],
    annotation: dict[str, Any] | None,
    download_url: str | None,
    download_error: str | None,
    output_dir: Path,
    stats: ExportStats,
) -> None:
    base = filename_base(image)
    image_id = int(image["id"])

    image_bytes = _download_with_retry(
        client, image_id, base, download_url, download_error, stats
    )
    if image_bytes is None:
        return
    try:
        normalized_bytes, actual_width, actual_height = (
            normalize_image_for_training_export(image_bytes)
        )
    except ApiError as exc:
        _record_failure(stats, f"{image_id} ({base}): {exc}")
        return

    vertebrae_layer = (annotation or {}).get("vertebraeLayer") or []
    image_width = (annotation or {}).get("imageWidth")
    image_height = (annotation or {}).get("imageHeight")

    (output_dir / f"{base}.png").write_bytes(normalized_bytes)

    if not vertebrae_layer or not image_width or not image_height:
        with stats.lock:
            stats.exported_image_only += 1
            if vertebrae_layer and (not image_width or not image_height):
                stats.skipped_missing_dimensions += 1
        return

    annotation_dimensions = (float(image_width), float(image_height))
    actual_dimensions = (float(actual_width), float(actual_height))
    if annotation_dimensions != actual_dimensions:
        with stats.lock:
            stats.exported_image_only += 1
            stats.skipped_dimension_mismatch += 1
        _record_failure(
            stats,
            (
                f"{image_id} ({base}): 标注尺寸 {image_width}x{image_height} "
                f"与应用 EXIF 后的图像尺寸 {actual_width}x{actual_height} 不一致，"
                "已跳过 label"
            ),
        )
        return

    label_payload = build_training_label_payload(
        image, vertebrae_layer, actual_width, actual_height
    )
    (output_dir / f"{base}_label.json").write_text(
        json.dumps(label_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    with stats.lock:
        stats.exported_with_label += 1


def run_export(
    client: ApiClient,
    filters: ExportFilters,
    output_dir: Path,
    *,
    page_size: int,
    concurrency: int,
    resume: bool,
) -> ExportStats:
    output_dir.mkdir(parents=True, exist_ok=True)
    stats = ExportStats()

    images = list(iter_all_images(client, filters, page_size=page_size))
    if not images:
        print("未找到匹配筛选条件的影像。")
        return stats
    print(f"匹配到 {len(images)} 张影像，开始导出……")

    if resume:
        pending_images = [
            image
            for image in images
            if not (output_dir / f"{filename_base(image)}.png").exists()
        ]
        skipped = len(images) - len(pending_images)
        if skipped:
            print(f"检测到已存在 {skipped} 张，跳过重复下载。")
        images = pending_images
        if not images:
            print("所有影像均已导出，无需继续。")
            return stats

    images_by_id = {int(image["id"]): image for image in images}
    all_ids = list(images_by_id.keys())

    annotations: dict[int, dict[str, Any] | None] = {}
    download_urls: dict[int, str] = {}
    download_errors: dict[int, str] = {}
    for chunk in chunked(all_ids, BATCH_CHUNK_SIZE):
        annotations.update(client.get_annotations(chunk))
        urls, errors = client.get_download_urls(chunk)
        download_urls.update(urls)
        download_errors.update(errors)

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures: list[Future[None]] = [
            executor.submit(
                export_one_image,
                client,
                image,
                annotations.get(image_id),
                download_urls.get(image_id),
                download_errors.get(image_id),
                output_dir,
                stats,
            )
            for image_id, image in images_by_id.items()
        ]
        for index, future in enumerate(as_completed(futures), start=1):
            future.result()
            if index % 50 == 0 or index == len(futures):
                print(f"进度: {index}/{len(futures)}")

    return stats


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="通过后端 API 批量导出带标注的影像训练数据。",
    )
    parser.add_argument(
        "--base-url",
        required=True,
        help="后端 API 基础地址，例如 http://<server-ip>:8080",
    )
    parser.add_argument("--output", type=Path, required=True, help="导出目录")
    parser.add_argument("--username", default=os.getenv("XIEHE_USERNAME"))
    parser.add_argument("--password", default=os.getenv("XIEHE_PASSWORD"))
    parser.add_argument("--description", help="按检查类型精确匹配，如 正位X光片")
    parser.add_argument("--start-date", help="创建时间起始日期 YYYY-MM-DD")
    parser.add_argument("--end-date", help="创建时间结束日期 YYYY-MM-DD")
    parser.add_argument("--status", choices=STATUS_CHOICES, help="影像文件状态")
    parser.add_argument("--file-type", choices=FILE_TYPE_CHOICES, help="影像文件类型")
    parser.add_argument("--search", help="按文件名/描述/患者名模糊搜索")
    parser.add_argument("--uploaded-by", type=int, help="按上传用户ID过滤")
    parser.add_argument("--team-ids", help="按团队ID过滤，逗号分隔")
    parser.add_argument(
        "--page-size", type=int, default=DEFAULT_PAGE_SIZE, help="列表分页大小"
    )
    parser.add_argument(
        "--concurrency", type=int, default=8, help="并发下载图片的线程数"
    )
    parser.add_argument("--timeout", type=float, default=60.0, help="HTTP 请求超时秒数")
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="跳过 TLS 证书校验（自签名证书场景使用）",
    )
    parser.add_argument(
        "--resolve",
        action="append",
        metavar="host:port:ip",
        help=(
            "将下载直链中的 host:port 强制解析到指定 ip（语义同 curl --resolve），"
            "用于绕过预签名地址配置了外部不可达 host 的问题；可重复传入"
        ),
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="跳过输出目录中已存在同名 .png 的影像，用于断点续传/重跑失败项",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)

    try:
        install_resolve_overrides(parse_resolve_overrides(args.resolve))
    except ApiError as exc:
        print(f"参数错误: {exc}", file=sys.stderr)
        return 2

    username = args.username or input("用户名: ")
    password = args.password or getpass.getpass("密码: ")

    client = ApiClient(
        args.base_url, timeout=args.timeout, verify_ssl=not args.insecure
    )
    try:
        client.login(username, password)
    except (ApiError, requests.RequestException) as exc:
        print(f"登录失败: {exc}", file=sys.stderr)
        return 2

    filters = ExportFilters(
        description=args.description,
        start_date=args.start_date,
        end_date=args.end_date,
        file_status=args.status,
        file_type=args.file_type,
        search=args.search,
        uploaded_by=args.uploaded_by,
        team_ids=args.team_ids,
    )

    try:
        stats = run_export(
            client,
            filters,
            args.output,
            page_size=args.page_size,
            concurrency=args.concurrency,
            resume=args.resume,
        )
    except (ApiError, requests.RequestException) as exc:
        print(f"导出失败: {exc}", file=sys.stderr)
        return 2

    print("\n导出完成:")
    print(f"  含标注（图+label.json）: {stats.exported_with_label}")
    print(f"  仅图片（无标注/坐标）:   {stats.exported_image_only}")
    if stats.skipped_missing_dimensions:
        print(f"  其中缺少图像尺寸而跳过 label: {stats.skipped_missing_dimensions}")
    if stats.skipped_dimension_mismatch:
        print(
            f"  其中图像/标注尺寸不一致而跳过 label: {stats.skipped_dimension_mismatch}"
        )
    if stats.failed:
        print(f"  失败: {len(stats.failed)}")
        for message in stats.failed[:20]:
            print(f"    - {message}")
        if len(stats.failed) > 20:
            print(f"    ……以及其他 {len(stats.failed) - 20} 条失败记录")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
