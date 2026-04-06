#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$ROOT_DIR/infra/aws"
MAIN_TF="$TF_DIR/main.tf"
VARS_TF="$TF_DIR/variables.tf"
AWS_LITE_COMPOSE="$ROOT_DIR/infra/docker-compose.aws-lite.yml"

TFVARS=""
LIVE_MODE="false"
STRICT_WARNINGS="false"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

usage() {
  cat <<USAGE
Usage:
  bash scripts/aws/guardrails_check.sh [--tfvars <path>] [--live] [--strict-warnings]

Checks AWS free-tier and pricing guardrails for this repository.

Options:
  --tfvars <path>        Terraform vars file (default: infra/aws/terraform.tfvars if present, else terraform.tfvars.example)
  --live                 Run live AWS checks (requires aws CLI + terraform + credentials + applied stack)
  --strict-warnings      Treat warnings as failures
USAGE
}

pass() {
  echo "[PASS] $*"
  PASS_COUNT=$((PASS_COUNT + 1))
}

warn() {
  echo "[WARN] $*"
  WARN_COUNT=$((WARN_COUNT + 1))
}

fail() {
  echo "[FAIL] $*"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

require_file() {
  local file="$1"
  [[ -f "$file" ]] || {
    echo "Missing required file: $file"
    exit 1
  }
}

read_var_from_file() {
  local key="$1"
  local file="$2"
  awk -v key="$key" '
    /^[[:space:]]*#/ { next }
    {
      line = $0
      if (match(line, "^[[:space:]]*" key "[[:space:]]*=[[:space:]]*")) {
        sub("^[[:space:]]*" key "[[:space:]]*=[[:space:]]*", "", line)
        sub(/[[:space:]]*#.*/, "", line)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
        gsub(/^"|"$/, "", line)
        print line
        exit
      }
    }
  ' "$file"
}

default_var() {
  case "$1" in
    project_name) echo "cerebral-cortex" ;;
    region) echo "us-east-1" ;;
    instance_type) echo "t3.micro" ;;
    root_volume_size_gb) echo "20" ;;
    http_ingress_cidr) echo "0.0.0.0/0" ;;
    enable_ssh) echo "true" ;;
    ssh_ingress_cidr) echo "0.0.0.0/0" ;;
    alert_email) echo "" ;;
    monthly_budget_usd) echo "8" ;;
    budget_actual_alert_percent) echo "70" ;;
    budget_forecast_alert_percent) echo "90" ;;
    emergency_stop_threshold_usd) echo "10" ;;
    start_schedule_utc) echo "cron(0 13 * * ? *)" ;;
    stop_schedule_utc) echo "cron(0 4 * * ? *)" ;;
    *) echo "" ;;
  esac
}

resolve_var() {
  local key="$1"
  local value
  value="$(read_var_from_file "$key" "$TFVARS")"
  if [[ -z "$value" ]]; then
    value="$(default_var "$key")"
  fi
  echo "$value"
}

is_numeric() {
  [[ "$1" =~ ^[0-9]+([.][0-9]+)?$ ]]
}

