# AWS Production Execution Plan (Free-Tier Cost-Capped)

## Objective
Move from local prototype to production-grade operations while keeping infrastructure spend tightly controlled.

## Phase 1: Cost-Capped Baseline (Implemented)
- Single EC2 micro deployment with Docker Compose AWS-lite profile.
- Budget + billing alarms + emergency stop lambda.
- Scheduled stop/start automation.
- Deployment scripts and runbooks.

Exit criteria:
- Web/API reachable on EC2 public IP.
- Alert subscriptions confirmed.
- Stop/start schedule verified.

## Phase 2: Security Hardening
- TLS termination with HTTPS (ACM + CloudFront/ALB or Caddy/Let's Encrypt).
- Secrets migration to AWS SSM Parameter Store.
- Tighten security group CIDR and disable SSH if SSM-only operations are viable.
- Add WAF or edge rate limits if internet-exposed.

Exit criteria:
- No plaintext secrets on disk.
- HTTPS-only access.
- Principle of least privilege IAM review complete.

## Phase 3: Reliability and Observability
- Structured logs and retention policy.
- Health checks integrated with automated restart policy.
- Basic uptime and error-rate alerts.
- Backup and restore procedure for persistent data directories.

Exit criteria:
- Documented recovery runbook tested.
- Mean time to detect failures under target SLA.

## Phase 4: Product Completeness
- Replace stubs with full production integrations:
  - deterministic Jyotish engine
  - robust OCR/embeddings/KG pipeline
  - real MP4 rendering pipeline and storage lifecycle
  - full billing entitlement reconciliation

Exit criteria:
- End-to-end acceptance tests green.
- Business-critical workflows functional in production.

## Phase 5: Cost Optimization Beyond Free-Tier
- Introduce usage-based feature flags.
- Autosuspend non-critical workers when idle.
- Weekly cost review and optimization loop.

Exit criteria:
- Spend remains under budget cap with alert response SLA.
