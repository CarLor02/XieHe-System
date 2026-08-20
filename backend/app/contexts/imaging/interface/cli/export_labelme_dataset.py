"""Export persisted lateral annotations selected by an XLSX filename list."""

from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from app.contexts.imaging.application.dto import DatasetExportItemResult
from app.contexts.imaging.application.exports import DatasetExportService
from app.contexts.imaging.infrastructure.persistence.repositories import (
    SqlAlchemyDatasetExportRepository,
)
from app.contexts.imaging.infrastructure.storage import StorageServiceObjectStorage
from app.shared.database import SessionLocal
from app.shared.storage import storage_service_client


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("必须是正整数")
    return parsed


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="按 Excel 文件名导出侧位 PNG、LabelMe JSON 和测量结果",
    )
    parser.add_argument("--input", required=True, type=Path, help="输入 XLSX 文件")
    parser.add_argument("--output", required=True, type=Path, help="输出目录")
    parser.add_argument("--exam-type", default="侧位X光片", help="检查类型精确值")
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="覆盖输出目录中已有的同名 PNG 和 JSON",
    )
    parser.add_argument("--query-batch-size", type=positive_int, default=200)
    return parser.parse_args()


def _progress(current: int, total: int, result: DatasetExportItemResult) -> None:
    if (
        result.status not in {"exported", "missing_annotation"}
        or current % 25 == 0
        or current == total
    ):
        print(
            f"[{current}/{total}] {result.requested_filename}: {result.status}"
            + (f" - {result.detail}" if result.detail else "")
        )


async def run(args: argparse.Namespace) -> int:
    input_path = args.input.expanduser().resolve()
    output_path = args.output.expanduser().resolve()
    if not input_path.is_file():
        raise FileNotFoundError(f"输入工作簿不存在: {input_path}")

    database = SessionLocal()
    try:
        service = DatasetExportService(
            SqlAlchemyDatasetExportRepository(database),
            StorageServiceObjectStorage(),
        )
        result = await service.run(
            input_workbook=input_path,
            output_directory=output_path,
            exam_type=str(args.exam_type),
            overwrite=bool(args.overwrite),
            query_batch_size=int(args.query_batch_size),
            on_progress=_progress,
        )
    finally:
        database.close()
        await storage_service_client.stop()

    summary = result.summary
    print(
        "dataset export: "
        f"requested={summary.requested} succeeded={summary.succeeded} "
        f"empty_annotations={summary.empty_annotations} "
        f"not_found={summary.not_found} "
        f"duplicate_overwrites={summary.duplicate_overwrites} "
        f"object_missing={summary.object_missing} failed={summary.failed}"
    )
    print(f"输出目录: {output_path}")
    return 1 if result.has_failures else 0


def main() -> None:
    raise SystemExit(asyncio.run(run(parse_args())))


if __name__ == "__main__":
    main()
