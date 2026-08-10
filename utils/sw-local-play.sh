#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.local/sw-local-play"
PID_DIR="$RUN_DIR/pids"
LOG_DIR="$RUN_DIR/logs"
ASSETS_DIR="$ROOT_DIR/../OpenSky-assets"
COMPAT_FILE="$ROOT_DIR/utils/sw-local-play-compatibility.tsv"
LOCAL_RELEASE_VERSION="${RELEASE_VERSION:-dev}"
LOCAL_PLAY_URL="http://localhost:3000/game/$LOCAL_RELEASE_VERSION/?mode=TUTORIAL&tutorialLevel=1"

mkdir -p "$PID_DIR" "$LOG_DIR"

FAILURES=0

ts() {
  date +"%Y-%m-%d %H:%M:%S"
}

info() {
  printf "[%s] [INFO] %s\n" "$(ts)" "$*"
}

ok() {
  printf "[%s] [ OK ] %s\n" "$(ts)" "$*"
}

warn() {
  printf "[%s] [WARN] %s\n" "$(ts)" "$*"
}

fail() {
  printf "[%s] [FAIL] %s\n" "$(ts)" "$*"
  FAILURES=$((FAILURES + 1))
}

reset_failures() {
  FAILURES=0
}

cmd_exists() {
  command -v "$1" >/dev/null 2>&1
}

pid_file() {
  printf "%s/%s.pid" "$PID_DIR" "$1"
}

log_file() {
  printf "%s/%s.log" "$LOG_DIR" "$1"
}

process_alive() {
  kill -0 "$1" >/dev/null 2>&1
}

port_listening() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_port() {
  local port="$1"
  local timeout="${2:-45}"
  local i=0

  while [ "$i" -lt "$timeout" ]; do
    if port_listening "$port"; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done

  return 1
}

docker_container_exists() {
  docker_daemon_reachable || return 1
  docker ps -a --format "{{.Names}}" | grep -Fxq "$1"
}

docker_container_running() {
  docker_daemon_reachable || return 1
  docker ps --format "{{.Names}}" | grep -Fxq "$1"
}

docker_daemon_reachable() {
  docker info >/dev/null 2>&1
}

ensure_prereqs() {
  info "Checking prerequisites"

  local missing=0
  local binary
  for binary in docker git pnpm make lsof curl; do
    if cmd_exists "$binary"; then
      ok "Found binary: $binary"
    else
      fail "Missing binary: $binary"
      missing=1
    fi
  done

  if [ "$missing" -ne 0 ]; then
    return 1
  fi

  return 0
}

ensure_workspace_dependencies() {
  info "Checking workspace dependencies"

  if [ -f "$ROOT_DIR/node_modules/.modules.yaml" ] && \
    [ "$ROOT_DIR/node_modules/.modules.yaml" -nt "$ROOT_DIR/pnpm-lock.yaml" ]; then
    ok "pnpm workspace dependencies are already installed"
    return 0
  fi

  info "Installing workspace dependencies with pnpm"
  if (cd "$ROOT_DIR" && pnpm install); then
    ok "Installed workspace dependencies"
  else
    fail "pnpm install failed"
    return 1
  fi
}

ensure_docker_daemon() {
  if docker_daemon_reachable; then
    ok "Docker daemon is reachable"
    return 0
  fi

  fail "Docker daemon is not reachable. Start Docker Desktop first."
  return 1
}

repo_branch() {
  git -C "$1" rev-parse --abbrev-ref HEAD 2>/dev/null || printf "unknown"
}

repo_commit() {
  git -C "$1" rev-parse --short HEAD 2>/dev/null || printf "unknown"
}

