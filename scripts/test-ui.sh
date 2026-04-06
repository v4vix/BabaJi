#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export RUN_UI_TESTS="${RUN_UI_TESTS:-1}"
export UI_BASE_URL="${UI_BASE_URL:-http://localhost:3000}"

if [[ "$RUN_UI_TESTS" != "1" ]]; then
  echo "RUN_UI_TESTS is not 1, skipping UI Selenium tests."
  exit 0
fi

if ! curl -fsS "$UI_BASE_URL" >/dev/null; then
  echo "UI not reachable at $UI_BASE_URL"
  echo "Start apps first: bash scripts/cortexctl.sh start --mode apps"
  exit 1
fi

if ! curl -fsS "http://localhost:8101/healthz" >/dev/null; then
  echo "API not reachable at http://localhost:8101"
  echo "Start backend first: bash scripts/cortexctl.sh start --mode backend"
  exit 1
fi

python3 -m venv .venv
source .venv/bin/activate
pip install -q pytest selenium

cd "$ROOT_DIR"
pytest -q tests/ui -m ui
