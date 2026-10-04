#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PYTHONPATH="$PROJECT_DIR/backend${PYTHONPATH:+:$PYTHONPATH}"
exec uv run --project "$PROJECT_DIR/backend" --frozen --group storage-migration python -m scripts.storage_migration.objects_cli "$@"
