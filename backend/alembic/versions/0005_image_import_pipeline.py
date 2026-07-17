"""add persistent image import pipeline

Revision ID: 0005_image_import_pipeline
Revises: 0004_image_file_team_visibility
Create Date: 2026-07-17 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0005_image_import_pipeline"
down_revision = "0004_image_file_team_visibility"
branch_labels = None
depends_on = None


def _columns(inspector: sa.Inspector, table: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "image_import_batches" not in tables:
        op.create_table(
            "image_import_batches",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("batch_id", sa.String(length=64), nullable=False),
            sa.Column("uploaded_by", sa.Integer(), nullable=False),
            sa.Column("patient_id", sa.Integer(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("team_ids", sa.JSON(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("total_items", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("uploaded_items", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("succeeded_items", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("failed_items", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
            sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("batch_id"),
        )
        op.create_index(
            "idx_image_import_batches_owner_created",
            "image_import_batches",
            ["uploaded_by", "created_at"],
        )

    inspector = sa.inspect(bind)
    if "image_import_items" not in set(inspector.get_table_names()):
        op.create_table(
            "image_import_items",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("batch_id", sa.Integer(), nullable=False),
            sa.Column("client_file_id", sa.String(length=128), nullable=False),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("size", sa.BigInteger(), nullable=False),
            sa.Column("mime_type", sa.String(length=100), nullable=False),
            sa.Column("file_hash", sa.String(length=64), nullable=True),
            sa.Column("image_file_id", sa.Integer(), nullable=True),
            sa.Column("upload_id", sa.String(length=255), nullable=True),
            sa.Column("upload_status", sa.String(length=32), nullable=False),
            sa.Column("ai_status", sa.String(length=32), nullable=False),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["batch_id"], ["image_import_batches.id"]),
            sa.ForeignKeyConstraint(["image_file_id"], ["image_files.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "batch_id",
                "client_file_id",
                name="uq_image_import_item_client",
            ),
        )
        op.create_index(
            "idx_image_import_items_batch_status",
            "image_import_items",
            ["batch_id", "upload_status", "ai_status"],
        )

    inspector = sa.inspect(bind)
    ai_columns = _columns(inspector, "ai_tasks")
    if "image_file_id" not in ai_columns:
        op.add_column("ai_tasks", sa.Column("image_file_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_ai_tasks_image_file_id",
            "ai_tasks",
            "image_files",
            ["image_file_id"],
            ["id"],
        )
    if "batch_item_id" not in ai_columns:
        op.add_column("ai_tasks", sa.Column("batch_item_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_ai_tasks_batch_item_id",
            "ai_tasks",
            "image_import_items",
            ["batch_item_id"],
            ["id"],
        )
        op.create_index("idx_ai_tasks_batch_item_id", "ai_tasks", ["batch_item_id"])
    if "attempt_count" not in ai_columns:
        op.add_column(
            "ai_tasks",
            sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        )

    # Historical baselines created study_id as NOT NULL. Keep the legacy column
    # readable, but allow new image-file tasks to omit it.
    inspector = sa.inspect(bind)
    ai_columns = _columns(inspector, "ai_tasks")
    if "study_id" in ai_columns and bind.dialect.name == "mysql":
        op.alter_column(
            "ai_tasks",
            "study_id",
            existing_type=sa.Integer(),
            nullable=True,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    ai_columns = _columns(inspector, "ai_tasks")
    if "attempt_count" in ai_columns:
        op.drop_column("ai_tasks", "attempt_count")
    if "batch_item_id" in ai_columns:
        indexes = {index["name"] for index in inspector.get_indexes("ai_tasks")}
        if "idx_ai_tasks_batch_item_id" in indexes:
            op.drop_index("idx_ai_tasks_batch_item_id", table_name="ai_tasks")
        foreign_keys = {
            foreign_key.get("name")
            for foreign_key in inspector.get_foreign_keys("ai_tasks")
        }
        if "fk_ai_tasks_batch_item_id" in foreign_keys:
            op.drop_constraint(
                "fk_ai_tasks_batch_item_id",
                "ai_tasks",
                type_="foreignkey",
            )
        op.drop_column("ai_tasks", "batch_item_id")
    op.drop_index("idx_image_import_items_batch_status", table_name="image_import_items")
    op.drop_table("image_import_items")
    op.drop_index("idx_image_import_batches_owner_created", table_name="image_import_batches")
    op.drop_table("image_import_batches")
