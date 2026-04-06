#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.yml"
RUNTIME_DIR="$ROOT_DIR/.runtime"
LOG_DIR="$RUNTIME_DIR/logs"
PID_DIR="$RUNTIME_DIR/pids"

WEB_PID_FILE="$PID_DIR/web.pid"
MOBILE_PID_FILE="$PID_DIR/mobile.pid"
WEB_LOG_FILE="$LOG_DIR/web.log"
MOBILE_LOG_FILE="$LOG_DIR/mobile.log"
WEB_SCREEN_SESSION="cortex-web"
NODE_RUNTIME_VERSION="${NODE_RUNTIME_VERSION:-22.22.0}"
NODE_RUNTIME_BIN="$HOME/.nvm/versions/node/v${NODE_RUNTIME_VERSION#v}/bin"
WEB_RUNTIME_MODE="${WEB_RUNTIME_MODE:-prod}"

API_HEALTH_URL="http://localhost:8101/healthz"
KB_HEALTH_URL="http://localhost:8102/healthz"
KG_HEALTH_URL="http://localhost:8103/healthz"
MEDIA_HEALTH_URL="http://localhost:8104/healthz"
AGENTS_HEALTH_URL="http://localhost:8105/healthz"
WEB_PORT="${WEB_PORT:-3000}"

MODE="all"
PROFILE_OPTIONAL="false"
BACKEND_SERVICES=""
APPS_TARGETS="web,mobile"
LOG_TARGET="all"
LOG_FOLLOW="false"
LOG_TAIL="200"
REMOVE_VOLUMES="false"

usage() {
  cat <<USAGE
Usage:
  bash scripts/cortexctl.sh <command> [options]

Commands:
  setup                 Install workspace dependencies
  build                 Run workspace build validation
  warmup                Pre-seed warm-up (health, optional model pull, KB/API prime)
  start                 Start backend, apps, or both
  stop                  Stop backend, apps, or both
  restart               Restart backend, apps, or both
  status                Show status of backend and apps
  logs                  Show logs for backend/app targets
  health                Run service health checks
  demo                  Execute demo API flow
  test                  Run tests
  ui-test               Run Selenium UI functional tests
  aws-preflight         Run AWS identity/region preflight + static guardrail checks
  aws-guardrails        Validate AWS free-tier and pricing guardrails
  aws-tf                Run Terraform helper for AWS infra
  aws-push              Sync repo to AWS EC2 and start AWS-lite stack
  clean                 Stop everything and remove runtime artifacts
  help                  Show this help

Common options:
  --mode <all|backend|apps>      Target systems (default: all)

Start/Restart options:
  --profile optional             Start optional compose profile services (whisper_cpp, piper_tts)
  --services s1,s2               Compose backend services subset (e.g. api,kb,kg)
  --apps web,mobile              App targets to manage (default: web,mobile)
Environment:
  WEB_RUNTIME_MODE=prod|dev      Web launcher mode (default: prod)

Stop options:
  --volumes                      Remove compose volumes when stopping backend

Logs options:
  --target <all|backend|apps|service-name|web|mobile>
  --tail <n>                     Number of log lines (default: 200)
  --follow                       Follow log output

Examples:
  bash scripts/cortexctl.sh setup
  bash scripts/cortexctl.sh build
  bash scripts/cortexctl.sh warmup --profile optional --model llama3.1:8b
  bash scripts/cortexctl.sh start --mode all --profile optional
  bash scripts/cortexctl.sh start --mode backend --services api,kb,kg,media,agents
  bash scripts/cortexctl.sh logs --target api --follow
  bash scripts/cortexctl.sh ui-test
  bash scripts/cortexctl.sh aws-preflight
  bash scripts/cortexctl.sh aws-guardrails
  bash scripts/cortexctl.sh aws-tf plan -var-file=terraform.tfvars
  bash scripts/cortexctl.sh stop --mode all
  bash scripts/cortexctl.sh stop --mode backend --volumes
USAGE
}

log() {
  printf '%s\n' "$*"
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

ensure_runtime_dirs() {
  mkdir -p "$RUNTIME_DIR" "$LOG_DIR" "$PID_DIR"
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || die "Required command not found: $cmd"
}

node_runtime_prefix() {
  printf "export PATH='%s':\$PATH && " "$NODE_RUNTIME_BIN"
}

run_with_node_runtime() {
  bash -lc "$(node_runtime_prefix)$*"
}

is_pid_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

read_pid_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    cat "$file"
  fi
}

screen_session_exists() {
  local session_name="$1"
  { screen -ls 2>/dev/null || true; } | grep -Fq ".${session_name}"
}

