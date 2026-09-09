#!/bin/bash
# 使用模型共享环境在前台启动 LAT 服务。
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODEL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v uv >/dev/null 2>&1; then
    echo "请先安装 uv 0.12.10" >&2
    exit 1
fi

for weight in corner_model.pt cfh_model.pt; do
    if [[ ! -f "$SCRIPT_DIR/weights/$weight" ]]; then
        echo "模型文件不存在: $SCRIPT_DIR/weights/$weight" >&2
        exit 1
    fi
done

UV_PROJECT_ENVIRONMENT="$MODEL_ROOT/.venv" uv sync --project "$MODEL_ROOT" --locked --no-dev
cd "$MODEL_ROOT"
export PYTHONPATH="$MODEL_ROOT:${PYTHONPATH:-}"
exec "$MODEL_ROOT/.venv/bin/uvicorn" lat.interfaces.http.app:app --host 0.0.0.0 --port 8002
