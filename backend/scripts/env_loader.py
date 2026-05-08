"""Load project dotenv files for standalone backend scripts."""

from pathlib import Path

from dotenv import load_dotenv


DOTENV_FILES = (
    "dotenv/.env.runtime",
    "dotenv/.env.ports",
    "dotenv/.env.database",
    "dotenv/.env.redis",
    "dotenv/.env.minio",
    "dotenv/.env.storage",
    "dotenv/.env.backend",
    "dotenv/.env.frontend",
)


def load_project_env() -> None:
    """Load split project dotenv files without overriding process env."""
    project_root = Path(__file__).resolve().parents[2]

    for rel_path in DOTENV_FILES:
        load_dotenv(project_root / rel_path, override=False)

    # Backward-compatible local fallbacks for ad-hoc script runs.
    load_dotenv(project_root / ".env", override=False)
    load_dotenv(project_root / "backend" / ".env", override=False)
