"""基于 SQLAlchemy 的系统配置和统计仓储。"""

import enum

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.contexts.system_management.application.dto import (
    SystemConfigItem,
    SystemCounts,
)

from .models import SystemConfig


def _enum_value(value: object) -> str:
    if isinstance(value, enum.Enum):
        return str(value.value)
    return str(value)


class SqlAlchemySystemRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_configs(
        self,
        *,
        config_type: str | None,
        is_system: bool | None,
    ) -> list[SystemConfigItem]:
        query = self._session.query(SystemConfig)
        if config_type is not None:
            query = query.filter(SystemConfig.config_type == config_type)
        if is_system is not None:
            query = query.filter(SystemConfig.is_system == is_system)
        records = query.filter(SystemConfig.is_deleted.is_(False)).all()
        return [
            SystemConfigItem(
                config_key=str(record.config_key),
                config_name=str(record.config_name),
                config_value=str(record.config_value or ""),
                config_type=_enum_value(record.config_type),
                data_type=_enum_value(record.data_type),
                description=(
                    str(record.description) if record.description is not None else None
                ),
            )
            for record in records
        ]

    def get_counts(self) -> SystemCounts:
        queries = {
            "total_patients": "SELECT COUNT(*) FROM patients WHERE is_deleted = 0",
            "total_studies": "SELECT COUNT(*) FROM image_files WHERE is_deleted = 0",
            "total_reports": (
                "SELECT COUNT(*) FROM diagnostic_reports WHERE is_deleted = 0"
            ),
            "active_users": "SELECT COUNT(*) FROM users WHERE is_deleted = 0",
        }
        values = {
            name: int(self._session.execute(text(sql)).scalar() or 0)
            for name, sql in queries.items()
        }
        return SystemCounts(**values)

    def database_is_healthy(self) -> bool:
        try:
            self._session.execute(text("SELECT 1"))
        except Exception:
            return False
        return True
