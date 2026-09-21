#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

SELF="$(realpath "${BASH_SOURCE[0]}")"
CONFIG_FILE="${XIEHE_BACKUP_CONFIG:-/etc/xiehe-backup/backup.env}"
COMMAND="${1:-run}"
CAPTURE_PID=""

log() { printf '[%s] %s\n' "$(date -Iseconds)" "$*"; }
die() { log "ERROR: $*" >&2; exit 1; }

case "$COMMAND" in
  init|run|snapshots|recover-services|_capture) ;;
  *) echo "Usage: $0 {init|run|snapshots|recover-services}"; exit 2 ;;
esac

[[ -f "$CONFIG_FILE" ]] || die "Install first: sudo ./scripts/install_backup_timer.sh"
[[ "$(stat -c %u "$CONFIG_FILE")" == "$EUID" ]] || die "Config must belong to the executing user"
[[ $((8#$(stat -c %a "$CONFIG_FILE") & 077)) == 0 ]] || die "Config must not be group/world accessible"
# Administrator-owned shell configuration; do not source Compose dotenv files.
# shellcheck disable=SC1090
source "$CONFIG_FILE"
: "${PROJECT_DIR:?}" "${BACKUP_ROOT:?}" "${RESTIC_PASSWORD_FILE:?}"
export XIEHE_COMPOSE_SECURITY="${XIEHE_COMPOSE_SECURITY:-0}" XIEHE_COMPOSE_USE_EXAMPLES=0
if [[ -n "${COMPOSE_PROJECT_NAME:-}" ]]; then export COMPOSE_PROJECT_NAME; fi
RESTIC_IMAGE="${RESTIC_IMAGE:-restic/restic:0.19.1}"
CAPTURE_TIMEOUT_SECONDS="${CAPTURE_TIMEOUT_SECONDS:-1200}"
RECOVERY_TIMEOUT_SECONDS="${RECOVERY_TIMEOUT_SECONDS:-600}"
MAINTENANCE_TIMEOUT_SECONDS="${MAINTENANCE_TIMEOUT_SECONDS:-300}"
for value in "$CAPTURE_TIMEOUT_SECONDS" "$RECOVERY_TIMEOUT_SECONDS" "$MAINTENANCE_TIMEOUT_SECONDS"; do
  [[ "$value" =~ ^[1-9][0-9]*$ ]] || die "Timeouts must be positive integers"
done
for command in docker jq flock timeout realpath; do
  command -v "$command" >/dev/null || die "Missing command: $command"
done
PROJECT_DIR="$(realpath "$PROJECT_DIR")"
BACKUP_ROOT="$(realpath -m "$BACKUP_ROOT")"
[[ "$BACKUP_ROOT" != / && "$BACKUP_ROOT" != "$PROJECT_DIR" && "$BACKUP_ROOT" != "$PROJECT_DIR/"* ]] || die "Backup root must be outside the project"
[[ "$BACKUP_ROOT$PROJECT_DIR$RESTIC_PASSWORD_FILE" != *$'\n'* && "$BACKUP_ROOT$RESTIC_PASSWORD_FILE" != *,* ]] || die "Unsupported newline/comma in mount paths"
if [[ "$COMMAND" != recover-services ]]; then
  [[ -f "$RESTIC_PASSWORD_FILE" && -s "$RESTIC_PASSWORD_FILE" ]] || die "Missing repository password"
  [[ "$(stat -c %u "$RESTIC_PASSWORD_FILE")" == "$EUID" && $((8#$(stat -c %a "$RESTIC_PASSWORD_FILE") & 077)) == 0 ]] || die "Password file must be private and owned by the executing user"
fi
COMPOSE="$PROJECT_DIR/scripts/compose.sh"
REPOSITORY="$BACKUP_ROOT/repository"
STATE="$BACKUP_ROOT/state"
PAYLOAD="$BACKUP_ROOT/staging"
ACTIVE="$STATE/active.json"
SOURCE_MOUNTS=()
CORE_SERVICES=(mysql redis minio kafka)
declare -A DATA_PATHS=([mysql]=/var/lib/mysql [redis]=/data [minio]=/data [kafka]=/var/lib/kafka/data)
mkdir -p "$REPOSITORY" "$STATE" "$BACKUP_ROOT/cache"
[[ "$(stat -c %u "$BACKUP_ROOT")" == "$EUID" && $((8#$(stat -c %a "$BACKUP_ROOT") & 077)) == 0 ]] || die "Backup root must be private (mode 700) and owned by the executing user"

if [[ "$COMMAND" != _capture ]]; then
  exec 9>"$BACKUP_ROOT/operation.lock"
  flock -n 9 || die "Another backup/recovery operation is running"
else
  [[ "${XIEHE_BACKUP_INTERNAL:-}" == 1 && -e /proc/$$/fd/9 ]] || die "Internal command; use run"
fi

stop_tool() {
  [[ -f "$STATE/tool-name" ]] || return 0
  local name details id
  name="$(<"$STATE/tool-name")"
  id="$(timeout 15 docker ps --all --quiet --filter "name=^/${name}$")" || return 1
  if [[ -n "$id" ]]; then
    details="$(timeout 15 docker inspect "$id")" || return 1
    [[ "$(jq -r '.[0].Config.Labels["io.xiehe.backup"]' <<<"$details")" == true ]] || return 1
    timeout 30 docker rm -f "$id" >/dev/null || return 1
  fi
  rm -f "$STATE/tool-name" "$STATE/tool.cid"
}

tool() {
  local entrypoint="$1" name result=0
  shift
  name="xiehe-backup-tool-$$-$RANDOM"
  printf '%s\n' "$name" >"$STATE/tool-name"
  rm -f "$STATE/tool.cid"
  timeout --kill-after=10s "${TOOL_TIMEOUT_SECONDS:-$CAPTURE_TIMEOUT_SECONDS}" \
    docker run --rm --pull never --network none \
    --name "$name" --cidfile "$STATE/tool.cid" --label io.xiehe.backup=true \
    --mount "type=bind,src=$REPOSITORY,dst=/repository" \
    --mount "type=bind,src=$BACKUP_ROOT/cache,dst=/cache" \
    --mount "type=bind,src=$RESTIC_PASSWORD_FILE,dst=/password,readonly" \
    --env RESTIC_REPOSITORY=/repository --env RESTIC_PASSWORD_FILE=/password \
    --env RESTIC_CACHE_DIR=/cache "${SOURCE_MOUNTS[@]}" \
    --entrypoint "$entrypoint" "$RESTIC_IMAGE" "$@" || result=$?
  if ((result == 0)); then rm -f "$STATE/tool-name" "$STATE/tool.cid"; fi
  return "$result"
}

recovery_docker() {
  local remaining=$(($1 - $(date +%s))) limit="$2"
  shift 2
  ((remaining > 0)) || return 124
  if ((remaining < limit)); then limit="$remaining"; fi
  timeout --kill-after=2s "$limit" docker "$@"
}

recover_services() {
  stop_tool || return 1
  [[ -f "$ACTIVE" ]] || return 0
  jq -e '.containers | type == "array" and length > 0 and all(.[]; (.id | type == "string") and (.service | type == "string"))' "$ACTIVE" >/dev/null || return 1
  local service id details deadline ready now pending=()
  if [[ ! -f "$STATE/recovery-deadline" ]]; then
    printf '%s\n' "$(($(date +%s) + RECOVERY_TIMEOUT_SECONDS))" >"$STATE/recovery-deadline"
  fi
  deadline="$(<"$STATE/recovery-deadline")"
  # Killing a Compose client does not cancel an in-flight Docker stop request.
  # Settle those requests before starting anything, or a late stop can win the race.
  if [[ -f "$STATE/stop-requested" ]]; then
    mapfile -t pending < <(sort -u "$STATE/stop-requested")
    if ((${#pending[@]})); then
      recovery_docker "$deadline" 90 stop --time 60 "${pending[@]}" >/dev/null || return 1
    fi
    rm -f "$STATE/stop-requested"
  fi
  log "Restoring previously running containers (no recreate/pull)"
  # IDs survive configuration/tag changes and never start new dependencies.
  while IFS=$'\t' read -r service id; do
    if ! details="$(recovery_docker "$deadline" 15 inspect "$id")"; then continue; fi
    if [[ "$(jq -r '.[0].State.Running' <<<"$details")" != true ]]; then
      log "Starting $service"
      recovery_docker "$deadline" 30 start "$id" >/dev/null || log "ERROR: could not start $service"
    fi
  done < <(jq -r '.containers | sort_by(.start_order)[] | [.service, .id] | @tsv' "$ACTIVE")
  while :; do
    ready=1
    while IFS= read -r id; do
      if ! details="$(recovery_docker "$deadline" 15 inspect "$id")"; then ready=0; continue; fi
      jq -e '.[0].State | .Running and (.Restarting | not) and ((.Health.Status // "healthy") == "healthy")' <<<"$details" >/dev/null || ready=0
    done < <(jq -r '.containers[].id' "$ACTIVE")
    if ((ready == 1)); then
      now="$(date +%s)"
      log "Services restored; maintenance window: $((now - $(jq -r .stopped_at "$ACTIVE")))s"
      jq --argjson end "$now" '. + {restored_at: $end, downtime_seconds: ($end - .stopped_at)}' "$ACTIVE" >"$STATE/restored.json" || return 1
      rm -f "$ACTIVE" "$STATE/recovery-deadline"
      return 0
    fi
    (($(date +%s) < deadline)) || break
    sleep 2
  done
  log "ERROR: recovery incomplete; inspect containers, then run recover-services" >&2
  return 1
}

stop_services() {
  local service
  for service in "$@"; do
    jq -r --arg s "$service" '.containers[] | select(.service == $s) | .id' "$ACTIVE" >>"$STATE/stop-requested"
  done
  "$COMPOSE" stop --timeout 60 "$@"
}

collect_sources() {
  local ids details service id volume name mountpoint images project
  mapfile -t ids < <("$COMPOSE" ps --all --quiet)
  ((${#ids[@]})) || die "No existing Compose containers"
  details="$(docker inspect "${ids[@]}")"
  jq -e 'all(.[]; (.State.Paused or .State.Restarting) | not)' <<<"$details" >/dev/null || die "Paused/restarting containers must be resolved before backup"
  jq '[.[] | {id: .Id, service: .Config.Labels["com.docker.compose.service"], project: .Config.Labels["com.docker.compose.project"], running: .State.Running, image_id: .Image, image_ref: .Config.Image, mounts: [.Mounts[] | {Type, Name, Source, Destination}]}]' <<<"$details" >"$PAYLOAD/containers.json"
  project="$(jq -er 'map(.project) | unique | if length == 1 then .[0] else error("multiple projects") end' "$PAYLOAD/containers.json")"
  printf '%s\n' "$project" >"$STATE/project"
  printf '[]\n' >"$PAYLOAD/volumes.json"
  for service in "${CORE_SERVICES[@]}"; do
    id="$(jq -er --arg s "$service" '[.[] | select(.service == $s)] | if length == 1 then .[0].id else error("missing/ambiguous data service") end' "$PAYLOAD/containers.json")"
    volume="$(jq -ec --arg id "$id" --arg dest "${DATA_PATHS[$service]}" '.[] | select(.id == $id) | [.mounts[] | select(.Destination == $dest and .Type == "volume")] | if length == 1 then .[0] else error("expected a named data volume") end' "$PAYLOAD/containers.json")"
    name="$(jq -er .Name <<<"$volume")"
    mountpoint="$(docker volume inspect "$name" | jq -er '.[0] | select(.Driver == "local") | .Mountpoint')"
    [[ "$BACKUP_ROOT" != "$mountpoint" && "$BACKUP_ROOT" != "$mountpoint/"* ]] || die "Repository cannot be inside a source volume"
    SOURCE_MOUNTS+=(--mount "type=volume,src=$name,dst=/source/$service,readonly")
    jq --arg service "$service" --arg name "$name" '. + [{service: $service, volume: $name, backup_path: ("/source/" + $service)}]' "$PAYLOAD/volumes.json" >"$PAYLOAD/volumes.tmp"
    mv "$PAYLOAD/volumes.tmp" "$PAYLOAD/volumes.json"
  done
  mapfile -t images < <(jq -r '.[].image_id' "$PAYLOAD/containers.json" | sort -u)
  docker image inspect "${images[@]}" | jq '[.[] | {Id, RepoTags, RepoDigests}]' >"$PAYLOAD/images.json"
}

capture() {
  local start phase_start endpoint sizes bytes=0 size _path available service id details commit dirty
  start="$(date +%s)"
  endpoint="${DOCKER_HOST:-$(docker context inspect --format '{{.Endpoints.docker.Host}}')}"
  [[ "$endpoint" == unix://* ]] || die "Only a local Docker daemon is supported"
  docker image inspect "$RESTIC_IMAGE" >/dev/null || die "Run init before the maintenance window"
  "$COMPOSE" config --quiet
  rm -rf "$PAYLOAD"
  mkdir -p "$PAYLOAD/config"
  collect_sources
  jq -e 'any(.[]; .service == "mysql" and .running)' "$PAYLOAD/containers.json" >/dev/null || die "MySQL must already be running for the SQL export"
  tool restic cat config >/dev/null
  sizes="$(tool sh -ec 'du -sk /source/mysql /source/redis /source/minio /source/kafka')"
  while read -r size _path; do bytes=$((bytes + size * 1024)); done <<<"$sizes"
  available="$(df -PB1 "$BACKUP_ROOT" | awk 'NR == 2 {print $4}')"
  ((available >= bytes + 2147483648)) || die "Insufficient headroom: require source size plus 2 GiB free before stopping services"
  cp -a "$PROJECT_DIR/dotenv" "$PROJECT_DIR/infrastructure" "$PAYLOAD/config/"
  cp "$COMPOSE" "$PAYLOAD/config/compose.sh"
  "$COMPOSE" config >"$PAYLOAD/config/compose.resolved.yml"
  commit="$(git -c safe.directory="$PROJECT_DIR" -C "$PROJECT_DIR" rev-parse HEAD 2>/dev/null || printf unknown)"
  dirty="$(git -c safe.directory="$PROJECT_DIR" -C "$PROJECT_DIR" status --porcelain 2>/dev/null || true)"
  jq -n --arg commit "$commit" --argjson dirty "$([[ -n "$dirty" ]] && echo true || echo false)" --argjson started "$start" --argjson bytes "$bytes" '{format: 1, git_commit: $commit, git_dirty: $dirty, started_at: $started, source_bytes: $bytes, excluded: ["logging_service_data", "redis-cache", "models_data", "ordinary log volumes"]}' >"$PAYLOAD/manifest.json"
  log "Preflight complete in $(($(date +%s) - start))s; source data approximately $((bytes / 1048576)) MiB"

  jq --argjson now "$(date +%s)" '{stopped_at: $now, containers: [.[] | select(.running) | . + {start_order: (if (.service == "mysql" or .service == "redis" or .service == "redis-cache" or .service == "minio" or .service == "kafka") then 0 elif (.service == "storage-service" or .service == "logging-service") then 1 elif .service == "backend" then 2 else 3 end)}]}' "$PAYLOAD/containers.json" >"$STATE/active.tmp"
  mv "$STATE/active.tmp" "$ACTIVE"
  local writers=()
  mapfile -t writers < <(jq -r '.containers[] | select(.service != "mysql" and .service != "redis" and .service != "minio" and .service != "kafka") | .service' "$ACTIVE")
  log "Stopping application writers and ingress"
  phase_start="$(date +%s)"
  if ((${#writers[@]})); then stop_services "${writers[@]}"; fi
  log "Application stop finished in $(($(date +%s) - phase_start))s"
  id="$(jq -r '.[] | select(.service == "mysql") | .id' "$PAYLOAD/containers.json")"
  log "Exporting MySQL business database"
  phase_start="$(date +%s)"
  docker exec "$id" sh -ec 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysqldump --single-transaction --quick --routines --events --triggers --hex-blob --no-tablespaces --set-gtid-purged=OFF --databases "$MYSQL_DATABASE"' >"$PAYLOAD/database.sql"
  [[ -s "$PAYLOAD/database.sql" ]] || die "Empty SQL export"
  log "SQL export finished in $(($(date +%s) - phase_start))s"
  phase_start="$(date +%s)"
  for service in "${CORE_SERVICES[@]}"; do
    if jq -e --arg s "$service" 'any(.containers[]; .service == $s)' "$ACTIVE" >/dev/null; then
      stop_services "$service"
    fi
  done
  # A timeout-induced SIGKILL is not a clean cold-backup boundary.
  while IFS= read -r id; do
    details="$(docker inspect "$id")"
    jq -e '.[0].State | (.Running | not) and (.OOMKilled | not) and (.ExitCode == 0 or .ExitCode == 143)' <<<"$details" >/dev/null || die "Container did not stop cleanly: $id"
  done < <(jq -r '.containers[].id' "$ACTIVE")
  for service in "${CORE_SERVICES[@]}"; do
    id="$(jq -r --arg s "$service" '.[] | select(.service == $s) | .id' "$PAYLOAD/containers.json")"
    docker inspect "$id" | jq -e '.[0].State | (.Running | not) and (.OOMKilled | not) and (.ExitCode == 0 or .ExitCode == 143)' >/dev/null || die "Data service not cleanly stopped: $service"
  done
  log "Storage stop and clean-shutdown checks finished in $(($(date +%s) - phase_start))s"
  jq --argjson now "$(date +%s)" '. + {cold_at: $now}' "$PAYLOAD/manifest.json" >"$PAYLOAD/manifest.tmp"
  mv "$PAYLOAD/manifest.tmp" "$PAYLOAD/manifest.json"
  SOURCE_MOUNTS+=(--mount "type=bind,src=$PAYLOAD,dst=/source/metadata,readonly")
  log "Backing up cold volumes"
  tool restic backup --json --quiet --host "$(<"$STATE/project")" --tag xiehe-project /source >"$STATE/restic-output.jsonl"
  jq -es 'map(select(.message_type == "summary")) | last | select(.snapshot_id != null) | {snapshot_id, data_added, total_bytes_processed, total_duration}' "$STATE/restic-output.jsonl" >"$STATE/captured.json"
  log "Capture finished in $(($(date +%s) - start))s"
}

finish() {
  local result=$?
  trap - EXIT INT TERM
  if [[ -n "$CAPTURE_PID" ]] && kill -0 "$CAPTURE_PID" 2>/dev/null; then
    kill -TERM "$CAPTURE_PID" 2>/dev/null || true
    wait "$CAPTURE_PID" || true
  fi
  if ! recover_services; then result=1; fi
  if [[ "$COMMAND" == run ]]; then
    jq -n --argjson code "$result" --arg time "$(date -Iseconds)" '{finished_at: $time, exit_code: $code}' >"$BACKUP_ROOT/last-run.json"
  fi
  exit "$result"
}

if [[ "$COMMAND" == _capture ]]; then
  capture
  exit 0
fi
if [[ "$COMMAND" == recover-services ]]; then
  # ExecStopPost reuses the deadline; an explicit operator retry gets a new budget.
  if [[ "${2:-}" != --no-reset ]]; then rm -f "$STATE/recovery-deadline"; fi
  recover_services
  exit 0
fi
[[ ! -f "$ACTIVE" && ! -f "$STATE/tool-name" ]] || die "Unfinished operation: run recover-services first"
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

case "$COMMAND" in
  init)
    docker pull "$RESTIC_IMAGE"
    if [[ -f "$REPOSITORY/config" ]]; then
      tool restic cat config >/dev/null
      log "Existing repository verified; password and backups unchanged"
    else
      [[ -z "$(find "$REPOSITORY" -mindepth 1 -maxdepth 1 -print -quit)" ]] || die "Refusing to initialize a non-empty repository"
      tool restic init
    fi
    ;;
  snapshots) tool restic snapshots --tag xiehe-project ;;
  run)
    rm -f "$STATE/captured.json" "$STATE/restored.json" "$STATE/recovery-deadline" "$STATE/stop-requested"
    export XIEHE_BACKUP_INTERNAL=1 XIEHE_BACKUP_CONFIG="$CONFIG_FILE"
    timeout --signal=TERM --kill-after=10s "$CAPTURE_TIMEOUT_SECONDS" "$SELF" _capture &
    CAPTURE_PID=$!
    wait "$CAPTURE_PID"
    CAPTURE_PID=""
    recover_services
    jq -s '.[0] + {completed_at: .[1].restored_at, downtime_seconds: .[1].downtime_seconds}' "$STATE/captured.json" "$STATE/restored.json" >"$BACKUP_ROOT/last-success.tmp"
    mv "$BACKUP_ROOT/last-success.tmp" "$BACKUP_ROOT/last-success.json"
    log "Backup successful: $(jq -r .snapshot_id "$BACKUP_ROOT/last-success.json")"
    log "Applying retention after service recovery"
    maintenance_start="$(date +%s)"
    TOOL_TIMEOUT_SECONDS="$MAINTENANCE_TIMEOUT_SECONDS" tool restic forget \
      --host "$(<"$STATE/project")" --tag xiehe-project --group-by host,paths \
      --keep-daily 7 --keep-weekly 4 --keep-monthly 3 --prune
    log "Retention finished in $(($(date +%s) - maintenance_start))s"
    ;;
esac
