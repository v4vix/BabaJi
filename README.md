# Cerebral Cortex Digital Twin Monorepo

Local-first monorepo for a Jyotish + scriptures + rituals + tarot + numerology + mantra + ayurveda educational platform with premium `vaastu` and gemstone consultancy.

## Structure
- `apps/web`: Next.js web app
- `apps/mobile`: Expo React Native app
- `packages/ui`: shared design system tokens/components
- `packages/astrology-kb`: shared schemas/ontology/rules
- `packages/reports`: report template renderers (HTML/PDF-ready)
- `packages/video`: video script/scene templates and render helpers
- `services/api`: FastAPI gateway + entitlement + safety gates
- `services/agents`: swarm orchestrator skeleton
- `services/kb`: ingestion/retrieval service
- `services/kg`: knowledge graph build/query service
- `services/rtc`: LiveKit local config
- `services/media`: local ffmpeg job service
- `infra/docker-compose.yml`: local stack
- `docs`: architecture, threat model, safety, tiers, runbooks, evals, billing lifecycle and persona reviews
- `scripts`: one-command setup/run/test/health
- `tests`: unit/integration/evals
- `sample_data`: non-sensitive demo fixtures

## Quick Start
```bash
nvm use
bash scripts/cortexctl.sh setup
bash scripts/cortexctl.sh warmup --profile optional
bash scripts/cortexctl.sh start --mode apps
bash scripts/cortexctl.sh test
bash scripts/cortexctl.sh ui-test
```

If `3000` is already taken:
```bash
WEB_PORT=3001 bash scripts/cortexctl.sh start --mode apps --apps web
RUN_UI_TESTS=1 UI_BASE_URL=http://localhost:3001 bash scripts/test-ui.sh
```

## Runtime Baseline
- Supported Node runtime: `22.22.0`
- Repo pin: `.nvmrc`
- Web launcher in `cortexctl.sh` automatically switches to the pinned Node runtime for setup and managed web start.

## Seeded Access
- Demo and review environments automatically seed these accounts by default:
- `free@babaji.app`
- `plus@babaji.app`
- `pro@babaji.app`
- `elite@babaji.app`
- `support@babaji.app`
- `admin@babaji.app`
- Default password: `BabaJiDemo123!`
- Override with `SEED_ACCOUNT_PASSWORD`, disable with `SEED_DEMO_ACCOUNTS=false`, and hide the public demo catalog with `EXPOSE_SEED_ACCOUNT_CATALOG=false`.

## Operations
- Single control surface: `scripts/cortexctl.sh`
- Full service documentation: `docs/SERVICE_DOCUMENTATION.md`
- Detailed business requirements document: `docs/BRD_DETAILED.md`
- Selenium UI testing guide: `docs/TESTING_UI_SELENIUM.md`
- AWS free-tier deploy guide: `docs/AWS_FREE_TIER_DEPLOYMENT.md`
- AWS production execution plan: `docs/AWS_PRODUCTION_EXECUTION_PLAN.md`
- Help:
```bash
bash scripts/cortexctl.sh help
```

## Warm-Up
- First-run warm-up script: `scripts/run_warmup.sh`
- Through control surface: `bash scripts/cortexctl.sh warmup`
- Example:
```bash
bash scripts/cortexctl.sh warmup --profile optional --model llama3.1:8b
```
- If optional ASR/TTS services fail, warm-up automatically retries core backend startup without optional services.

## AWS Deploy (Strict Cost)
```bash
bash scripts/cortexctl.sh aws-guardrails --tfvars infra/aws/terraform.tfvars
bash scripts/cortexctl.sh aws-tf init
bash scripts/cortexctl.sh aws-tf apply -var-file=infra/aws/terraform.tfvars
bash scripts/cortexctl.sh aws-push --ip <PUBLIC_IP> --key <PRIVATE_KEY_PATH>
```

## Render Deploy
- Blueprint file: `render.yaml`
- Included services: `babaji-web`, `babaji-api`, `babaji-kb`, and `babaji-db`
- One-click flow:
```bash
render blueprint launch
```
- Set `SEED_ACCOUNT_PASSWORD` before first public launch if you do not want the default seeded credentials.

## Core Local-First Endpoints
- `POST /v1/vaastu/report`
- `POST /v1/video/vaastu`
- `POST /v1/kundli/report`
- `POST /v1/kundli/talk`
- `POST /v1/video/kundli`
- `POST /v1/kundli/rectify`
- `POST /v1/matchmaking/compare`
- `POST /v1/panchang/daily`
- `POST /v1/muhurta/pick`
- `POST /v1/tarot/read`
- `POST /v1/numerology/report`
- `POST /v1/mantra/plan`
- `POST /v1/rashifal/personalized`
- `POST /v1/gem/guidance`
- `POST /v1/consult/realtime/session`
- `POST /v1/consult/summary`
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
- `POST /v1/billing/apple/notifications`
- `POST /v1/billing/google/rtdn`
- `POST /v1/privacy/delete-request`

## Safety Notes
- Astrology/tarot/numerology output: guidance only, no guaranteed outcomes.
- Ayurveda output: education only, no diagnosis/treatment/dosing.
- Ritual/tantra content: safe informational guidance only.
- Gemstone and `vaastu` modules: transparent, non-coercive, no guarantees.

## Web Routes
- `/` Cortex module console
- `/kundli` Kundli report + rectification + video queue forms
- `/vaastu` Vaastu report + video queue form
- `/consult` Realtime consult session creation form
- `/insights` Tarot, numerology, mantra, rashifal, gem guidance forms
- `/matchmaking` dual-profile compatibility forms
- `/panchang` panchang feed + muhurta picker forms
- `/business` subscriptions, entitlements, wallet, bundles, offers, reviews, disputes
- `/admin` KB upload + ingestion metadata form
