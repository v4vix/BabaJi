# Cerebral Cortex Service Documentation

## 1. Purpose
Cerebral Cortex is a local-first monorepo for a digital twin platform covering jyotish, scriptures, safe ritual guidance, tarot, numerology, mantra practice, ayurveda education (non-medical), premium vaastu consultancy, gemstone guidance, and realtime consult patterns.

Detailed product and business requirements are published in `docs/BRD_DETAILED.md`.

The system is designed to run entirely on a developer machine (macOS-friendly) with local services and containerized infrastructure.

## 2. Monorepo Layout
- `apps/web`: Next.js web app with routes for kundli, vaastu, consult, business, and admin upload.
- `apps/mobile`: Expo React Native shell for feed-first mobile experience.
- `packages/ui`: shared UI tokens and reusable components.
- `packages/astrology-kb`: shared schemas and typed vaastu/jyotish rule models.
- `packages/reports`: report template renderers (HTML/PDF-ready).
- `packages/video`: video scene and ffmpeg helper templates.
- `services/api`: FastAPI gateway, policy enforcement, entitlements, orchestration entrypoint.
- `services/kb`: ingestion/retrieval for corpus grounding and citations.
- `services/kg`: graph build/query service for explainability.
- `services/agents`: swarm orchestration service.
- `services/media`: video job queue service.
- `services/rtc`: LiveKit local configuration.
- `infra/docker-compose.yml`: local infrastructure and services.
- `tests`: unit, integration, eval tests.
- `sample_data`: non-sensitive fixtures.

## 3. Runtime Architecture
### 3.1 Core Runtime Stack
- API gateway: `services/api` on `8101`.
- KB service: `services/kb` on `8102`.
- KG service: `services/kg` on `8103`.
- Media service: `services/media` on `8104`.
- Agents service: `services/agents` on `8105`.
- Infrastructure: Postgres, Redis, Neo4j, LiveKit, Ollama.
- Optional profile services: whisper.cpp (`ASR`) and Piper (`TTS`).

### 3.2 Flow Summary
1. User interacts from web/mobile.
2. API validates entitlements and safety constraints.
3. API requests citations from KB and graph hints from KG (as needed).
4. API returns grounded response or explicit `general-guidance` fallback.
5. Media service queues video jobs for kundli/vaastu output.
6. Consult sessions are created with explicit consent requirements.

### 3.3 Jyotish Engine Mode
- `services/api/app/jyotish.py` provides deterministic chart computation.
- If `pyswisseph` is available at runtime, it uses sidereal Swiss Ephemeris calculations.
- If unavailable, it falls back to deterministic local mode and labels engine mode in response facts.

## 4. Operational Control Script
A single script manages all systems:
- `scripts/cortexctl.sh`

### 4.1 Supported Commands
- `setup`: install workspace dependencies.
- `warmup`: run pre-seed warm-up sequence (backend start, health wait, model/doc/API priming).
- `start`: start backend services and/or apps.
- `stop`: stop backend services and/or apps.
- `restart`: restart backend services and/or apps.
- `status`: display compose and app process status.
- `logs`: show/follow logs.
- `health`: probe service health endpoints.
- `demo`: execute end-to-end demo API calls.
- `test`: run test script.
- `ui-test`: run Selenium UI functional tests.
- `aws-preflight`: run AWS account/region preflight checks and static pricing guardrails.
- `aws-guardrails`: validate AWS free-tier and pricing guardrails (static and optional live checks).
- `clean`: stop everything and remove local runtime artifacts.
- `aws-tf`: run Terraform helper for AWS infra lifecycle.
- `aws-push`: push repository to EC2 and start AWS-lite runtime.

### 4.2 Runtime Options
- `--mode <all|backend|apps>`: target subsystem scope.
- `--profile optional`: include optional compose services (`whisper_cpp`, `piper_tts`) during start.
- `--services s1,s2`: start/stop specific compose services.
- `--apps web,mobile`: select app process targets.
- `--target ...`: logs target (`all`, `backend`, `apps`, compose service name, `web`, `mobile`).
- `--tail <n>`: log line count for logs command.
- `--follow`: stream logs.
- `--volumes`: remove compose volumes when stopping backend.

