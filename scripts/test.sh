#!/usr/bin/env bash
set -euo pipefail

python3 -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q pytest httpx fastapi pydantic pydantic-settings python-jose orjson uvicorn eval_type_backport
pytest -q tests

echo "Tests passed"
