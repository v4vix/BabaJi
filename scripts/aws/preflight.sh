#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI is required"
  exit 1
fi

if command -v terraform >/dev/null 2>&1; then
  echo "terraform detected"
else
  echo "terraform not found (required for provisioning but not for this preflight identity check)"
fi

echo "AWS identity:"
aws sts get-caller-identity

echo

echo "Current region: $REGION"
aws ec2 describe-availability-zones --region "$REGION" --output table >/dev/null

echo
echo "Running static pricing guardrail checks..."
bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/guardrails_check.sh"

echo "Preflight checks passed"
