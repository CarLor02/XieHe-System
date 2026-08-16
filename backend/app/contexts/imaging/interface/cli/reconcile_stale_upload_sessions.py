"""Inspect or repair stale image uploads and legacy placeholders."""

from __future__ import annotations

import argparse
import asyncio

from app.contexts.imaging.application import (
    ImageUploadSessionService,
    ImageVisibilityApplicationService,
    ThumbnailSchedulingService,
    UploadReconciliationService,
    UploadSessionConfiguration,
)
from app.contexts.imaging.infrastructure.messaging import (
    KafkaAiTaskPublisher,
    KafkaThumbnailTaskPublisher,
    start_ai_task_publisher,
    start_thumbnail_task_publisher,
    stop_ai_task_publisher,
    stop_thumbnail_task_publisher,
)
from app.contexts.imaging.infrastructure.persistence.repositories import (
    SqlAlchemyImageImportRepository,
    SqlAlchemyImageVisibilityRepository,
    SqlAlchemyThumbnailSchedulingRepository,
    SqlAlchemyUploadSessionRepository,
)
from app.contexts.imaging.infrastructure.storage import StorageServiceObjectStorage
from app.core.config import settings
from app.shared.database import SessionLocal


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("必须是正整数")
    return parsed


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="检查或修复过期影像上传")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="只检查，不修改数据")
    mode.add_argument("--execute", action="store_true", help="执行恢复或清理")
    parser.add_argument("--stale-after-seconds", type=positive_int, default=1800)
    parser.add_argument("--batch-size", type=positive_int, default=100)
    parser.add_argument("--from-id", type=positive_int, default=1)
    parser.add_argument("--limit", type=positive_int)
    return parser.parse_args()


async def run(args: argparse.Namespace) -> int:
    db = SessionLocal()
    upload_repository = SqlAlchemyUploadSessionRepository(db)
    import_repository = SqlAlchemyImageImportRepository(db)
    thumbnail_publisher = KafkaThumbnailTaskPublisher()
    thumbnail_service = ThumbnailSchedulingService(
        SqlAlchemyThumbnailSchedulingRepository(db),
        thumbnail_publisher,
    )
    storage = StorageServiceObjectStorage()
    session_service = ImageUploadSessionService(
        upload_repository,
        ImageVisibilityApplicationService(SqlAlchemyImageVisibilityRepository(db)),
        storage,
        thumbnail_service,
        UploadSessionConfiguration(
            bucket=settings.IMAGE_FILE_BUCKET,
            part_size=settings.STORAGE_MULTIPART_PART_SIZE,
            expires_in=settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
            completion_lease_seconds=settings.IMAGE_UPLOAD_COMPLETION_LEASE_SECONDS,
        ),
    )
    service = UploadReconciliationService(
        upload_repository,
        import_repository,
        session_service,
        storage,
        thumbnail_service,
        KafkaAiTaskPublisher(),
    )
    ai_publisher_started = False
    thumbnail_publisher_started = False
    try:
        if args.execute:
            await start_ai_task_publisher()
            ai_publisher_started = True
            await start_thumbnail_task_publisher()
            thumbnail_publisher_started = True
        result = await service.run(
            dry_run=args.dry_run,
            stale_after_seconds=args.stale_after_seconds,
            batch_size=args.batch_size,
            from_id=args.from_id,
            limit=args.limit,
        )
    finally:
        try:
            try:
                if thumbnail_publisher_started:
                    await stop_thumbnail_task_publisher()
            finally:
                if ai_publisher_started:
                    await stop_ai_task_publisher()
        finally:
            db.close()

    print(
        "upload reconciliation: "
        f"scanned={result.scanned} recovered={result.recovered} "
        f"expired={result.expired} aborted={result.aborted} "
        f"skipped={result.skipped} failed={result.failed} legacy={result.legacy}"
    )
    return 1 if result.failed else 0


def main() -> None:
    raise SystemExit(asyncio.run(run(parse_args())))


if __name__ == "__main__":
    main()
