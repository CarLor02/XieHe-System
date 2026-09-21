#!/usr/bin/env bash
set -euo pipefail
umask 077

PROJECT_ROOT="$(realpath "$(dirname "${BASH_SOURCE[0]}")/..")"
CONFIG_DIR=/etc/xiehe-backup
CONFIG_FILE="$CONFIG_DIR/backup.env"

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
[[ "$EUID" == 0 ]] || fail "Run with sudo"
for command in docker jq flock timeout openssl systemctl systemd-analyze; do
  command -v "$command" >/dev/null || fail "Missing dependency: $command"
done
[[ -d /run/systemd/system ]] || fail "This installer requires a systemd host"
[[ "$PROJECT_ROOT" != *$'\n'* ]] || fail "Unsupported newline in project path"
endpoint="${DOCKER_HOST:-$(docker context inspect --format '{{.Endpoints.docker.Host}}')}"
[[ "$endpoint" == unix://* ]] || fail "Use the server's local Docker daemon"
docker info --format '{{.ServerVersion}}' >/dev/null
docker compose version >/dev/null
active="$(systemctl show xiehe-backup.service --property=ActiveState --value 2>/dev/null || true)"
case "$active" in active|activating|deactivating) fail "Wait for the current backup/recovery before installing" ;; esac

install -d -m 0700 "$CONFIG_DIR"
if [[ ! -e "$CONFIG_FILE" ]]; then
  {
    printf 'PROJECT_DIR=%q\n' "$PROJECT_ROOT"
    printf '%s\n' \
      'BACKUP_ROOT=/srv/xiehe-backups' \
      'RESTIC_PASSWORD_FILE=/etc/xiehe-backup/password' \
      'RESTIC_IMAGE=restic/restic:0.19.1' \
      'XIEHE_COMPOSE_SECURITY=0' \
      'CAPTURE_TIMEOUT_SECONDS=1200' \
      'RECOVERY_TIMEOUT_SECONDS=600' \
      'MAINTENANCE_TIMEOUT_SECONDS=300'
  } >"$CONFIG_FILE"
fi
[[ "$(stat -c %u "$CONFIG_FILE")" == 0 && $((8#$(stat -c %a "$CONFIG_FILE") & 077)) == 0 ]] || fail "Existing config must be owned by root with mode 600"
# shellcheck disable=SC1090
source "$CONFIG_FILE"
[[ "$(realpath "$PROJECT_DIR")" == "$PROJECT_ROOT" ]] || fail "Existing config points at a different checkout; review it manually"
: "${BACKUP_ROOT:?}" "${RESTIC_PASSWORD_FILE:?}"
if [[ ! -e "$RESTIC_PASSWORD_FILE" ]]; then
  [[ ! -e "$BACKUP_ROOT/repository/config" ]] || fail "Existing repository has no password file; recover the original password"
  mkdir -p "$(dirname "$RESTIC_PASSWORD_FILE")"
  openssl rand -base64 32 >"$RESTIC_PASSWORD_FILE"
  chmod 0600 "$RESTIC_PASSWORD_FILE"
fi
XIEHE_BACKUP_CONFIG="$CONFIG_FILE" "$PROJECT_ROOT/scripts/backup_database.sh" init

# Escape both quoted systemd values and sed replacements, including '%' specifiers.
unit_path="${PROJECT_ROOT//\\/\\\\}"
unit_path="${unit_path//\"/\\\"}"
unit_path="${unit_path//%/%%}"
replacement="$(printf '%s' "$unit_path" | sed 's/[\\&|]/\\&/g')"
temporary="$(mktemp -d)"
trap 'rm -rf "$temporary"' EXIT
sed "s|@PROJECT_DIR@|$replacement|g" "$PROJECT_ROOT/infrastructure/systemd/xiehe-backup.service" >"$temporary/xiehe-backup.service"
cp "$PROJECT_ROOT/infrastructure/systemd/xiehe-backup.timer" "$temporary/"
systemd-analyze verify "$temporary/xiehe-backup.service" "$temporary/xiehe-backup.timer"
install -m 0644 "$temporary/xiehe-backup.service" /etc/systemd/system/xiehe-backup.service
install -m 0644 "$temporary/xiehe-backup.timer" /etc/systemd/system/xiehe-backup.timer
systemctl daemon-reload

printf '\nInstalled. No backup was started; this installer never enables the timer.\n'
printf 'Timer enabled state: '
systemctl is-enabled xiehe-backup.timer || true
printf 'Timer active state: '
systemctl is-active xiehe-backup.timer || true
printf '%s\n' \
  'An already enabled timer is left enabled on reinstall.' \
  'Manual trial: sudo systemctl start xiehe-backup.service' \
  'View timing:  sudo journalctl -u xiehe-backup.service -n 100 --no-pager' \
  'Enable later: sudo systemctl enable --now xiehe-backup.timer' \
  'Schedule:     daily 00:30 Asia/Shanghai, independent of the host timezone.' \
  'Keep the repository password separately; losing it makes the backup unreadable.'
