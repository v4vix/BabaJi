#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_RUNTIME_VERSION="${NODE_RUNTIME_VERSION:-22.22.0}"
NODE_RUNTIME_BIN="$HOME/.nvm/versions/node/v${NODE_RUNTIME_VERSION#v}/bin"

export PATH="$NODE_RUNTIME_BIN:$PATH"
BUILD_SCOPE="${1:-all}"
REFRESH_PACKAGE_DIST="${REFRESH_PACKAGE_DIST:-0}"

cd "$ROOT_DIR"

ensure_package_runtime() {
  local package_dir="$1"
  local runtime_js="$ROOT_DIR/$package_dir/dist/index.js"
  local runtime_dts="$ROOT_DIR/$package_dir/dist/index.d.ts"

  if [[ "$REFRESH_PACKAGE_DIST" == "1" ]]; then
    (
      cd "$ROOT_DIR/$package_dir"
      ./node_modules/.bin/tsc -p tsconfig.json </dev/null
    )
  fi

  [[ -f "$runtime_js" ]] || {
    printf 'Missing package runtime artifact: %s\n' "$runtime_js" >&2
    exit 1
  }
  [[ -f "$runtime_dts" ]] || {
    printf 'Missing package type artifact: %s\n' "$runtime_dts" >&2
    exit 1
  }
}

case "$BUILD_SCOPE" in
  all|packages|--packages-only|web|--web-only)
    ensure_package_runtime "packages/astrology-kb"
    ensure_package_runtime "packages/reports"
    ensure_package_runtime "packages/ui"
    ensure_package_runtime "packages/video"
    ;;
  *)
    printf 'Unsupported build scope: %s\n' "$BUILD_SCOPE" >&2
    exit 1
    ;;
esac

if [[ "$BUILD_SCOPE" == "all" || "$BUILD_SCOPE" == "web" || "$BUILD_SCOPE" == "--web-only" ]]; then
  bash -lc "export PATH='$NODE_RUNTIME_BIN':\$PATH && cd '$ROOT_DIR/apps/web' && rm -rf .next && NEXT_DISABLE_TELEMETRY=1 ./node_modules/.bin/next build" </dev/null
fi