### 4.3 Examples
```bash
# Install dependencies
bash scripts/cortexctl.sh setup

# Warm up backend + model + KB/API paths
bash scripts/cortexctl.sh warmup --profile optional --model llama3.1:8b

# Start app clients after warm-up
bash scripts/cortexctl.sh start --mode apps

# If port 3000 is occupied, move the web app:
WEB_PORT=3001 bash scripts/cortexctl.sh start --mode apps --apps web

# Start backend only with optional ASR/TTS profile
bash scripts/cortexctl.sh start --mode backend --profile optional

# Start only API + KB + KG
bash scripts/cortexctl.sh start --mode backend --services api,kb,kg

# Show system status
bash scripts/cortexctl.sh status

# Follow API logs
bash scripts/cortexctl.sh logs --target api --follow

# Health checks
bash scripts/cortexctl.sh health

# Stop apps only
bash scripts/cortexctl.sh stop --mode apps

# Stop backend and remove volumes
bash scripts/cortexctl.sh stop --mode backend --volumes

# Fully clean local runtime files
bash scripts/cortexctl.sh clean

# Run Selenium UI functional tests
bash scripts/cortexctl.sh ui-test

# Run AWS preflight + static guardrails
bash scripts/cortexctl.sh aws-preflight

# Validate AWS guardrails before provisioning
bash scripts/cortexctl.sh aws-guardrails --tfvars infra/aws/terraform.tfvars

# Provision AWS infra
bash scripts/cortexctl.sh aws-tf apply -var-file=infra/aws/terraform.tfvars

# Deploy app onto EC2
bash scripts/cortexctl.sh aws-push --ip <PUBLIC_IP> --key <PRIVATE_KEY_PATH>
```

### 4.4 Backward-Compatible Wrappers
These wrapper scripts call `cortexctl`:
- `scripts/setup.sh`
- `scripts/run.sh`
- `scripts/health.sh`

### 4.5 Warm-Up Script Options
Standalone warm-up script:
- `scripts/run_warmup.sh`

Options:
- `--model <name>`: model name to pull/warm via Ollama API.
- `--timeout <seconds>`: max wait for service health checks.
- `--interval <seconds>`: health poll interval.
- `--profile optional`: includes optional ASR/TTS services while starting backend.
- `--no-start`: skip starting backend (use existing running stack).
- `--skip-model-pull`: skip model pull and generation priming.
- `--skip-doc-prime`: skip KB sample upload.
- `--skip-api-prime`: skip kundli/vaastu/video/consult API priming.

Example:
```bash
bash scripts/run_warmup.sh --profile optional --model llama3.1:8b
```

Note:
- If optional ASR/TTS services fail to start, warm-up automatically retries without optional services so core backend startup is not blocked.
- On Apple Silicon, `whisper_cpp` runs with `linux/amd64` emulation in Docker Compose.

## 5. API Reference
### 5.1 Health
- `GET /healthz`

### 5.2 Core User Features
- `POST /v1/kundli/report`
- `POST /v1/kundli/talk`
- `POST /v1/kundli/rectify`
- `POST /v1/vaastu/report`
- `POST /v1/matchmaking/compare`
- `POST /v1/panchang/daily`
- `POST /v1/muhurta/pick`
- `POST /v1/video/kundli`
- `POST /v1/video/vaastu`
- `POST /v1/consult/realtime/session`
- `POST /v1/consult/summary`
- `POST /v1/tarot/read`
- `POST /v1/numerology/report`
- `POST /v1/mantra/plan`
- `POST /v1/rashifal/personalized`
- `POST /v1/gem/guidance`

### 5.3 Safety-Gated Guidance
- `POST /v1/ritual/guide`
- `POST /v1/ayurveda/guide`

### 5.4 Business and Monetization
- `GET /v1/business/catalog`
- `GET /v1/business/entitlements`
- `POST /v1/business/subscription/change`
- `POST /v1/business/subscription/revoke`
- `POST /v1/business/addons/purchase`
- `POST /v1/business/addons/revoke`
- `GET /v1/business/wallet`
- `POST /v1/business/wallet/topup`
- `POST /v1/business/wallet/debit`
- `POST /v1/business/bundles/purchase`
- `POST /v1/business/offers/claim`
- `POST /v1/business/reviews`
- `GET /v1/business/reviews`
- `POST /v1/business/reviews/{review_id}/moderate`
- `POST /v1/business/disputes`
- `GET /v1/business/disputes`
- `POST /v1/business/disputes/{dispute_id}/resolve`
- `POST /v1/business/refunds`
- `GET /v1/business/refunds`
- `POST /v1/business/refunds/{refund_id}/resolve`
- `GET /v1/business/billing/events`
- `GET /v1/business/subscription/events`

### 5.5 Billing Ingestion
- `POST /v1/billing/apple/notifications`
- `POST /v1/billing/google/rtdn`

### 5.6 Privacy Controls
- `POST /v1/privacy/delete-request`

### 5.7 KB/KG Services
- KB upload: `POST /v1/admin/upload` (KB service)
- KB retrieval: `POST /v1/retrieve` (KB service)
- KG build: `POST /v1/build` (KG service)
- KG query: `GET /v1/query/{subject}` (KG service)