start_app() {
  local name="$1"
  local cmd="$2"
  local pid_file="$3"
  local log_file="$4"

  local existing_pid
  existing_pid="$(read_pid_file "$pid_file")"
  if [[ -n "${existing_pid:-}" ]] && is_pid_running "$existing_pid"; then
    log "$name is already running (pid=$existing_pid)"
    return
  fi

  ensure_runtime_dirs
  nohup bash -lc "cd '$ROOT_DIR' && $cmd" >"$log_file" 2>&1 &
  local pid=$!
  echo "$pid" >"$pid_file"
  log "Started $name (pid=$pid, log=$log_file)"
}

start_web() {
  require_cmd screen
  ensure_runtime_dirs
  rm -f "$WEB_PID_FILE"

  if screen_session_exists "$WEB_SCREEN_SESSION"; then
    log "web is already running (screen=$WEB_SCREEN_SESSION, port=$WEB_PORT, runtime=$WEB_RUNTIME_MODE, log=$WEB_LOG_FILE)"
    return
  fi

  if [[ "$WEB_RUNTIME_MODE" == "prod" ]]; then
    log "Building web application for production runtime..."
    (cd "$ROOT_DIR" && bash scripts/build.sh web)
  fi

  : >"$WEB_LOG_FILE"
  if [[ "$WEB_RUNTIME_MODE" == "prod" ]]; then
    screen -dmS "$WEB_SCREEN_SESSION" bash -lc "$(node_runtime_prefix)cd '$ROOT_DIR/apps/web' && NEXT_DISABLE_TELEMETRY=1 PORT='$WEB_PORT' ./node_modules/.bin/next start -p '$WEB_PORT' >>'$WEB_LOG_FILE' 2>&1"
  else
    screen -dmS "$WEB_SCREEN_SESSION" bash -lc "$(node_runtime_prefix)cd '$ROOT_DIR/apps/web' && rm -rf .next && NEXT_DISABLE_TELEMETRY=1 PORT='$WEB_PORT' ./node_modules/.bin/next dev -p '$WEB_PORT' >>'$WEB_LOG_FILE' 2>&1"
  fi
  log "Started web (screen=$WEB_SCREEN_SESSION, port=$WEB_PORT, runtime=$WEB_RUNTIME_MODE, log=$WEB_LOG_FILE)"
}

stop_app() {
  local name="$1"
  local pid_file="$2"

  local pid
  pid="$(read_pid_file "$pid_file")"
  if [[ -z "${pid:-}" ]]; then
    log "$name is not running"
    return
  fi

  if is_pid_running "$pid"; then
    kill "$pid" || true
    sleep 1
    if is_pid_running "$pid"; then
      kill -9 "$pid" || true
    fi
    log "Stopped $name (pid=$pid)"
  else
    log "$name had stale pid ($pid), cleaned"
  fi
  rm -f "$pid_file"
}

stop_web() {
  require_cmd screen
  if screen_session_exists "$WEB_SCREEN_SESSION"; then
    screen -S "$WEB_SCREEN_SESSION" -X quit || true
    log "Stopped web (screen=$WEB_SCREEN_SESSION)"
  else
    log "web is not running"
  fi
  rm -f "$WEB_PID_FILE"
}

status_app() {
  local name="$1"
  local pid_file="$2"
  local log_file="$3"
  local pid
  pid="$(read_pid_file "$pid_file")"
  if [[ -n "${pid:-}" ]] && is_pid_running "$pid"; then
    log "$name: running (pid=$pid, log=$log_file)"
  else
    log "$name: stopped"
  fi
}

status_web() {
  if screen_session_exists "$WEB_SCREEN_SESSION"; then
    log "web: running (screen=$WEB_SCREEN_SESSION, port=$WEB_PORT, runtime=$WEB_RUNTIME_MODE, log=$WEB_LOG_FILE)"
  else
    log "web: stopped"
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --mode)
        MODE="$2"
        shift 2
        ;;
      --profile)
        if [[ "$2" == "optional" ]]; then
          PROFILE_OPTIONAL="true"
        else
          die "Unsupported profile: $2"
        fi
        shift 2
        ;;
      --services)
        BACKEND_SERVICES="$2"
        shift 2
        ;;
      --apps)
        APPS_TARGETS="$2"
        shift 2
        ;;
      --target)
        LOG_TARGET="$2"
        shift 2
        ;;
      --tail)
        LOG_TAIL="$2"
        shift 2
        ;;
      --follow)
        LOG_FOLLOW="true"
        shift
        ;;
      --volumes)
        REMOVE_VOLUMES="true"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done
}

