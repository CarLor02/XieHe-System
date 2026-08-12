"""Alembic environment for XieHe backend."""

from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.contexts.access_control.infrastructure.persistence import (  # noqa: E402
    models as access_control_models,  # noqa: F401
)
from app.contexts.imaging.infrastructure import (  # noqa: E402
    persistence as imaging_persistence,  # noqa: F401
)
from app.contexts.patients.infrastructure.persistence import (  # noqa: E402
    models as patient_models,  # noqa: F401
)
from app.contexts.reports.infrastructure.persistence import (  # noqa: E402
    models as report_models,  # noqa: F401
)
from app.contexts.system_management.infrastructure.persistence import (  # noqa: E402
    models as system_management_models,  # noqa: F401
)
from app.contexts.teams.infrastructure.persistence import (  # noqa: E402
    models as team_models,  # noqa: F401
)
from app.core.config import settings  # noqa: E402
from app.shared.database.sqlalchemy import Base  # noqa: E402

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# 这些表来自未接入真实链路的旧系统模块。应用已停止映射它们，但生产数据在
# 完成独立核验前必须保留，因此 autogenerate 不能把“未映射”解释为“应删除”。
RETIRED_TABLES_RETAINED_IN_DATABASE = frozenset(
    {"notifications", "system_alerts", "system_logs", "system_monitors"}
)


def include_object(
    object_: object,
    name: str | None,
    type_: str,
    reflected: bool,
    compare_to: object | None,
) -> bool:
    del object_, reflected, compare_to
    return not (type_ == "table" and name in RETIRED_TABLES_RETAINED_IN_DATABASE)


def get_database_url() -> str:
    return os.getenv("DATABASE_URL") or settings.DATABASE_URL


def run_migrations_offline() -> None:
    context.configure(
        url=get_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_database_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