## 6. Entitlements and Plans
Server-side entitlement checks are enforced in API.

Plan map:
- `free`: `chat.basic`, `ritual.guide`, `ayurveda.guide`
- `plus`: free + `kundli.report`, `kundli.talk`, `rashifal.feed`, `panchang.feed`, `muhurta.pick`, `tarot.read`, `numerology.report`, `mantra.plan`
- `pro`: plus + `kundli.video`, `matchmaking.studio`
- `elite`: pro + `vaastu.studio`, `gem.consultancy`, `consult.video`

Add-on map:
- `vaastu_studio_addon`: `vaastu.studio`
- `gem_consultancy_addon`: `gem.consultancy`
- `consult_video_addon`: `consult.video`
- `matchmaking_addon`: `matchmaking.studio`
- `kundli_video_addon`: `kundli.video`

Request headers used in local mode:
- `X-User-Id`
- `X-Plan`

Persistence behavior:
- Subscription and add-on state are persisted and override header `X-Plan` for known users.
- Grace-status subscriptions continue to resolve paid entitlements for continuity during billing retry windows.
- Wallet credits are tracked in a ledger and can be consumed for specific premium actions (for example, video consult fallback when entitlement is absent).
- Billing webhooks write normalized event audits and subscription transitions for dispute and finance traceability.
- Refund requests are tracked with explicit status transitions (`requested`, `approved`, `processed`, `rejected`).

## 7. Safety and Compliance
### 7.1 Hard Rules
- Astrology/tarot/numerology: guidance and reflection only.
- Ayurveda: educational content only; no diagnosis, treatment, dosing, medication advice.
- Ritual/tantra: safe, legal, non-coercive, non-violent, non-sexualized instructions only.
- Gemstone: no guarantees or coercive upsell; due diligence expected.
- Vaastu: informational guidance only; structural changes require licensed professionals.

### 7.2 Technical Enforcement
- `services/api/app/safety.py` contains blocklists and mandatory disclaimers.
- Citation mode labels every response path:
  - `cortex-grounded` when citations exist.
  - `general-guidance` when retrieval is insufficient.

## 8. Data and Privacy Model
Sensitive data includes:
- Birth details (date/time/location/timezone)
- Consult consent and session metadata
- Uploaded corpus files
- Audio/video metadata and playback references

Operational requirements:
- Minimize collection.
- Apply encryption in transit/at rest in production.
- Provide retention and deletion controls.
- Keep explicit consent for recording/transcription/memory.

## 9. Local-First Dependencies
Required:
- Docker + Docker Compose
- Node `22.22.0` + pnpm
- Python 3.11+

Recommended:
- `nvm use` from repo root before running manual web build commands.

Optional model stack profile:
- whisper.cpp for ASR
- Piper for TTS

## 10. Testing and Quality Gates
Test directories:
- `tests/unit`
- `tests/integration`
- `tests/evals`

Run:
```bash
bash scripts/cortexctl.sh test
```

Quality gates represented in project:
- Safety gate coverage for blocked prompt categories.
- Endpoint regression checks.
- Citation mode evaluation check.
- Python service syntax compile checks.

## 11. Troubleshooting
### 11.1 Docker services not starting
- Verify Docker daemon is running.
- Run `bash scripts/cortexctl.sh logs --target backend --follow`.
- Check ports `5432`, `6379`, `7474`, `7687`, `7880`, `8101-8105`, `11434`.

### 11.2 Web or mobile app not running
- Run `bash scripts/cortexctl.sh status`.
- Inspect app logs:
  - `bash scripts/cortexctl.sh logs --target web`
  - `bash scripts/cortexctl.sh logs --target mobile`

### 11.3 Health checks failing
- Start backend first: `bash scripts/cortexctl.sh start --mode backend`.
- Then re-run: `bash scripts/cortexctl.sh health`.

### 11.4 Reset local runtime state
```bash
bash scripts/cortexctl.sh clean
bash scripts/cortexctl.sh start --mode all
```

## 12. Production Hardening Checklist
- Replace webhook HMAC checks with verified Apple JWS and Google Pub/Sub auth validation.
- Add authentication/session hardening and robust RBAC.
- Enable secure secret management and key rotation.
- Introduce persistent job queue and durable media storage.
- Add proper observability stack (metrics, traces, alerts).
- Enforce audit logging and data retention policies.

## 13. Quick Start
```bash
bash scripts/cortexctl.sh setup
bash scripts/cortexctl.sh warmup --profile optional
bash scripts/cortexctl.sh start --mode apps
bash scripts/cortexctl.sh demo
```

## 14. AWS Delivery Plan
- See `docs/AWS_PRODUCTION_EXECUTION_PLAN.md` for phased productionization with strict spend controls.
