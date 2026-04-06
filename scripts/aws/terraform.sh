#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$ROOT_DIR/infra/aws"

usage() {
  cat <<USAGE
Usage:
  bash scripts/aws/terraform.sh <init|plan|apply|destroy|output> [extra terraform args]

Examples:
  bash scripts/aws/terraform.sh init
  bash scripts/aws/terraform.sh plan -var-file=terraform.tfvars
  bash scripts/aws/terraform.sh apply -var-file=terraform.tfvars
  bash scripts/aws/terraform.sh output
USAGE
}

cmd="${1:-}" || true
if [[ -z "$cmd" ]]; then
  usage
  exit 1
fi
shift || true

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform is required"
  exit 1
fi

cd "$TF_DIR"

case "$cmd" in
  init)
    terraform init "$@"
    ;;
  plan)
    terraform plan "$@"
    ;;
  apply)
    terraform apply "$@"
    ;;
  destroy)
    terraform destroy "$@"
    ;;
  output)
    terraform output "$@"
    ;;
  *)
    usage
    exit 1
    ;;
esac
