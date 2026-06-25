"""add image file team visibility

Revision ID: 0004_image_file_team_visibility
Revises: 0003_image_file_annotation_json
Create Date: 2026-06-25 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0004_image_file_team_visibility"
down_revision = "0003_image_file_annotation_json"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "image_file_team_visibility",
        sa.Column("image_file_id", sa.Integer(), nullable=False, comment="影像文件ID"),
        sa.Column("team_id", sa.Integer(), nullable=False, comment="团队ID"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now(), comment="创建时间"),
        sa.ForeignKeyConstraint(["image_file_id"], ["image_files.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("image_file_id", "team_id"),
    )
    op.create_index(
        "idx_image_file_team_visibility_team",
        "image_file_team_visibility",
        ["team_id", "image_file_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_image_file_team_visibility_team", table_name="image_file_team_visibility")
    op.drop_table("image_file_team_visibility")