compose_cmd() {
  require_cmd docker
  docker compose -f "$COMPOSE_FILE" "$@"
}

start_backend() {
  local compose_args=()
  if [[ "$PROFILE_OPTIONAL" == "true" ]]; then
    compose_args+=(--profile optional)
  fi
  compose_args+=(up -d)

  local services=()
  if [[ -n "${BACKEND_SERVICES:-}" ]]; then
    IFS=',' read -r -a services <<<"$BACKEND_SERVICES"
  fi
  if [[ ${#services[@]} -gt 0 ]]; then
    local svc
    for svc in "${services[@]}"; do
      svc="${svc//[[:space:]]/}"
      if [[ -n "$svc" ]]; then
        compose_args+=("$svc")
      fi
    done
  fi

  log "Starting backend services..."
  compose_cmd "${compose_args[@]}"
}

stop_backend() {
  local services=()
  local filtered=()
  if [[ -n "${BACKEND_SERVICES:-}" ]]; then
    IFS=',' read -r -a services <<<"$BACKEND_SERVICES"
  fi
  local svc
  for svc in "${services[@]}"; do
    svc="${svc//[[:space:]]/}"
    if [[ -n "$svc" ]]; then
      filtered+=("$svc")
    fi
  done

  if [[ ${#filtered[@]} -gt 0 ]]; then
    log "Stopping selected backend services..."
    compose_cmd stop "${filtered[@]}"
    return
  fi

  if [[ "$REMOVE_VOLUMES" == "true" ]]; then
    log "Stopping backend and removing volumes..."
    compose_cmd down -v
  else
    log "Stopping backend..."
    compose_cmd down
  fi
}

restart_backend() {
  stop_backend
  start_backend
}

start_apps() {
  local apps=()
  if [[ -n "${APPS_TARGETS:-}" ]]; then
    IFS=',' read -r -a apps <<<"$APPS_TARGETS"
  fi
  if [[ ${#apps[@]} -eq 0 ]]; then
    apps=(web mobile)
  fi

  for app in "${apps[@]}"; do
    app="${app//[[:space:]]/}"
    if [[ -z "$app" ]]; then
      continue
    fi
    case "$app" in
      web)
        start_web
        ;;
      mobile)
        require_cmd corepack
        start_app "mobile" "$(node_runtime_prefix)corepack pnpm --filter mobile start" "$MOBILE_PID_FILE" "$MOBILE_LOG_FILE"
        ;;
      *)
        die "Unsupported app target: $app"
        ;;
    esac
  done
}

stop_apps() {
  local apps=()
  if [[ -n "${APPS_TARGETS:-}" ]]; then
    IFS=',' read -r -a apps <<<"$APPS_TARGETS"
  fi
  if [[ ${#apps[@]} -eq 0 ]]; then
    apps=(web mobile)
  fi

  for app in "${apps[@]}"; do
    app="${app//[[:space:]]/}"
    if [[ -z "$app" ]]; then
      continue
    fi
    case "$app" in
      web)
        stop_web
        ;;
      mobile)
        stop_app "mobile" "$MOBILE_PID_FILE"
        ;;
      *)
        die "Unsupported app target: $app"
        ;;
    esac
  done
}

restart_apps() {
  stop_apps
  start_apps
}

show_status() {
  if [[ "$MODE" == "all" || "$MODE" == "backend" ]]; then
    log "Backend status:"
    compose_cmd ps || true
  fi

  if [[ "$MODE" == "all" || "$MODE" == "apps" ]]; then
    log "App status:"
    status_web
    status_app "mobile" "$MOBILE_PID_FILE" "$MOBILE_LOG_FILE"
  fi
}

show_logs() {
  local follow_args=()
  if [[ "$LOG_FOLLOW" == "true" ]]; then
    follow_args+=(--follow)
  fi

  case "$LOG_TARGET" in
    all)
      compose_cmd logs --tail "$LOG_TAIL" "${follow_args[@]}"
      ;;
    backend)
      compose_cmd logs --tail "$LOG_TAIL" "${follow_args[@]}"
      ;;
    apps)
      log "--- web logs ---"
      tail -n "$LOG_TAIL" "$WEB_LOG_FILE" 2>/dev/null || true
      log "--- mobile logs ---"
      tail -n "$LOG_TAIL" "$MOBILE_LOG_FILE" 2>/dev/null || true
      if [[ "$LOG_FOLLOW" == "true" ]]; then
        tail -n "$LOG_TAIL" -f "$WEB_LOG_FILE" "$MOBILE_LOG_FILE"
      fi
      ;;
    web)
      if [[ "$LOG_FOLLOW" == "true" ]]; then
        tail -n "$LOG_TAIL" -f "$WEB_LOG_FILE"
      else
        tail -n "$LOG_TAIL" "$WEB_LOG_FILE"
      fi
      ;;
    mobile)
      if [[ "$LOG_FOLLOW" == "true" ]]; then
        tail -n "$LOG_TAIL" -f "$MOBILE_LOG_FILE"
      else
        tail -n "$LOG_TAIL" "$MOBILE_LOG_FILE"
      fi
      ;;
    *)
      compose_cmd logs --tail "$LOG_TAIL" "${follow_args[@]}" "$LOG_TARGET"
      ;;
  esac
}

