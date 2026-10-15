"""Export persisted annotations selected by an XLSX list or an entire team."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from app.contexts.imaging.application.dto import DatasetExportItemResult
from app.contexts.imaging.application.errors import DatasetExportTeamResolutionError
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


def non_empty_text(value: str) -> str:
    parsed = value.strip()
    if not parsed:
        raise argparse.ArgumentTypeError("不能为空")
    return parsed


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="按 Excel 文件名或整个团队导出 PNG、LabelMe JSON 和测量结果",
    )
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--input", type=Path, help="输入 XLSX 文件")
    selection.add_argument(
        "--all-team-images", action="store_true", help="导出团队全部影像，不限检查类型"
    )
    parser.add_argument("--output", required=True, type=Path, help="输出目录")
    parser.add_argument("--exam-type", help="Excel 模式检查类型精确值，默认侧位X光片")
    parser.add_argument(
        "--team-name",
        type=non_empty_text,
        help="只导出明确归属于该启用团队的影像（团队名称精确匹配）",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="覆盖输出目录中已有的同名 PNG 和 JSON",
    )
    parser.add_argument("--query-batch-size", type=positive_int, default=200)
    args = parser.parse_args(argv)
    if args.all_team_images:
        if args.team_name is None:
            parser.error("--all-team-images 必须提供 --team-name")
        if args.exam_type is not None:
            parser.error("--all-team-images 不接受 --exam-type，团队模式导出全部类型")
    elif args.exam_type is None:
        args.exam_type = "侧位X光片"
    return args


def _progress(current: int, total: int, result: DatasetExportItemResult) -> None:
    if (
        result.status not in {"exported", "missing_annotation"}
        or current % 25 == 0
        or current == total
    ):
        print(
            f"[{current}/{total or '?'}] {result.requested_filename}: {result.status}"
            + (f" - {result.detail}" if result.detail else "")
        )


async def run(args: argparse.Namespace) -> int:
    output_path = args.output.expanduser().resolve()
    input_path = args.input.expanduser().resolve() if args.input is not None else None
    if input_path is not None and not input_path.is_file():
        raise FileNotFoundError(f"输入工作簿不存在: {input_path}")

    database = SessionLocal()
    try:
        service = DatasetExportService(
            SqlAlchemyDatasetExportRepository(database),
            StorageServiceObjectStorage(),
        )
        if args.all_team_images:
            result = await service.run_team(
                team_name=str(args.team_name),
                output_directory=output_path,
                overwrite=bool(args.overwrite),
                query_batch_size=int(args.query_batch_size),
                on_progress=_progress,
            )
        else:
            assert input_path is not None
            result = await service.run(
                input_workbook=input_path,
                output_directory=output_path,
                exam_type=str(args.exam_type),
                overwrite=bool(args.overwrite),
                team_name=str(args.team_name) if args.team_name is not None else None,
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
    try:
        exit_code = asyncio.run(run(parse_args()))
    except DatasetExportTeamResolutionError as exc:
        print(f"团队筛选失败: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc
    raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
