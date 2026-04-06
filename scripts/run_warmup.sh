#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.yml"

MODEL="${CORTEX_WARMUP_MODEL:-llama3.1:8b}"
TIMEOUT_SEC="${CORTEX_WARMUP_TIMEOUT:-240}"
INTERVAL_SEC="${CORTEX_WARMUP_INTERVAL:-5}"
START_BACKEND="true"
PROFILE_OPTIONAL="false"
PULL_MODEL="true"
PRIME_DOC="true"
PRIME_API="true"

usage() {
  cat <<USAGE
Usage:
  bash scripts/run_warmup.sh [options]

Options:
  --model <name>            Ollama model to pull/warm (default: llama3.1:8b)
  --timeout <seconds>       Health wait timeout (default: 240)
  --interval <seconds>      Health poll interval (default: 5)
  --profile optional        Start backend with optional ASR/TTS profile
  --no-start                Skip backend start step
  --skip-model-pull         Skip Ollama model pull and warm query
  --skip-doc-prime          Skip KB sample document upload
  --skip-api-prime          Skip API endpoint priming requests
  -h, --help                Show help

Environment overrides:
  CORTEX_WARMUP_MODEL
  CORTEX_WARMUP_TIMEOUT
  CORTEX_WARMUP_INTERVAL
USAGE
}

log() {
  printf '%s\n' "$*"
}

warn() {
  printf 'WARN: %s\n' "$*" >&2
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || die "Required command not found: $cmd"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --model)
        MODEL="$2"
        shift 2
        ;;
      --timeout)
        TIMEOUT_SEC="$2"
        shift 2
        ;;
      --interval)
        INTERVAL_SEC="$2"
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
      --no-start)
        START_BACKEND="false"
        shift
        ;;
      --skip-model-pull)
        PULL_MODEL="false"
        shift
        ;;
      --skip-doc-prime)
        PRIME_DOC="false"
        shift
        ;;
      --skip-api-prime)
        PRIME_API="false"
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

start_backend_if_needed() {
  if [[ "$START_BACKEND" == "false" ]]; then
    log "Skipping backend start (--no-start)"
    return
  fi

  local args=(start --mode backend)
  if [[ "$PROFILE_OPTIONAL" == "true" ]]; then
    args+=(--profile optional)
  fi

  log "Starting backend services for warm-up..."
  if ! bash "$SCRIPT_DIR/cortexctl.sh" "${args[@]}"; then
    if [[ "$PROFILE_OPTIONAL" == "true" ]]; then
      warn "Optional profile startup failed. Retrying without optional services."
      bash "$SCRIPT_DIR/cortexctl.sh" start --mode backend
    else
      die "Backend startup failed"
    fi
  fi
}

wait_for_health() {
  local start_ts
  start_ts="$(date +%s)"

  log "Waiting for backend health checks (timeout=${TIMEOUT_SEC}s)..."
  while true; do
    if bash "$SCRIPT_DIR/cortexctl.sh" health >/dev/null 2>&1; then
      log "Health checks passed"
      return
    fi

    local now elapsed
    now="$(date +%s)"
    elapsed=$((now - start_ts))
    if (( elapsed >= TIMEOUT_SEC )); then
      die "Timed out waiting for healthy services"
    fi

    sleep "$INTERVAL_SEC"
  done
}

warm_ollama_model() {
  if [[ "$PULL_MODEL" == "false" ]]; then
    log "Skipping model pull/warm (--skip-model-pull)"
    return
  fi

  if ! docker compose -f "$COMPOSE_FILE" ps --services --status running | grep -qx "ollama"; then
    warn "Ollama service is not running; skipping model warm-up"
    return
  fi

  log "Pulling Ollama model: $MODEL"
  if ! docker compose -f "$COMPOSE_FILE" exec -T ollama ollama pull "$MODEL"; then
    warn "Model pull failed (likely offline). Continuing warm-up without blocking."
    return
  fi

  log "Priming Ollama generate endpoint"
  local payload
  payload=$(printf '{"model":"%s","prompt":"Warmup ping","stream":false}' "$MODEL")
  if ! curl -fsS http://localhost:11434/api/generate -H 'Content-Type: application/json' -d "$payload" >/dev/null; then
    warn "Model prime request failed"
  else
    log "Ollama model warm-up complete"
  fi
}

prime_kb_doc() {
  if [[ "$PRIME_DOC" == "false" ]]; then
    log "Skipping KB doc prime (--skip-doc-prime)"
    return
  fi

  local fixture="$ROOT_DIR/sample_data/scripture_excerpt.txt"
  if [[ ! -f "$fixture" ]]; then
    warn "Fixture not found: $fixture"
    return
  fi

  log "Uploading sample KB document"
  if ! curl -fsS -X POST http://localhost:8102/v1/admin/upload -F "file=@${fixture}" >/dev/null; then
    warn "KB document upload failed"
  else
    log "KB document prime complete"
  fi
}

prime_api_endpoints() {
  if [[ "$PRIME_API" == "false" ]]; then
    log "Skipping API priming (--skip-api-prime)"
    return
  fi

  log "Priming API endpoints"

  curl -fsS -X POST http://localhost:8101/v1/kundli/report \
    -H 'Content-Type: application/json' \
    -H 'X-Plan: elite' \
    -H 'X-User-Id: warmup' \
    -d '{"profile_id":"warmup","birth":{"date":"1994-02-10","time":"08:40","timezone":"Asia/Kolkata","location":"Delhi","latitude":28.6139,"longitude":77.209},"question":"dasha tendencies"}' >/dev/null || warn "Kundli prime failed"

  curl -fsS -X POST http://localhost:8101/v1/vaastu/report \
    -H 'Content-Type: application/json' \
    -H 'X-Plan: elite' \
    -H 'X-User-Id: warmup' \
    -d '{"profile_id":"warmup","layout":{"facing_direction":"East","rooms":{"kitchen":"Southeast","bedroom":"Southwest"},"entrance":"North"}}' >/dev/null || warn "Vaastu report prime failed"

  curl -fsS -X POST http://localhost:8101/v1/video/vaastu \
    -H 'Content-Type: application/json' \
    -H 'X-Plan: elite' \
    -H 'X-User-Id: warmup' \
    -d '{"profile_id":"warmup","topic":"vaastu","payload":{"goal":"warmup"}}' >/dev/null || warn "Vaastu video prime failed"

  curl -fsS -X POST http://localhost:8101/v1/consult/realtime/session \
    -H 'Content-Type: application/json' \
    -H 'X-Plan: elite' \
    -H 'X-User-Id: warmup' \
    -d '{"profile_id":"warmup","mode":"video","consent_recording":true,"consent_transcription":true,"consent_memory":true}' >/dev/null || warn "Consult prime failed"

  log "API priming complete"
}

main() {
  parse_args "$@"

  require_cmd bash
  require_cmd docker
  require_cmd curl

  start_backend_if_needed
  wait_for_health
  warm_ollama_model
  prime_kb_doc
  prime_api_endpoints

  log "Warm-up complete"
  log "Suggested next step: bash scripts/cortexctl.sh start --mode apps"
}

main "$@"
