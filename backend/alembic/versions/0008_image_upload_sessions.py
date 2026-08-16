"""add durable image upload sessions

Revision ID: 0008_image_upload_sessions
Revises: 0007_image_file_derivatives
Create Date: 2026-08-16 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0008_image_upload_sessions"
down_revision = "0007_image_file_derivatives"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "image_upload_sessions" in sa.inspect(bind).get_table_names():
        return
    op.create_table(
        "image_upload_sessions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.String(64), nullable=False),
        sa.Column("source_type", sa.String(32), nullable=False),
        sa.Column("batch_item_id", sa.Integer(), nullable=True),
        sa.Column("image_file_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("file_uuid", sa.String(64), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column(
            "file_type",
            sa.Enum("DICOM", "JPEG", "PNG", "TIFF", "OTHER", name="imagefiletypeenum"),
            nullable=False,
        ),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("expected_size", sa.BigInteger(), nullable=False),
        sa.Column("expected_hash", sa.String(64), nullable=True),
        sa.Column("storage_bucket", sa.String(128), nullable=False),
        sa.Column("object_key", sa.String(500), nullable=False),
        sa.Column("upload_id", sa.String(255), nullable=True),
        sa.Column("storage_etag", sa.String(128), nullable=True),
        sa.Column("uploaded_by", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("team_ids", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("completion_lease_expires_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["batch_item_id"], ["image_import_items.id"]),
        sa.ForeignKeyConstraint(["image_file_id"], ["image_files.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", name="uq_image_upload_session_public_id"),
        sa.UniqueConstraint("image_file_id", name="uq_image_upload_session_image"),
    )
    op.create_index(
        "idx_image_upload_session_status_expiry",
        "image_upload_sessions",
        ["status", "expires_at"],
    )
    op.create_index(
        "idx_image_upload_session_batch_item",
        "image_upload_sessions",
        ["batch_item_id"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    if "image_upload_sessions" not in sa.inspect(bind).get_table_names():
        return
    # MySQL uses the batch-item index to enforce its foreign key. Dropping the
    # table removes both indexes and constraints atomically; dropping that index
    # first fails with error 1553.
    op.drop_table("image_upload_sessions")
