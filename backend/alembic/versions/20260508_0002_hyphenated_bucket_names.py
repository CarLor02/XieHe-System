"""rename MinIO buckets to hyphenated names

Revision ID: 20260508_0002
Revises: 20260508_0001
Create Date: 2026-05-08 00:10:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260508_0002"
down_revision = "20260508_0001"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    tables = _tables()
    if "image_files" in tables:
        op.execute(
            """
            UPDATE image_files
            SET storage_bucket = 'medical-image-files'
            WHERE storage_bucket = 'medical_image_files'
            """
        )
    if "users" in tables:
        op.execute(
            """
            UPDATE users
            SET avatar_storage_bucket = 'medical-user-avatars'
            WHERE avatar_storage_bucket = 'medical_user_avatars'
            """
        )


def downgrade() -> None:
    tables = _tables()
    if "image_files" in tables:
        op.execute(
            """
            UPDATE image_files
            SET storage_bucket = 'medical_image_files'
            WHERE storage_bucket = 'medical-image-files'
            """
        )
    if "users" in tables:
        op.execute(
            """
            UPDATE users
            SET avatar_storage_bucket = 'medical_user_avatars'
            WHERE avatar_storage_bucket = 'medical-user-avatars'
            """
        )