run_health_checks() {
  require_cmd curl
  local urls=(
    "$API_HEALTH_URL"
    "$KB_HEALTH_URL"
    "$KG_HEALTH_URL"
    "$MEDIA_HEALTH_URL"
    "$AGENTS_HEALTH_URL"
  )

  for url in "${urls[@]}"; do
    if curl -fsS "$url" >/dev/null; then
      log "ok: $url"
    else
      log "fail: $url"
      return 1
    fi
  done
}

run_setup() {
  require_cmd docker
  require_cmd corepack
  (cd "$ROOT_DIR" && run_with_node_runtime "corepack pnpm install")
  (cd "$ROOT_DIR" && bash scripts/build.sh packages)
  log "Setup complete"
}

run_build() {
  (cd "$ROOT_DIR" && bash scripts/build.sh)
}

run_warmup() {
  (cd "$ROOT_DIR" && bash scripts/run_warmup.sh "$@")
}

run_demo() {
  (cd "$ROOT_DIR" && bash scripts/demo.sh)
}

run_tests() {
  (cd "$ROOT_DIR" && bash scripts/test.sh)
}

run_ui_tests() {
  (cd "$ROOT_DIR" && bash scripts/test-ui.sh)
}

run_aws_tf() {
  (cd "$ROOT_DIR" && bash scripts/aws/terraform.sh "$@")
}

run_aws_push() {
  (cd "$ROOT_DIR" && bash scripts/aws/push_and_run.sh "$@")
}

run_aws_guardrails() {
  (cd "$ROOT_DIR" && bash scripts/aws/guardrails_check.sh "$@")
}

run_aws_preflight() {
  (cd "$ROOT_DIR" && bash scripts/aws/preflight.sh "$@")
}

clean_all() {
  MODE="all"
  stop_backend || true
  stop_apps || true
  rm -rf "$RUNTIME_DIR"
  log "Clean complete"
}

main() {
  local command="${1:-help}"
  shift || true

  # Warm-up has its own option set; pass through unchanged.
  if [[ "$command" == "warmup" ]]; then
    run_warmup "$@"
    return
  fi
  if [[ "$command" == "aws-tf" ]]; then
    run_aws_tf "$@"
    return
  fi
  if [[ "$command" == "aws-push" ]]; then
    run_aws_push "$@"
    return
  fi
  if [[ "$command" == "aws-guardrails" ]]; then
    run_aws_guardrails "$@"
    return
  fi
  if [[ "$command" == "aws-preflight" ]]; then
    run_aws_preflight "$@"
    return
  fi

  parse_args "$@"

  case "$command" in
    help)
      usage
      ;;
    setup)
      run_setup
      ;;
    build)
      run_build
      ;;
    start)
      if [[ "$MODE" == "all" || "$MODE" == "backend" ]]; then
        start_backend
      fi
      if [[ "$MODE" == "all" || "$MODE" == "apps" ]]; then
        start_apps
      fi
      ;;
    stop)
      if [[ "$MODE" == "all" || "$MODE" == "apps" ]]; then
        stop_apps
      fi
      if [[ "$MODE" == "all" || "$MODE" == "backend" ]]; then
        stop_backend
      fi
      ;;
    restart)
      if [[ "$MODE" == "all" || "$MODE" == "apps" ]]; then
        restart_apps
      fi
      if [[ "$MODE" == "all" || "$MODE" == "backend" ]]; then
        restart_backend
      fi
      ;;
    status)
      show_status
      ;;
    logs)
      show_logs
      ;;
    health)
      run_health_checks
      ;;
    demo)
      run_demo
      ;;
    test)
      run_tests
      ;;
    ui-test)
      run_ui_tests
      ;;
    clean)
      clean_all
      ;;
    *)
      die "Unknown command: $command"
      ;;
  esac
}

main "$@"