ensure_assets_checkout() {
  if [ ! -d "$ASSETS_DIR" ]; then
    fail "Missing ../OpenSky-assets checkout required for the local assets service"
    return 1
  fi

  if git -C "$ASSETS_DIR" rev-parse --git-dir >/dev/null 2>&1; then
    ok "Found assets repo at $ASSETS_DIR"
  else
    fail "$ASSETS_DIR exists but is not a git checkout"
    return 1
  fi

  if git -C "$ASSETS_DIR" lfs version >/dev/null 2>&1; then
    ok "git-lfs is available for the assets repo"
  else
    warn "git-lfs is not available for the assets repo; large asset files may still be pointers"
  fi

  return 0
}

lookup_compatibility() {
  local app_branch="$1"
  local assets_branch="$2"
  local matrix_app
  local matrix_assets
  local matrix_status
  local matrix_note

  if [ ! -f "$COMPAT_FILE" ]; then
    return 1
  fi

  while IFS='|' read -r matrix_app matrix_assets matrix_status matrix_note; do
    case "$matrix_app" in
      ""|\#*)
        continue
        ;;
    esac

    if { [ "$matrix_app" = "$app_branch" ] || [ "$matrix_app" = "*" ]; } && \
      { [ "$matrix_assets" = "$assets_branch" ] || [ "$matrix_assets" = "*" ]; }; then
      printf "%s|%s" "$matrix_status" "$matrix_note"
      return 0
    fi
  done <"$COMPAT_FILE"

  return 1
}

check_assets_compatibility() {
  local app_branch
  local assets_branch
  local app_commit
  local assets_commit
  local entry
  local status
  local note

  ensure_assets_checkout || return 1

  app_branch="$(repo_branch "$ROOT_DIR")"
  assets_branch="$(repo_branch "$ASSETS_DIR")"
  app_commit="$(repo_commit "$ROOT_DIR")"
  assets_commit="$(repo_commit "$ASSETS_DIR")"

  info "Local branch compatibility"
  info "  app repo:    $app_branch ($app_commit)"
  info "  assets repo: $assets_branch ($assets_commit)"

  if entry="$(lookup_compatibility "$app_branch" "$assets_branch")"; then
    status="${entry%%|*}"
    note="${entry#*|}"
    case "$status" in
      supported)
        ok "$note"
        ;;
      *)
        warn "$note"
        ;;
    esac
  else
    warn "This app/assets branch pair is not in the checked-in compatibility matrix."
    warn "See docs/LOCAL_COMPATIBILITY.md before assuming asset and code shapes match."
  fi

  return 0
}

ensure_configs() {
  info "Checking config files"

  if [ ! -f "$ROOT_DIR/webapp/config/webapp.local-api.json" ]; then
    fail "Missing webapp/config/webapp.local-api.json"
  else
    ok "Found webapp/config/webapp.local-api.json"
  fi

  if [ ! -f "$ROOT_DIR/game/config/game.local-api.json" ]; then
    fail "Missing game/config/game.local-api.json"
  else
    ok "Found game/config/game.local-api.json"
  fi

  if [ -f "$ROOT_DIR/api/etc/opensky-api.conf" ]; then
    ok "Found api/etc/opensky-api.conf"
  elif [ -f "$ROOT_DIR/api/etc/opensky-api.conf.sample" ]; then
    cp "$ROOT_DIR/api/etc/opensky-api.conf.sample" "$ROOT_DIR/api/etc/opensky-api.conf"
    warn "Created api/etc/opensky-api.conf from sample; review DB credentials if API fails."
  else
    fail "Missing api/etc/opensky-api.conf and api/etc/opensky-api.conf.sample"
  fi

  if [ -f "$ROOT_DIR/matchmaker/etc/matchmaker.local.conf" ]; then
    ok "Found matchmaker/etc/matchmaker.local.conf"
  else
    fail "Missing matchmaker/etc/matchmaker.local.conf"
  fi
}

