# AWS Free-Tier Deployment with Strict Cost Control

## Goal
Deploy the platform on AWS with aggressive spend control using a single EC2 micro instance and automated guardrails.

## Architecture (Cost-Constrained)
- One EC2 micro instance (`t3.micro` default) in default VPC.
- One Elastic IP attached to the instance.
- Docker Compose stack (`infra/docker-compose.aws-lite.yml`) with:
  - `nginx` (public entrypoint on port 80)
  - `web`
  - `api`
  - `kb`
  - `kg`
  - `media`
  - `agents`
- No managed RDS/ElastiCache/NAT Gateway in this profile to avoid recurring non-free-tier charges.

## Why this profile
This codebase is multi-service, but a strict budget profile avoids high-cost managed services and keeps infrastructure minimal.

## Cost Guardrails Implemented
Terraform (`infra/aws`) provisions:
- Monthly AWS Budget alerts (`aws_budgets_budget`) with configurable thresholds.
- Billing alarm on `AWS/Billing EstimatedCharges` for emergency response.
- SNS topics for budget and emergency alerts (email optional).
- Lambda auto-control to stop/start the EC2 instance.
- Daily scheduled stop/start via EventBridge rules.

## Files
- Terraform: `infra/aws/main.tf`, `infra/aws/variables.tf`, `infra/aws/outputs.tf`
- User-data bootstrap: `infra/aws/templates/user_data.sh.tftpl`
- Lambda instance controller: `infra/aws/lambda/instance_control.py`
- Terraform vars example: `infra/aws/terraform.tfvars.example`
- AWS Compose profile: `infra/docker-compose.aws-lite.yml`
- Reverse proxy config: `infra/nginx/aws-lite.conf`
- Helpers:
  - `scripts/aws/terraform.sh`
  - `scripts/aws/push_and_run.sh`
  - `scripts/aws/remote_logs.sh`
  - `scripts/aws/preflight.sh`

## Prerequisites
- AWS account with billing access.
- AWS CLI configured (`aws configure`).
- Terraform >= 1.6.
- SSH key pair (existing EC2 key name or public key string).

## 0) Validate Pricing Guardrails (Static)
```bash
bash scripts/cortexctl.sh aws-guardrails --tfvars infra/aws/terraform.tfvars
```

Optional live validation after deploy:
```bash
bash scripts/cortexctl.sh aws-guardrails --tfvars infra/aws/terraform.tfvars --live
```

## 1) Preflight
```bash
bash scripts/aws/preflight.sh
```

## 2) Configure Terraform Variables
```bash
cd infra/aws
cp terraform.tfvars.example terraform.tfvars
```

Set at minimum:
- `ssh_public_key` or `existing_key_name`
- `alert_email`
- `region`
- `monthly_budget_usd`
- `start_schedule_utc` / `stop_schedule_utc`

Recommended strict defaults:
- `monthly_budget_usd = 8`
- `emergency_stop_threshold_usd = 10`
- `instance_type = "t3.micro"`

## 3) Provision Infrastructure
```bash
bash scripts/cortexctl.sh aws-tf init
bash scripts/cortexctl.sh aws-tf apply -var-file=terraform.tfvars
```

Get outputs:
```bash
bash scripts/cortexctl.sh aws-tf output
```

You will receive `public_ip` and `web_url`.

## 4) Confirm SNS Subscriptions
If `alert_email` is set, confirm both SNS subscriptions from your inbox. Unconfirmed subscriptions will not deliver alerts.

## 5) Deploy Application Code to EC2
```bash
bash scripts/cortexctl.sh aws-push --ip <PUBLIC_IP> --key <PATH_TO_PRIVATE_KEY>
```

This syncs code to `/opt/cerebral-cortex` and runs:
```bash
docker compose -f infra/docker-compose.aws-lite.yml up -d --build
```

## 6) Access
- Web: `http://<PUBLIC_IP>`
- API via nginx proxy: `http://<PUBLIC_IP>/api/v1/...`

## 7) Operations
Remote logs:
```bash
bash scripts/aws/remote_logs.sh --ip <PUBLIC_IP> --key <PATH_TO_PRIVATE_KEY>
```

Only API logs:
```bash
bash scripts/aws/remote_logs.sh --ip <PUBLIC_IP> --key <PATH_TO_PRIVATE_KEY> --service api
```

## 8) Destroy (Stop Charges)
```bash
bash scripts/cortexctl.sh aws-tf destroy -var-file=terraform.tfvars
```

## Hard Cost-Discipline Checklist
- Keep instance micro-sized.
- Keep runtime window short with `start/stop` schedules.
- Confirm budget and emergency alerts are subscribed.
- Destroy infrastructure when inactive.
- Avoid adding NAT Gateway, RDS, ALB, or other always-on managed services in this pricing profile.

## Free-Tier and Pricing Notes
Free-tier terms and credits can change. Validate in your account before production launch.

Primary AWS references:
- AWS Free Tier updates (posted July 16, 2025): [AWS Free Tier upgrades](https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-upgrades-credits-free-plan/)
- EC2 pricing page (free-tier eligibility notes): [Amazon EC2 Pricing](https://aws.amazon.com/ec2/pricing/)
- AWS Budgets pricing: [AWS Budgets Pricing](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/)
- Billing alarm metric namespace docs: [Using Amazon CloudWatch alarms for billing](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html)
