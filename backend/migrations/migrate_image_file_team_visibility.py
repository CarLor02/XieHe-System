#!/usr/bin/env python3
"""Populate image_file_team_visibility for unambiguous legacy images."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(PROJECT_ROOT))

try:
    from backend.scripts.env_loader import load_project_env  # type: ignore[import-not-found] # noqa: E402
except ModuleNotFoundError:
    from scripts.env_loader import load_project_env  # type: ignore[import-not-found] # noqa: E402


def parse_args() -> argparse.Namespace:
    load_project_env()
    parser = argparse.ArgumentParser(
        description="Migrate legacy image ownership into image_file_team_visibility"
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL"),
        required=not os.getenv("DATABASE_URL"),
    )
    parser.add_argument("--apply", action="store_true", help="write rows instead of dry-run")
    parser.add_argument("--sample-limit", type=int, default=20)
    return parser.parse_args()


def user_team_ids(row: dict) -> list[int]:
    value = row["team_ids"] or ""
    return [int(item) for item in value.split(",") if item]


def main() -> int:
    args = parse_args()
    engine = create_engine(args.database_url)
    dry_run = not args.apply

    stats = {
        "auto_assigned": 0,
        "personal_system_admin": 0,
        "personal_no_team": 0,
        "personal_multi_team": 0,
        "already_assigned": 0,
    }
    samples: list[dict] = []

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT
                    image_files.id AS image_id,
                    image_files.uploaded_by AS uploader_id,
                    COALESCE(users.is_superuser, 0) AS is_superuser,
                    COALESCE(users.is_system_admin, 0) AS is_system_admin,
                    GROUP_CONCAT(DISTINCT team_memberships.team_id ORDER BY team_memberships.team_id) AS team_ids,
                    COUNT(DISTINCT team_memberships.team_id) AS team_count
                FROM image_files
                LEFT JOIN users ON users.id = image_files.uploaded_by
                LEFT JOIN team_memberships
                  ON team_memberships.user_id = image_files.uploaded_by
                 AND team_memberships.status = 'ACTIVE'
                WHERE image_files.is_deleted = 0
                GROUP BY
                    image_files.id,
                    image_files.uploaded_by,
                    users.is_superuser,
                    users.is_system_admin
                ORDER BY image_files.id
                """
            )
        ).mappings().all()

        for row in rows:
            image_id = row["image_id"]
            existing = conn.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM image_file_team_visibility
                    WHERE image_file_id = :image_id
                    """
                ),
                {"image_id": image_id},
            ).scalar_one()
            if existing:
                stats["already_assigned"] += 1
                continue

            if row["is_superuser"] or row["is_system_admin"]:
                stats["personal_system_admin"] += 1
                continue

            team_ids = user_team_ids(row)
            if len(team_ids) == 0:
                stats["personal_no_team"] += 1
                continue
            if len(team_ids) > 1:
                stats["personal_multi_team"] += 1
                if len(samples) < args.sample_limit:
                    samples.append(
                        {
                            "image_id": image_id,
                            "uploader_id": row["uploader_id"],
                            "candidate_team_ids": team_ids,
                        }
                    )
                continue

            stats["auto_assigned"] += 1
            if dry_run:
                continue

            conn.execute(
                text(
                    """
                    INSERT INTO image_file_team_visibility (image_file_id, team_id)
                    VALUES (:image_id, :team_id)
                    """
                ),
                {"image_id": image_id, "team_id": team_ids[0]},
            )

    mode = "dry-run" if dry_run else "apply"
    print(f"mode={mode}")
    for key, value in stats.items():
        print(f"{key}={value}")
    if samples:
        print("multi_team_samples=")
        for sample in samples:
            print(sample)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