check_static_guardrails() {
  if ! command -v rg >/dev/null 2>&1; then
    echo "ripgrep (rg) is required for static guardrail checks."
    exit 1
  fi

  require_file "$MAIN_TF"
  require_file "$VARS_TF"
  require_file "$AWS_LITE_COMPOSE"
  require_file "$TFVARS"

  local project_name region instance_type root_volume_size_gb monthly_budget_usd emergency_stop_threshold_usd
  local budget_actual_alert_percent budget_forecast_alert_percent start_schedule_utc stop_schedule_utc
  local http_ingress_cidr enable_ssh ssh_ingress_cidr alert_email

  project_name="$(resolve_var project_name)"
  region="$(resolve_var region)"
  instance_type="$(resolve_var instance_type)"
  root_volume_size_gb="$(resolve_var root_volume_size_gb)"
  monthly_budget_usd="$(resolve_var monthly_budget_usd)"
  emergency_stop_threshold_usd="$(resolve_var emergency_stop_threshold_usd)"
  budget_actual_alert_percent="$(resolve_var budget_actual_alert_percent)"
  budget_forecast_alert_percent="$(resolve_var budget_forecast_alert_percent)"
  start_schedule_utc="$(resolve_var start_schedule_utc)"
  stop_schedule_utc="$(resolve_var stop_schedule_utc)"
  http_ingress_cidr="$(resolve_var http_ingress_cidr)"
  enable_ssh="$(resolve_var enable_ssh)"
  ssh_ingress_cidr="$(resolve_var ssh_ingress_cidr)"
  alert_email="$(resolve_var alert_email)"

  [[ -n "$project_name" ]] && pass "project_name is set ($project_name)" || fail "project_name is empty."

  if [[ "$instance_type" =~ ^(t2\.micro|t3\.micro|t4g\.micro)$ ]]; then
    pass "instance_type is free-tier friendly ($instance_type)"
  else
    fail "instance_type=$instance_type is not micro/free-tier oriented."
  fi

  if is_numeric "$root_volume_size_gb" && awk "BEGIN {exit !($root_volume_size_gb <= 30)}"; then
    pass "root_volume_size_gb=$root_volume_size_gb is within free-tier baseline (<=30 GB)."
  else
    fail "root_volume_size_gb=$root_volume_size_gb exceeds free-tier baseline (<=30 GB)."
  fi

  if is_numeric "$monthly_budget_usd" && awk "BEGIN {exit !($monthly_budget_usd > 0 && $monthly_budget_usd <= 12)}"; then
    pass "monthly_budget_usd=$monthly_budget_usd is strict."
  else
    fail "monthly_budget_usd=$monthly_budget_usd is outside strict guardrail range (0,12]."
  fi

  if is_numeric "$emergency_stop_threshold_usd" && is_numeric "$monthly_budget_usd" && awk "BEGIN {exit !($emergency_stop_threshold_usd <= $monthly_budget_usd + 2)}"; then
    pass "emergency_stop_threshold_usd=$emergency_stop_threshold_usd is tightly coupled to monthly budget."
  else
    fail "emergency_stop_threshold_usd=$emergency_stop_threshold_usd is too high versus monthly_budget_usd=$monthly_budget_usd."
  fi

  if is_numeric "$budget_actual_alert_percent" && awk "BEGIN {exit !($budget_actual_alert_percent >= 40 && $budget_actual_alert_percent <= 80)}"; then
    pass "budget_actual_alert_percent=$budget_actual_alert_percent is within guardrail range."
  else
    fail "budget_actual_alert_percent=$budget_actual_alert_percent should be between 40 and 80."
  fi

  if is_numeric "$budget_forecast_alert_percent" && is_numeric "$budget_actual_alert_percent" && awk "BEGIN {exit !($budget_forecast_alert_percent > $budget_actual_alert_percent && $budget_forecast_alert_percent <= 95)}"; then
    pass "budget_forecast_alert_percent=$budget_forecast_alert_percent is valid."
  else
    fail "budget_forecast_alert_percent=$budget_forecast_alert_percent must be > actual threshold and <=95."
  fi

  if [[ -n "$start_schedule_utc" && -n "$stop_schedule_utc" && "$start_schedule_utc" != "$stop_schedule_utc" ]]; then
    pass "start/stop schedules are configured and distinct."
  else
    fail "start_schedule_utc and stop_schedule_utc must both be set and different."
  fi

  if [[ "$region" == "us-east-1" ]]; then
    pass "region=$region aligns with simplest billing metric handling."
  else
    warn "region=$region is supported, but verify billing alarm behavior and EC2 free-tier terms for this region."
  fi

  if [[ -n "$alert_email" && "$alert_email" != "you@example.com" ]]; then
    pass "alert_email configured for budget/emergency notifications."
  else
    warn "alert_email is blank or placeholder; budget/emergency alerts may be missed."
  fi

  if [[ "$http_ingress_cidr" == "0.0.0.0/0" ]]; then
    warn "http_ingress_cidr is open to world. Restrict if possible."
  else
    pass "http_ingress_cidr is restricted ($http_ingress_cidr)."
  fi

  if [[ "$enable_ssh" == "true" && "$ssh_ingress_cidr" == "0.0.0.0/0" ]]; then
    warn "SSH is enabled from world. Prefer SSM-only or restricted CIDR."
  elif [[ "$enable_ssh" == "false" ]]; then
    pass "SSH ingress disabled."
  else
    pass "SSH ingress is restricted ($ssh_ingress_cidr)."
  fi

  if rg -q "resource \"aws_budgets_budget\" \"monthly\"" "$MAIN_TF"; then
    pass "Monthly budget resource is declared."
  else
    fail "Monthly budget resource is missing."
  fi

  if rg -q "resource \"aws_cloudwatch_metric_alarm\" \"billing_emergency\"" "$MAIN_TF"; then
    pass "Billing emergency alarm is declared."
  else
    fail "Billing emergency alarm is missing."
  fi

  if rg -q "resource \"aws_cloudwatch_event_rule\" \"scheduled_stop\"" "$MAIN_TF" && rg -q "resource \"aws_cloudwatch_event_rule\" \"scheduled_start\"" "$MAIN_TF"; then
    pass "Scheduled stop/start EventBridge rules are declared."
  else
    fail "Scheduled stop/start EventBridge rules are missing."
  fi

  if rg -q "resource \"aws_lambda_function\" \"instance_control\"" "$MAIN_TF"; then
    pass "Instance control Lambda is declared."
  else
    fail "Instance control Lambda is missing."
  fi

  local forbidden_pattern
  forbidden_pattern='resource "aws_(nat_gateway|db_instance|rds_cluster|elasticache_cluster|elb|lb|eks_cluster|opensearch_domain)"'
  if rg -q "$forbidden_pattern" "$MAIN_TF"; then
    fail "Found high-cost managed resources in main.tf (violates free-tier cost profile)."
  else
    pass "No high-cost managed resources detected in main.tf."
  fi

  if rg -q "postgres|redis|neo4j|ollama|livekit" "$AWS_LITE_COMPOSE"; then
    fail "AWS-lite compose includes non-lite services (postgres/redis/neo4j/ollama/livekit)."
  else
    pass "AWS-lite compose excludes heavy optional services."
  fi

  if rg -q "nginx:|web:|api:|kb:|kg:|media:|agents:" "$AWS_LITE_COMPOSE"; then
    pass "AWS-lite compose includes expected core service set."
  else
    fail "AWS-lite compose missing expected core service set."
  fi
}

