#!/usr/bin/env python3
"""Deprecated Docker database initializer.

Database schema management is now handled by Alembic. This wrapper is kept for
operators who still call the old script name manually.
"""

from __future__ import annotations

import subprocess
import sys


def main() -> int:
    print("init_docker_db.py is deprecated; running `alembic upgrade head` instead.")
    return subprocess.call([sys.executable, "-m", "alembic", "upgrade", "head"])


if __name__ == "__main__":
    raise SystemExit(main())