ensure_postgres() {
  if port_listening 5432; then
    ok "Postgres is listening on :5432"
    return 0
  fi

  local container=""
  if docker_container_exists "postgres"; then
    container="postgres"
  elif docker_container_exists "postgresql"; then
    container="postgresql"
  elif docker_container_exists "postgres-localfix"; then
    container="postgres-localfix"
  fi

  if [ -n "$container" ]; then
    info "Starting existing $container container"
    if docker start "$container" >/dev/null 2>&1; then
      sleep 1
    fi
  else
    info "Creating postgres-localfix container on :5432"
    docker run -d \
      --name postgres-localfix \
      -e POSTGRES_DB=opensky \
      -e POSTGRES_HOST_AUTH_METHOD=trust \
      -p 127.0.0.1:5432:5432 \
      postgres:13 >/dev/null 2>&1 || true
  fi

  if port_listening 5432; then
    ok "Postgres is listening on :5432"
  else
    fail "Could not start Postgres on :5432"
  fi
}

ensure_cors() {
  if port_listening 8080; then
    ok "cors-anywhere is listening on :8080"
    return 0
  fi

  if docker_container_exists "cors-anywhere"; then
    info "Starting existing cors-anywhere container"
    docker start cors-anywhere >/dev/null 2>&1 || true
  else
    info "Creating cors-anywhere container"
    docker run -d \
      --name cors-anywhere \
      --dns 1.1.1.1 \
      -p 127.0.0.1:8080:8080 \
      redocly/cors-anywhere >/dev/null 2>&1 || true
  fi

  if port_listening 8080; then
    ok "cors-anywhere is listening on :8080"
  else
    fail "Could not start cors-anywhere on :8080"
  fi
}

ensure_redis() {
  if port_listening 6379; then
    ok "Redis port is listening on :6379"
    return 0
  fi

  local container=""
  if docker_container_exists "redis"; then
    container="redis"
  elif docker_container_exists "redis-localfix"; then
    container="redis-localfix"
  fi

  if [ -n "$container" ]; then
    info "Starting existing $container container"
    docker start "$container" >/dev/null 2>&1 || true
  else
    info "Creating redis-localfix container on :6379"
    docker run -d \
      --name redis-localfix \
      -p 127.0.0.1:6379:6379 \
      redis:6-alpine >/dev/null 2>&1 || true
  fi

  if port_listening 6379; then
    ok "Redis port is listening on :6379"
  else
    fail "Could not start Redis on :6379"
  fi
}

ensure_assets() {
  ensure_assets_checkout || return 1

  if port_listening 4001; then
    ok "Assets service is listening on :4001"
    return 0
  fi

  if docker_container_exists "assets"; then
    info "Starting existing assets container"
    docker start assets >/dev/null 2>&1 || true
  else
    info "Starting assets via docker compose"
    docker compose up -d assets >/dev/null 2>&1 || true
  fi

  if port_listening 4001; then
    ok "Assets service is listening on :4001"
  else
    fail "Could not start assets on :4001 (check ../OpenSky-assets checkout)"
  fi
}

ensure_api_database() {
  if ! port_listening 5432; then
    warn "Skipping API database setup because Postgres is not listening on :5432"
    return 0
  fi

  if ! cmd_exists go; then
    warn "Skipping API database setup because Go is not installed"
    return 0
  fi

  if ! cmd_exists psql; then
    warn "Skipping API database setup because psql is not installed"
    return 0
  fi

  info "Ensuring API database exists and migrations are applied"

  local db_exists="0"
  db_exists="$(
    PGHOST=127.0.0.1 \
    PGUSER=postgres \
    psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'opensky'" 2>/dev/null \
      | tr -d '[:space:]'
  )"

  if [ "$db_exists" != "1" ]; then
    info "Creating opensky database"
    if make -C "$ROOT_DIR/api" db-create >/dev/null 2>&1; then
      ok "Created opensky database"
    else
      fail "Could not create opensky database (check Postgres auth and locale settings)"
      return 1
    fi
  else
    ok "Found opensky database"
  fi

  if make -C "$ROOT_DIR/api" db-up >/dev/null 2>&1; then
    ok "API database migrations are up to date"
  else
    fail "Could not apply API migrations (check api/etc/opensky-api.conf and Postgres access)"
    return 1
  fi
}

