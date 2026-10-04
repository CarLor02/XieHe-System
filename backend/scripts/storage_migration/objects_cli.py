"""Object migration command line entry point."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from botocore.exceptions import BotoCoreError, ClientError

from .artifacts import MigrationError, load_manifest, save
from .config import arguments, connections, values
from .object_migration import migrate, verify


def progress(current: int, total: int) -> None:
    if current % 50 == 0 or current == total:
        print(f"verified {current}/{total}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="复制 MinIO 当前对象到 RustFS 并校验，保留源数据"
    )
    arguments(parser)
    commands = parser.add_subparsers(dest="command", required=True)
    copy_parser = commands.add_parser("copy")
    copy_parser.add_argument(
        "--bucket", action="append", help="可重复；省略则复制源端全部 bucket"
    )
    copy_parser.add_argument("--output", required=True, type=Path)
    copy_parser.add_argument("--workers", type=int, choices=range(1, 17), default=4)
    copy_parser.add_argument(
        "--overwrite",
        action="store_true",
        help="允许更新目标已有的不同对象；仅在切换前使用",
    )
    verify_parser = commands.add_parser("verify")
    verify_parser.add_argument("--manifest", required=True, type=Path)
    args = parser.parse_args()
    try:
        clients = connections(args, values(args.env_file))
        if args.command == "verify":
            manifest = load_manifest(args.manifest)
            verify(clients, manifest, full=True)
            print(
                f"verified {len(manifest.objects)} objects; source inventory unchanged"
            )
            return
        if args.output.exists():
            raise MigrationError(
                "output already exists; use a new manifest path for each run"
            )
        manifest = migrate(clients, args.bucket, args.workers, args.overwrite, progress)
        save(args.output, manifest)
        changed = sum(o.source.etag != o.destination.etag for o in manifest.objects)
        print(
            f"completed: objects={len(manifest.objects)} etag_changed={changed} manifest={args.output}"
        )
    except (MigrationError, ValueError, OSError) as exc:
        parser.exit(1, f"migration failed: {exc}\n")
    except (BotoCoreError, ClientError) as exc:
        print(
            f"S3 operation failed ({type(exc).__name__}); no verified manifest published",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
