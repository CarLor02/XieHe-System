#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USE_SECURITY="${XIEHE_COMPOSE_SECURITY:-0}"
USE_EXAMPLES="${XIEHE_COMPOSE_USE_EXAMPLES:-0}"
USE_RUSTFS="${XIEHE_COMPOSE_RUSTFS:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --security) USE_SECURITY=1; shift ;;
    --with-rustfs) USE_RUSTFS=1; shift ;;
    *) break ;;
  esac
done

COMPOSE_FILES=(
  "infrastructure/docker/compose/base.yml"
  "infrastructure/docker/compose/redis.yml"
  "infrastructure/docker/compose/mysql.yml"
  "infrastructure/docker/compose/minio.yml"
  "infrastructure/docker/compose/kafka.yml"
  "infrastructure/docker/compose/storage-service.yml"
  "infrastructure/docker/compose/logging-service.yml"
  "infrastructure/docker/compose/backend.yml"
  "infrastructure/docker/compose/frontend.yml"
)

if [[ "$USE_SECURITY" == "1" ]]; then
  COMPOSE_FILES+=("infrastructure/docker/compose/security.yml")
fi

# RustFS is a parallel migration target, not a dependency of normal MinIO startup.
if [[ "$USE_RUSTFS" == "1" ]]; then
  COMPOSE_FILES+=("infrastructure/docker/compose/rustfs.yml")
fi

ENV_FILES=(
  "dotenv/.env.runtime"
  "dotenv/.env.ports"
  "dotenv/.env.database"
  "dotenv/.env.redis"
  "dotenv/.env.cache"
  "dotenv/.env.minio"
  "dotenv/.env.kafka"
  "dotenv/.env.storage"
  "dotenv/.env.logging"
  "dotenv/.env.concurrency"
  "dotenv/.env.backend"
  "dotenv/.env.frontend"
)

if [[ "$USE_RUSTFS" == "1" ]]; then
  ENV_FILES+=("dotenv/.env.rustfs")
fi

cmd=(docker compose)

for env_file in "${ENV_FILES[@]}"; do
  full_path="$PROJECT_DIR/$env_file"
  example_path="$full_path.example"

  if [[ -f "$full_path" ]]; then
    cmd+=(--env-file "$full_path")
  elif [[ "$USE_EXAMPLES" == "1" && -f "$example_path" ]]; then
    cmd+=(--env-file "$example_path")
  else
    echo "Missing dotenv file: $env_file" >&2
    echo "Create it from $env_file.example or set XIEHE_COMPOSE_USE_EXAMPLES=1 for config validation." >&2
    exit 1
  fi
done

for compose_file in "${COMPOSE_FILES[@]}"; do
  cmd+=(-f "$PROJECT_DIR/$compose_file")
done

exec "${cmd[@]}" "$@"
