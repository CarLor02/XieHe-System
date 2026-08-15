"""Queue missing historical card thumbnails without decoding images locally."""

from __future__ import annotations

import argparse
import asyncio

from app.contexts.imaging.application import (
    ThumbnailBackfillService,
    ThumbnailSchedulingService,
)
from app.contexts.imaging.infrastructure.messaging import (
    KafkaThumbnailTaskPublisher,
    start_thumbnail_task_publisher,
    stop_thumbnail_task_publisher,
)
from app.contexts.imaging.infrastructure.persistence.repositories import (
    SqlAlchemyThumbnailSchedulingRepository,
)
from app.shared.database import SessionLocal


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("必须是正整数")
    return parsed


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="补建历史影像缩略图任务")
    parser.add_argument("--batch-size", type=positive_int, default=100)
    parser.add_argument("--from-id", type=positive_int, default=1)
    parser.add_argument("--limit", type=positive_int)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


async def run(args: argparse.Namespace) -> int:
    session = SessionLocal()
    publisher = KafkaThumbnailTaskPublisher()
    repository = SqlAlchemyThumbnailSchedulingRepository(session)
    service = ThumbnailBackfillService(
        repository,
        ThumbnailSchedulingService(repository, publisher),
    )
    publisher_started = False
    try:
        if not args.dry_run:
            await start_thumbnail_task_publisher()
            publisher_started = True
        result = await service.run(
            batch_size=args.batch_size,
            from_id=args.from_id,
            limit=args.limit,
            dry_run=args.dry_run,
        )
    finally:
        if publisher_started:
            await stop_thumbnail_task_publisher()
        session.close()
    print(
        "thumbnail backfill: "
        f"scanned={result.scanned} queued={result.queued} "
        f"skipped={result.skipped} unsupported={result.unsupported} "
        f"failed={result.failed}"
    )
    return 1 if result.failed else 0


def main() -> None:
    raise SystemExit(asyncio.run(run(parse_args())))


if __name__ == "__main__":
    main()