check_live_guardrails() {
  if ! command -v aws >/dev/null 2>&1; then
    fail "aws CLI missing; cannot run --live checks."
    return
  fi
  if ! command -v terraform >/dev/null 2>&1; then
    fail "terraform missing; cannot run --live checks."
    return
  fi

  local account_id project_name region
  account_id="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
  if [[ -z "$account_id" || "$account_id" == "None" ]]; then
    fail "Unable to resolve AWS caller identity for live checks."
    return
  fi
  pass "AWS caller identity resolved (account=$account_id)."

  project_name="$(resolve_var project_name)"
  region="$(resolve_var region)"

  if aws budgets describe-budget --account-id "$account_id" --budget-name "${project_name}-monthly-budget" --region us-east-1 >/dev/null 2>&1; then
    pass "Live budget exists: ${project_name}-monthly-budget"
  else
    fail "Live budget missing: ${project_name}-monthly-budget"
  fi

  if aws cloudwatch describe-alarms --region us-east-1 --alarm-names "${project_name}-estimated-charge-emergency" --query "MetricAlarms[0].AlarmName" --output text 2>/dev/null | rg -q "${project_name}-estimated-charge-emergency"; then
    pass "Live billing emergency alarm exists."
  else
    fail "Live billing emergency alarm missing."
  fi

  if aws events describe-rule --region us-east-1 --name "${project_name}-scheduled-stop" >/dev/null 2>&1 && \
     aws events describe-rule --region us-east-1 --name "${project_name}-scheduled-start" >/dev/null 2>&1; then
    pass "Live scheduled stop/start rules exist."
  else
    fail "Live scheduled stop/start rules missing."
  fi

  if aws lambda get-function --region us-east-1 --function-name "${project_name}-instance-control" >/dev/null 2>&1; then
    pass "Live instance-control lambda exists."
  else
    fail "Live instance-control lambda missing."
  fi

  local live_instance_type
  live_instance_type="$(aws ec2 describe-instances \
    --region "$region" \
    --filters "Name=tag:Name,Values=${project_name}-ec2" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
    --query "Reservations[].Instances[].InstanceType" \
    --output text 2>/dev/null || true)"
  if [[ -z "$live_instance_type" || "$live_instance_type" == "None" ]]; then
    warn "No EC2 instance found by tag Name=${project_name}-ec2 for live instance-type validation."
  elif [[ "$live_instance_type" =~ ^(t2\.micro|t3\.micro|t4g\.micro)$ ]]; then
    pass "Live EC2 instance type is free-tier friendly ($live_instance_type)."
  else
    fail "Live EC2 instance type is not free-tier friendly ($live_instance_type)."
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tfvars)
      TFVARS="$2"
      shift 2
      ;;
    --live)
      LIVE_MODE="true"
      shift
      ;;
    --strict-warnings)
      STRICT_WARNINGS="true"
      shift
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

if [[ -z "$TFVARS" ]]; then
  if [[ -f "$TF_DIR/terraform.tfvars" ]]; then
    TFVARS="$TF_DIR/terraform.tfvars"
  else
    TFVARS="$TF_DIR/terraform.tfvars.example"
  fi
fi

echo "Running AWS free-tier pricing guardrail checks"
echo "  tfvars: $TFVARS"
echo "  live mode: $LIVE_MODE"
echo

check_static_guardrails
if [[ "$LIVE_MODE" == "true" ]]; then
  check_live_guardrails
fi

if [[ "$STRICT_WARNINGS" == "true" && $WARN_COUNT -gt 0 ]]; then
  FAIL_COUNT=$((FAIL_COUNT + WARN_COUNT))
  WARN_COUNT=0
  echo
  echo "[INFO] strict warning mode enabled: warnings counted as failures."
fi

echo
echo "Guardrail summary: pass=$PASS_COUNT warn=$WARN_COUNT fail=$FAIL_COUNT"
if [[ $FAIL_COUNT -gt 0 ]]; then
  exit 1
fi
