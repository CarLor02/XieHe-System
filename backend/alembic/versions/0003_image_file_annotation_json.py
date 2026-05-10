"""migrate image file annotation to JSON

Revision ID: 0003_image_file_annotation_json
Revises: 0002_minio_storage
Create Date: 2026-05-10 00:30:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0003_image_file_annotation_json"
down_revision = "0002_minio_storage"
branch_labels = None
depends_on = None


def _has_annotation_column() -> bool:
    inspector = sa.inspect(op.get_bind())
    if "image_files" not in set(inspector.get_table_names()):
        return False
    return "annotation" in {column["name"] for column in inspector.get_columns("image_files")}


def upgrade() -> None:
    if not _has_annotation_column():
        return

    bind = op.get_bind()
    invalid_total = bind.execute(
        sa.text(
            """
            SELECT COUNT(*) AS total
            FROM image_files
            WHERE annotation IS NOT NULL
              AND JSON_VALID(annotation) = 0
            """
        )
    ).scalar_one()

    if invalid_total:
        invalid_ids = bind.execute(
            sa.text(
                """
                SELECT id
                FROM image_files
                WHERE annotation IS NOT NULL
                  AND JSON_VALID(annotation) = 0
                ORDER BY id
                LIMIT 20
                """
            )
        ).scalars().all()
        raise RuntimeError(
            "image_files.annotation contains invalid JSON; "
            f"refusing migration. invalid_count={invalid_total}, sample_ids={invalid_ids}"
        )

    op.execute(
        """
        ALTER TABLE image_files
        MODIFY annotation JSON NULL COMMENT '标注数据(JSON格式)'
        """
    )


def downgrade() -> None:
    if not _has_annotation_column():
        return

    op.execute(
        """
        ALTER TABLE image_files
        MODIFY annotation TEXT NULL COMMENT '标注数据(JSON格式)'
        """
    )
