"""add versioned image file derivatives

Revision ID: 0007_image_file_derivatives
Revises: 0006_annotation_single_source
Create Date: 2026-08-15 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0007_image_file_derivatives"
down_revision = "0006_annotation_single_source"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "image_file_derivatives" in inspector.get_table_names():
        return

    op.create_table(
        "image_file_derivatives",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("image_file_id", sa.Integer(), nullable=False),
        sa.Column("variant", sa.String(length=32), nullable=False),
        sa.Column("source_storage_etag", sa.String(length=128), nullable=True),
        sa.Column("storage_bucket", sa.String(length=128), nullable=True),
        sa.Column("object_key", sa.String(length=500), nullable=True),
        sa.Column("storage_etag", sa.String(length=128), nullable=True),
        sa.Column("mime_type", sa.String(length=100), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("file_size", sa.BigInteger(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("next_retry_at", sa.DateTime(), nullable=True),
        sa.Column("lease_expires_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["image_file_id"],
            ["image_files.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "image_file_id",
            "variant",
            name="uq_image_file_derivative_variant",
        ),
    )
    op.create_index(
        "idx_image_file_derivatives_retry",
        "image_file_derivatives",
        ["status", "next_retry_at"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "image_file_derivatives" not in inspector.get_table_names():
        return
    op.drop_index(
        "idx_image_file_derivatives_retry",
        table_name="image_file_derivatives",
    )
    op.drop_table("image_file_derivatives")
