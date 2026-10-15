#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT
mkdir -p "$TEST_DIR/project/scripts" "$TEST_DIR/project/dotenv" "$TEST_DIR/bin"
cp "$PROJECT_DIR/scripts/compose.sh" "$TEST_DIR/project/scripts/"
for name in runtime ports database redis cache minio kafka storage logging concurrency backend frontend; do
  touch "$TEST_DIR/project/dotenv/.env.$name"
done
cat > "$TEST_DIR/bin/docker" <<'DOCKER'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$COMPOSE_TEST_ARGS"
DOCKER
chmod +x "$TEST_DIR/bin/docker"
export PATH="$TEST_DIR/bin:$PATH" COMPOSE_TEST_ARGS="$TEST_DIR/args"
export XIEHE_COMPOSE_SECURITY=0 XIEHE_COMPOSE_RUSTFS=0 XIEHE_COMPOSE_USE_EXAMPLES=0
WRAPPER="$TEST_DIR/project/scripts/compose.sh"

bash "$WRAPPER" up -d --build
if grep -q 'rustfs' "$COMPOSE_TEST_ARGS"; then
  echo 'FAIL: ordinary startup included RustFS configuration' >&2
  exit 1
fi
[[ "$(tail -n 3 "$COMPOSE_TEST_ARGS" | tr '\n' ' ')" == 'up -d --build ' ]]
echo 'PASS: ordinary startup requires no RustFS dotenv and forwards build arguments'

rm "$COMPOSE_TEST_ARGS"
if bash "$WRAPPER" --with-rustfs config --quiet 2>"$TEST_DIR/error"; then
  echo 'FAIL: explicit RustFS startup accepted a missing dotenv' >&2
  exit 1
fi
grep -q 'Missing dotenv file: dotenv/.env.rustfs' "$TEST_DIR/error"
[[ ! -e "$COMPOSE_TEST_ARGS" ]]
echo 'PASS: missing explicit RustFS configuration fails before invoking Docker'

touch "$TEST_DIR/project/dotenv/.env.rustfs"
for flags in '--security --with-rustfs' '--with-rustfs --security'; do
  read -r -a options <<< "$flags"
  bash "$WRAPPER" "${options[@]}" config --quiet
  grep -q '/compose/rustfs.yml' "$COMPOSE_TEST_ARGS"
  grep -q '/compose/security.yml' "$COMPOSE_TEST_ARGS"
  grep -q '/dotenv/.env.rustfs' "$COMPOSE_TEST_ARGS"
done
XIEHE_COMPOSE_RUSTFS=1 bash "$WRAPPER" config --quiet
grep -q '/compose/rustfs.yml' "$COMPOSE_TEST_ARGS"
bash "$WRAPPER" config --quiet
if grep -q 'rustfs' "$COMPOSE_TEST_ARGS"; then
  echo 'FAIL: an existing RustFS dotenv enabled RustFS implicitly' >&2
  exit 1
fi
echo 'PASS: RustFS is opt-in through flag or environment, independent of file presence'
