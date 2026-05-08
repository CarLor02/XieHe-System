"""bootstrap schema and migrate image storage to MinIO

Revision ID: 20260508_0001
Revises:
Create Date: 2026-05-08 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260508_0001"
down_revision = None
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _create_current_schema() -> None:
    from app import models  # noqa: F401
    from app.models.base import Base

    Base.metadata.create_all(bind=op.get_bind())


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if column.name not in _columns(table_name):
        op.add_column(table_name, column)


def _drop_column_if_present(table_name: str, column_name: str) -> None:
    if column_name in _columns(table_name):
        op.drop_column(table_name, column_name)


def upgrade() -> None:
    tables = _tables()
    if not (tables - {"alembic_version"}):
        _create_current_schema()
        return

    if "image_files" in tables:
        _add_column_if_missing(
            "image_files",
            sa.Column(
                "storage_bucket",
                sa.String(length=128),
                nullable=True,
                comment="对象存储桶",
            ),
        )
        _add_column_if_missing(
            "image_files",
            sa.Column(
                "object_key",
                sa.String(length=500),
                nullable=True,
                comment="对象存储Key",
            ),
        )
        _add_column_if_missing(
            "image_files",
            sa.Column("storage_etag", sa.String(length=128), nullable=True, comment="对象存储ETag"),
        )

        columns = _columns("image_files")
        if "storage_path" in columns:
            op.execute(
                """
                UPDATE image_files
                SET
                    storage_bucket = COALESCE(storage_bucket, 'medical_image_files'),
                    object_key = COALESCE(
                        object_key,
                        CASE
                            WHEN storage_path LIKE 'completed/%'
                            THEN SUBSTRING(storage_path, 11)
                            ELSE storage_path
                        END
                    )
                WHERE object_key IS NULL OR storage_bucket IS NULL
                """
            )
        else:
            op.execute(
                """
                UPDATE image_files
                SET
                    storage_bucket = COALESCE(storage_bucket, 'medical_image_files'),
                    object_key = COALESCE(object_key, file_uuid)
                WHERE object_key IS NULL OR storage_bucket IS NULL
                """
            )

        op.alter_column("image_files", "storage_bucket", existing_type=sa.String(length=128), nullable=False)
        op.alter_column("image_files", "object_key", existing_type=sa.String(length=500), nullable=False)

        for column_name in (
            "storage_path",
            "modality",
            "body_part",
            "is_chunked",
            "total_chunks",
            "uploaded_chunks",
        ):
            _drop_column_if_present("image_files", column_name)

    if "users" in tables:
        _add_column_if_missing(
            "users",
            sa.Column("avatar_storage_bucket", sa.String(length=128), nullable=True, comment="头像对象存储桶"),
        )
        _add_column_if_missing(
            "users",
            sa.Column("avatar_object_key", sa.String(length=500), nullable=True, comment="头像对象Key"),
        )
        _add_column_if_missing(
            "users",
            sa.Column("avatar_storage_etag", sa.String(length=128), nullable=True, comment="头像对象ETag"),
        )
        _add_column_if_missing(
            "users",
            sa.Column("avatar_deleted_at", sa.DateTime(), nullable=True, comment="头像软删除时间"),
        )


def downgrade() -> None:
    if "image_files" in _tables():
        _add_column_if_missing(
            "image_files",
            sa.Column("storage_path", sa.String(length=500), nullable=True, comment="文件存储路径(相对路径)"),
        )
        op.execute("UPDATE image_files SET storage_path = object_key WHERE storage_path IS NULL")
        for column_name in ("storage_bucket", "object_key", "storage_etag"):
            _drop_column_if_present("image_files", column_name)

    if "users" in _tables():
        for column_name in (
            "avatar_storage_bucket",
            "avatar_object_key",
            "avatar_storage_etag",
            "avatar_deleted_at",
        ):
            _drop_column_if_present("users", column_name)