redis_exec() {
  if cmd_exists redis-cli; then
    redis-cli -h 127.0.0.1 -p 6379 "$@"
    return $?
  fi

  if docker_container_running "redis"; then
    docker exec redis redis-cli "$@"
    return $?
  fi

  if docker_container_running "redis-localfix"; then
    docker exec redis-localfix redis-cli "$@"
    return $?
  fi

  return 1
}

delete_redis_pattern() {
  local pattern="$1"
  local key
  local deleted=0

  while IFS= read -r key; do
    if [ -z "$key" ]; then
      continue
    fi

    if ! redis_exec DEL "$key" >/dev/null 2>&1; then
      return 1
    fi
    deleted=$((deleted + 1))
  done < <(redis_exec --raw --scan --pattern "$pattern" 2>/dev/null || true)

  printf "%s" "$deleted"
}

reset_local_redis_state() {
  local pattern
  local deleted=0
  local count=0
  local patterns=(
    "matchmaker_queues:*"
    "matchmaker_queue:*"
    "matchmaker_queue_item:*"
    "mm_player:*"
    "player_properties:*"
    "player_channel:*"
    "matchmaker_player_stats:*"
    "game_server:*"
    "game_server_ranking"
    "matchmaker_pending_match_creation:*"
    "match_refusal_count:*"
    "match_refusal_cooldown:*"
    "match_abandon_count:*"
    "match_abandon_cooldown:*"
    "abandon_match:*"
    "loading_assets:*"
    "match_in_progress:*"
    "match_pending_rewards:*"
    "recent_match_info:*"
  )

  if ! port_listening 6379; then
    warn "Skipping Redis cleanup because Redis is not listening on :6379"
    return 0
  fi

  if ! redis_exec PING >/dev/null 2>&1; then
    warn "Skipping Redis cleanup because redis-cli access is unavailable"
    return 0
  fi

  info "Clearing OpenSky local Redis state"
  for pattern in "${patterns[@]}"; do
    count="$(delete_redis_pattern "$pattern")" || {
      fail "Could not delete Redis keys for pattern $pattern"
      return 1
    }
    deleted=$((deleted + count))
  done

  ok "Deleted $deleted Redis key(s) used by local play"
  return 0
}

reset_api_database() {
  if ! port_listening 5432; then
    warn "Skipping API database reset because Postgres is not listening on :5432"
    return 0
  fi

  if ! cmd_exists go; then
    warn "Skipping API database reset because Go is not installed"
    return 0
  fi

  if ! cmd_exists psql; then
    warn "Skipping API database reset because psql is not installed"
    return 0
  fi

  info "Resetting API database"
  if make -C "$ROOT_DIR/api" db-reset >/dev/null 2>&1 && \
    make -C "$ROOT_DIR/api" db-up >/dev/null 2>&1; then
    ok "Reset API database to a known-good local state"
  else
    fail "Could not reset API database"
    return 1
  fi

  return 0
}

clean_run_state() {
  find "$PID_DIR" -type f -name "*.pid" -delete 2>/dev/null || true
}

