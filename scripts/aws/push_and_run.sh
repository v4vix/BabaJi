#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
USER="ec2-user"
IP=""
KEY_PATH=""

usage() {
  cat <<USAGE
Usage:
  bash scripts/aws/push_and_run.sh --ip <public_ip> --key <ssh_key_path> [--user ec2-user]

This syncs the repo to EC2 and starts AWS-lite stack:
  docker compose -f infra/docker-compose.aws-lite.yml up -d --build
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ip)
      IP="$2"
      shift 2
      ;;
    --key)
      KEY_PATH="$2"
      shift 2
      ;;
    --user)
      USER="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$IP" || -z "$KEY_PATH" ]]; then
  usage
  exit 1
fi

if [[ ! -f "$KEY_PATH" ]]; then
  echo "SSH key not found: $KEY_PATH"
  exit 1
fi

TARGET="${USER}@${IP}"
DEST_DIR="/opt/cerebral-cortex"

rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.venv' \
  --exclude '__pycache__' \
  --exclude '.runtime' \
  -e "ssh -i $KEY_PATH -o StrictHostKeyChecking=no" \
  "$ROOT_DIR/" "$TARGET:$DEST_DIR/"

ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no "$TARGET" "\
  set -euo pipefail; \
  cd $DEST_DIR; \
  sudo chown -R $USER:$USER $DEST_DIR; \
  docker compose -f infra/docker-compose.aws-lite.yml up -d --build; \
  docker compose -f infra/docker-compose.aws-lite.yml ps\
"

echo "Deployment complete. Open: http://$IP"
