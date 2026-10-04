"""Plan, apply and rollback storage metadata without changing business content."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from botocore.exceptions import BotoCoreError, ClientError
from sqlalchemy.exc import SQLAlchemyError

from .artifacts import MigrationError, load_manifest, load_plan, save
from .config import arguments, connections, database_engine, database_identity, values
from .database import mutate
from .planning import check_storage, plan


def main() -> None:
    parser = argparse.ArgumentParser(
        description="生成、应用或回退对象存储数据库元数据迁移"
    )
    arguments(parser, database=True)
    commands = parser.add_subparsers(dest="command", required=True)
    plan_parser = commands.add_parser("plan")
    plan_parser.add_argument("--manifest", required=True, type=Path)
    plan_parser.add_argument("--output", required=True, type=Path)
    for name in ["apply", "rollback"]:
        command = commands.add_parser(name)
        command.add_argument("--plan", required=True, type=Path)
        command.add_argument(
            "--writers-stopped",
            action="store_true",
            required=True,
            help="已暂停用户及后台存储写入；脚本不自动停止服务或切换连接",
        )
    args = parser.parse_args()
    engine = None
    try:
        settings = values(args.env_file)
        clients = connections(args, settings)
        engine = database_engine(args, settings)
        if args.command == "plan":
            if args.output.exists():
                raise MigrationError("plan output already exists; choose a new path")
            document = plan(engine, load_manifest(args.manifest), clients)
            save(args.output, document)
            print(
                f"planned: records={len(document.snapshot)} changes={len(document.changes)} prepared_thumbnails={len(document.prepared_objects)} legacy_thumbnails={len(document.legacy_thumbnail_ids)} output={args.output}"
            )
            return
        document = load_plan(args.plan)
        if document.database != database_identity(engine):
            raise MigrationError("database identity differs from plan")
        if (document.source_endpoint, document.destination_endpoint) != (
            clients.source_endpoint,
            clients.destination_endpoint,
        ):
            raise MigrationError("configured endpoints differ from plan")
        reverse = args.command == "rollback"
        outcome = mutate(
            engine,
            document,
            reverse=reverse,
            preflight=lambda: check_storage(clients, document, reverse=reverse),
        )
        print(
            f"{outcome}: changes={len(document.changes)}; storage routing must be switched in the maintenance window"
        )
    except (MigrationError, ValueError, OSError) as exc:
        parser.exit(1, f"metadata migration failed: {exc}\n")
    except (BotoCoreError, ClientError, SQLAlchemyError) as exc:
        print(
            f"operation failed ({type(exc).__name__}); database transaction not committed",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc
    finally:
        if engine is not None:
            engine.dispose()


if __name__ == "__main__":
    main()