start_service() {
  local name="$1"
  local command="$2"
  local port="$3"
  local timeout="${4:-45}"
  local pf
  local lf
  local pid=""

  pf="$(pid_file "$name")"
  lf="$(log_file "$name")"

  if [ -f "$pf" ]; then
    pid="$(cat "$pf" 2>/dev/null || true)"
    if [ -n "$pid" ] && process_alive "$pid"; then
      if port_listening "$port"; then
        ok "$name already running (pid=$pid, port=$port)"
        return 0
      fi
      warn "$name pid file exists but port :$port is not open (pid=$pid)"
    else
      warn "$name pid file was stale; removing it"
      rm -f "$pf"
    fi
  fi

  if port_listening "$port"; then
    warn "$name port :$port is already in use by another process; skipping start"
    return 0
  fi

  info "Starting $name (log: $lf)"
  nohup /bin/bash -lc "cd \"$ROOT_DIR\" && $command" >"$lf" 2>&1 &
  pid=$!
  echo "$pid" >"$pf"

  if wait_for_port "$port" "$timeout"; then
    ok "$name is listening on :$port (pid=$pid)"
    return 0
  fi

  fail "$name did not open :$port in ${timeout}s (pid=$pid)"
  if process_alive "$pid"; then
    warn "$name process is still alive; check logs for readiness errors"
  fi
  if [ -f "$lf" ]; then
    warn "Last 20 lines from $lf:"
    tail -n 20 "$lf" | sed 's/^/  /'
  fi

  return 1
}

stop_service() {
  local name="$1"
  local pf
  local pid

  pf="$(pid_file "$name")"

  if [ ! -f "$pf" ]; then
    warn "$name has no pid file"
    return 0
  fi

  pid="$(cat "$pf" 2>/dev/null || true)"
  if [ -z "$pid" ]; then
    warn "$name pid file was empty"
    rm -f "$pf"
    return 0
  fi

  if process_alive "$pid"; then
    info "Stopping $name (pid=$pid)"
    kill "$pid" >/dev/null 2>&1 || true
    sleep 1
    if process_alive "$pid"; then
      warn "$name did not exit after SIGTERM, sending SIGKILL"
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
    ok "$name stopped"
  else
    warn "$name pid=$pid is not running"
  fi

  rm -f "$pf"
}

print_status_service() {
  local name="$1"
  local port="$2"
  local pf
  local pid

  pf="$(pid_file "$name")"
  pid=""
  if [ -f "$pf" ]; then
    pid="$(cat "$pf" 2>/dev/null || true)"
  fi

  if port_listening "$port"; then
    if [ -n "$pid" ] && process_alive "$pid"; then
      ok "$name: listening on :$port (pid=$pid)"
    else
      warn "$name: listening on :$port (pid unknown or not from this script)"
    fi
  else
    if [ -n "$pid" ] && process_alive "$pid"; then
      fail "$name: process alive (pid=$pid) but :$port is not listening"
    else
      fail "$name: not running (expected :$port)"
    fi
  fi
}

print_status_container() {
  local name="$1"
  local port="$2"

  if ! docker_daemon_reachable; then
    warn "container/$name: Docker daemon unavailable"
    return 0
  fi

  if docker_container_running "$name"; then
    if [ -n "$port" ] && port_listening "$port"; then
      ok "container/$name: running and :$port is listening"
    else
      warn "container/$name: running"
    fi
    return 0
  fi

  if docker_container_exists "$name"; then
    fail "container/$name: exists but not running"
  else
    fail "container/$name: not found"
  fi
}

print_status_container_group() {
  local label="$1"
  local port="$2"
  shift 2

  if ! docker_daemon_reachable; then
    warn "container/$label: Docker daemon unavailable"
    return 0
  fi

  local name
  for name in "$@"; do
    if docker_container_running "$name"; then
      if [ -n "$port" ] && port_listening "$port"; then
        ok "container/$label: running via $name and :$port is listening"
      else
        warn "container/$label: running via $name"
      fi
      return 0
    fi
  done

  if [ -n "$port" ] && port_listening "$port"; then
    ok "container/$label: :$port is listening via an external service"
    return 0
  fi

  for name in "$@"; do
    if docker_container_exists "$name"; then
      fail "container/$label: exists as $name but is not running"
      return 1
    fi
  done

  fail "container/$label: not found"
  return 1
}

