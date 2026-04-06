#!/usr/bin/env bash
set -euo pipefail

USER="ec2-user"
IP=""
KEY_PATH=""
SERVICE=""

usage() {
  cat <<USAGE
Usage:
  bash scripts/aws/remote_logs.sh --ip <public_ip> --key <ssh_key_path> [--service api]
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
    --service)
      SERVICE="$2"
      shift 2
      ;;
    --user)
      USER="$2"
      shift 2
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$IP" || -z "$KEY_PATH" ]]; then
  usage
  exit 1
fi

TARGET="${USER}@${IP}"
SERVICE_ARG=""
if [[ -n "$SERVICE" ]]; then
  SERVICE_ARG="$SERVICE"
fi

ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no "$TARGET" "\
  cd /opt/cerebral-cortex && docker compose -f infra/docker-compose.aws-lite.yml logs --tail 200 -f $SERVICE_ARG\
"
