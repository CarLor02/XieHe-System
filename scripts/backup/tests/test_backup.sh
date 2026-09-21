#!/usr/bin/env bash
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TEMP="$(mktemp -d)"
trap 'rm -rf "$TEMP"' EXIT
export PATH="$ROOT/scripts/backup/tests/fixtures:$PATH"

prepare() {
  export MOCK_MODE="$1" MOCK_ROOT="$TEMP/$1" XIEHE_BACKUP_CONFIG="$TEMP/$1/backup.env"
  mkdir -p "$MOCK_ROOT/project/scripts" "$MOCK_ROOT/project/dotenv" "$MOCK_ROOT/project/infrastructure" "$MOCK_ROOT/backup/repository"
  cp "$ROOT/scripts/compose.sh" "$MOCK_ROOT/project/scripts/"
  local name
  for name in runtime ports database redis cache minio kafka storage logging concurrency backend frontend; do
    touch "$MOCK_ROOT/project/dotenv/.env.$name"
  done
  printf 'test-password\n' >"$MOCK_ROOT/password"
  printf '{}\n' >"$MOCK_ROOT/backup/repository/config"
  {
    printf 'PROJECT_DIR=%q\nBACKUP_ROOT=%q\nRESTIC_PASSWORD_FILE=%q\n' "$MOCK_ROOT/project" "$MOCK_ROOT/backup" "$MOCK_ROOT/password"
    printf 'CAPTURE_TIMEOUT_SECONDS=8\nRECOVERY_TIMEOUT_SECONDS=3\nMAINTENANCE_TIMEOUT_SECONDS=3\n'
  } >"$XIEHE_BACKUP_CONFIG"
  jq -n '["mysql", "redis", "minio", "kafka", "redis-cache", "storage-service", "logging-service", "backend", "ai-worker", "frontend", "thumbnail-worker"] | map(. as $s | {Id: ("id-" + $s), Image: "mock-image", Config: {Image: "fixture:1", Labels: {"com.docker.compose.service": $s, "com.docker.compose.project": "integration-fixture"}}, State: {Running: ($s != "thumbnail-worker"), Restarting: false, Paused: false, OOMKilled: false, ExitCode: 0, Health: {Status: "healthy"}}, Mounts: (if (["mysql", "redis", "minio", "kafka"] | index($s)) != null then [{Type: "volume", Name: ("nondefault-" + $s), Source: ("/volumes/" + $s), Destination: (if $s == "mysql" then "/var/lib/mysql" elif $s == "kafka" then "/var/lib/kafka/data" else "/data" end)}] else [] end)})' >"$MOCK_ROOT/containers.json"
}

assert_restored() {
  jq -e 'all(.[]; .State.Running == (.Config.Labels["com.docker.compose.service"] != "thumbnail-worker"))' "$MOCK_ROOT/containers.json" >/dev/null
  [[ ! -e "$MOCK_ROOT/backup/state/active.json" && ! -e "$MOCK_ROOT/tool" ]]
  if grep -q 'start id-thumbnail-worker' "$MOCK_ROOT/commands.log"; then exit 1; fi
  if grep -Eq 'logging_service_data|docker.sock.*dst=' "$MOCK_ROOT/commands.log"; then exit 1; fi
}

prepare init
before="$(sha256sum "$MOCK_ROOT/password" "$MOCK_ROOT/backup/repository/config")"
"$ROOT/scripts/backup/backup_database.sh" init >"$MOCK_ROOT/output.log" 2>&1
[[ "$before" == "$(sha256sum "$MOCK_ROOT/password" "$MOCK_ROOT/backup/repository/config")" ]]
if grep -Eq '(^| )stop |(^| )start |(^| )backup |(^| )forget ' "$MOCK_ROOT/commands.log"; then exit 1; fi
echo 'PASS: init preserves an existing password/repository without stopping services'

prepare success
"$ROOT/scripts/backup/backup_database.sh" run >"$MOCK_ROOT/output.log" 2>&1 || { cat "$MOCK_ROOT/output.log"; exit 1; }
assert_restored
[[ -f "$MOCK_ROOT/pruned" ]]
jq -e '.snapshot_id == "01234567" and .downtime_seconds >= 0' "$MOCK_ROOT/backup/last-success.json" >/dev/null
grep -q 'src=nondefault-minio,dst=/source/minio,readonly' "$MOCK_ROOT/commands.log"
echo 'PASS: cold backup, real mount discovery, retention after recovery, stopped worker preserved'

for mode in partial timeout; do
  prepare "$mode"
  printf '{"snapshot_id":"previous-success"}\n' >"$MOCK_ROOT/backup/last-success.json"
  result=0
  "$ROOT/scripts/backup/backup_database.sh" run >"$MOCK_ROOT/output.log" 2>&1 || result=$?
  [[ "$result" != 0 ]] || { cat "$MOCK_ROOT/output.log"; exit 1; }
  assert_restored
  [[ ! -e "$MOCK_ROOT/pruned" ]]
  if [[ "$mode" == timeout ]]; then grep -q '^stop --time 60 ' "$MOCK_ROOT/commands.log"; fi
  jq -e '.snapshot_id == "previous-success"' "$MOCK_ROOT/backup/last-success.json" >/dev/null
  echo "PASS: $mode failure restores services without retaining a false success or pruning"
done

prepare interrupt
"$ROOT/scripts/backup/backup_database.sh" run >"$MOCK_ROOT/output.log" 2>&1 &
pid=$!
for ((i=0; i<60; i++)); do
  [[ -f "$MOCK_ROOT/backup-entered" ]] && break
  sleep 0.1
done
[[ -f "$MOCK_ROOT/backup-entered" ]] || { wait "$pid" || true; cat "$MOCK_ROOT/output.log"; exit 1; }
kill -TERM "$pid"
result=0
wait "$pid" || result=$?
[[ "$result" != 0 ]]
assert_restored
[[ ! -e "$MOCK_ROOT/pruned" && ! -e "$MOCK_ROOT/backup/last-success.json" ]]
echo 'PASS: interruption stops backup tools before restoring the original services'