check_http() {
  local label="$1"
  local url="$2"
  local expected="$3"
  local code=""

  if ! code="$(curl -sS -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)"; then
    code="000"
  fi
  if echo "$expected" | tr ',' '\n' | grep -Fxq "$code"; then
    ok "$label: $url -> HTTP $code"
  else
    warn "$label: $url -> HTTP $code (expected: $expected)"
  fi
}

do_up() {
  reset_failures
  ensure_prereqs || return 1
  ensure_docker_daemon || return 1
  ensure_configs
  check_assets_compatibility || return 1

  info "Starting Docker-backed dependencies"
  ensure_postgres
  ensure_cors
  ensure_redis
  ensure_assets
  ensure_api_database

  info "Starting local services"
  start_service "api" "make -C api run" 1337 90
  start_service "server" "RELEASE_VERSION=$LOCAL_RELEASE_VERSION SERVER_URL=localhost:8000 INTERNAL_SERVER_URL=localhost:8000 pnpm --dir server start" 8000 45
  start_service "webapp" "DIST=local-api RELEASE_VERSION=$LOCAL_RELEASE_VERSION pnpm --dir webapp dev" 3000 60
  start_service "game" "DIST=local-api RELEASE_VERSION=$LOCAL_RELEASE_VERSION pnpm --dir game exec vite --host" 3001 60
  start_service "matchmaker" "RELEASE_VERSION=$LOCAL_RELEASE_VERSION make -C matchmaker build && (cd matchmaker && RELEASE_VERSION=$LOCAL_RELEASE_VERSION ./bin/matchmaker -config=etc/matchmaker.local.conf)" 8888 90

  info "Endpoint checks"
  check_http "webapp" "http://localhost:3000/" "200"
  check_http "game" "http://localhost:3001/game/$LOCAL_RELEASE_VERSION/" "200,301,302"
  check_http "api" "http://localhost:1337/" "401,404,200"
  check_http "assets" "http://localhost:4001/" "200,301,302,404"

  info "Current stack status"
  do_status

  printf "\n"
  info "Open this URL to play:"
  printf "  %s\n" "$LOCAL_PLAY_URL"
  printf "\n"
  info "Logs directory: $LOG_DIR"

  if [ "$FAILURES" -ne 0 ]; then
    warn "Finished with $FAILURES failure(s)."
    return 1
  fi

  ok "Finished successfully."
  return 0
}

do_bootstrap() {
  reset_failures
  ensure_prereqs || return 1
  ensure_workspace_dependencies || return 1
  ensure_docker_daemon || return 1
  ensure_configs || return 1
  check_assets_compatibility || return 1

  info "Bootstrap checks are complete. Bringing the local stack up."
  do_up
}

do_down() {
  reset_failures
  ensure_prereqs || return 1

  info "Stopping local services started by this script"
  stop_service "matchmaker"
  stop_service "game"
  stop_service "webapp"
  stop_service "server"
  stop_service "api"

  info "Stopping supporting containers"
  if docker_daemon_reachable; then
    docker stop assets cors-anywhere redis-localfix postgres-localfix >/dev/null 2>&1 || true
    ok "Requested stop for: assets, cors-anywhere, redis-localfix, postgres-localfix"
  else
    warn "Docker daemon unavailable; skipped container shutdown"
  fi

  if [ "$FAILURES" -ne 0 ]; then
    warn "Finished with $FAILURES failure(s)."
    return 1
  fi

  ok "Finished successfully."
  return 0
}

do_reset() {
  reset_failures
  ensure_prereqs || return 1
  ensure_docker_daemon || return 1

  info "Resetting local play state"
  do_down || true
  clean_run_state
  ensure_postgres || return 1
  ensure_redis || return 1
  reset_api_database || return 1
  reset_local_redis_state || return 1

  info "Restarting local stack after reset"
  reset_failures
  do_up
}

do_status() {
  reset_failures
  ensure_prereqs || return 1

  info "Container status"
  print_status_container "assets" "4001"
  print_status_container "cors-anywhere" "8080"
  print_status_container_group "postgres" "5432" "postgres" "postgresql" "postgres-localfix"
  print_status_container_group "redis" "6379" "redis" "redis-localfix"

  info "Process status"
  print_status_service "api" "1337"
  print_status_service "server" "8000"
  print_status_service "webapp" "3000"
  print_status_service "game" "3001"
  print_status_service "matchmaker" "8888"

  info "Quick HTTP checks"
  check_http "webapp" "http://localhost:3000/" "200"
  check_http "game" "http://localhost:3001/game/$LOCAL_RELEASE_VERSION/" "200,301,302"
  check_http "api" "http://localhost:1337/" "401,404,200"

  if [ "$FAILURES" -ne 0 ]; then
    return 1
  fi
  return 0
}

do_smoke() {
  local server_status
  local matchmaker_status

  reset_failures
  ensure_prereqs || return 1

  info "Running local smoke checks"
  check_http "webapp" "http://localhost:3000/" "200"
  check_http "game (direct)" "http://localhost:3001/game/$LOCAL_RELEASE_VERSION/" "200,301,302"
  check_http "game (proxied)" "http://localhost:3000/game/$LOCAL_RELEASE_VERSION/" "200,301,302"
  check_http "api" "http://localhost:1337/" "401,404,200"
  check_http "server/status" "http://localhost:8000/status" "200"
  check_http "matchmaker/status" "http://localhost:8888/status" "200"
  check_http "assets" "http://localhost:4001/" "200,301,302,404"

  server_status="$(curl -fsS "http://localhost:8000/status" 2>/dev/null || true)"
  matchmaker_status="$(curl -fsS "http://localhost:8888/status" 2>/dev/null || true)"

  if echo "$server_status" | grep -Fq '"ws":"ws://localhost:8000"'; then
    ok "server advertises ws://localhost:8000"
  else
    fail "server status does not advertise ws://localhost:8000"
  fi

  if echo "$server_status" | grep -Fq '"hostname":"localhost:8000"'; then
    ok "server advertises hostname localhost:8000"
  else
    fail "server status does not advertise hostname localhost:8000"
  fi

  if echo "$matchmaker_status" | grep -Fq "\"releaseVersion\":\"$LOCAL_RELEASE_VERSION\""; then
    ok "matchmaker releaseVersion is $LOCAL_RELEASE_VERSION"
  else
    fail "matchmaker releaseVersion is not $LOCAL_RELEASE_VERSION"
  fi

  if echo "$matchmaker_status" | grep -Fq '"EnabledInRankedQueue":true'; then
    ok "ranked queue bot fallback is enabled"
  else
    fail "ranked queue bot fallback is disabled"
  fi

  if echo "$matchmaker_status" | grep -Fq '"game-server'; then
    ok "matchmaker sees at least one registered game server"
  else
    fail "matchmaker does not report a registered game server"
  fi

  if [ "$FAILURES" -ne 0 ]; then
    warn "Smoke checks finished with $FAILURES failure(s)."
    return 1
  fi

  ok "Smoke checks passed."
  return 0
}

usage() {
  cat <<EOF
Usage: $(basename "$0") <bootstrap|up|status|smoke|reset|down>

Commands:
  bootstrap  Install dependencies, verify local compatibility, then start the stack.
  up      Start local dependencies and services needed to play OpenSky.
  status  Print detailed status for all stack components.
  smoke   Run health checks for the local stack and local-only invariants.
  reset   Recreate the local API DB, clear OpenSky Redis state, and restart.
  down    Stop processes started by this script and stop helper containers.
EOF
}

ACTION="${1:-up}"

case "$ACTION" in
  bootstrap)
    do_bootstrap
    ;;
  up)
    do_up
    ;;
  status)
    do_status
    ;;
  smoke)
    do_smoke
    ;;
  reset)
    do_reset
    ;;
  down)
    do_down
    ;;
  *)
    usage
    exit 1
    ;;
esac
