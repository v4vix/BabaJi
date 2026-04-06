# BabaJi — Deployment Guide

One-click deploy to Render.com, or self-host with Docker Compose.

---

## Quick Deploy — Render.com (Recommended)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

The `render.yaml` blueprint creates:
- **babaji-api** — FastAPI backend (Python 3.11)
- **babaji-kb** — Knowledge base retrieval service
- **babaji-web** — Next.js 15 frontend
- **babaji-db** — PostgreSQL 16 database

### Steps

1. Fork this repository on GitHub
2. Click "New Blueprint Instance" in Render dashboard
3. Connect your forked repo
4. Set the required secrets (see below)
5. Click "Apply" — all services deploy automatically

### Required Secrets (set in Render dashboard)

| Variable | Where | Notes |
|---|---|---|
| `SEED_ACCOUNT_PASSWORD` | babaji-api | Password for demo accounts |
| `ANTHROPIC_API_KEY` | babaji-api | Claude AI for narrative quality |
| `STRIPE_SECRET_KEY` | babaji-api | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | babaji-api | Webhook signature verification |
| `STRIPE_PRICE_PLUS` | babaji-api | Stripe price ID for Plus plan |
| `STRIPE_PRICE_PRO` | babaji-api | Stripe price ID for Pro plan |
| `STRIPE_PRICE_ELITE` | babaji-api | Stripe price ID for Elite plan |
| `SMTP_HOST` | babaji-api | Email for verification/notifications |
| `SMTP_USER` | babaji-api | SMTP username |
| `SMTP_PASS` | babaji-api | SMTP password |

---

## Demo Accounts

When `SEED_DEMO_ACCOUNTS=true` (default on Render), these accounts are created automatically:

| Email | Role | Plan | Purpose |
|---|---|---|---|
| `free@babaji.app` | user | Free | Free tier testing |
| `plus@babaji.app` | user | Plus | Plus plan testing |
| `pro@babaji.app` | user | Pro | Pro plan testing |
| `elite@babaji.app` | user | Elite | Elite plan testing |
| `support@babaji.app` | support | Pro | Support staff testing |
| `admin@babaji.app` | **admin** | Elite | **Full admin access** |

**Default password:** `BabaJiDemo123!` (or your `SEED_ACCOUNT_PASSWORD`)

> The admin account has access to `/admin` panel, user management, wallet adjustments, role changes, and audit logs.

---

## Local Development

### Prerequisites
- Node.js 22+ and pnpm 9+
- Python 3.11+
- Docker (optional, for full stack)

### Start with SQLite (simplest)

```bash
# Install frontend deps
corepack enable
pnpm install

# Install API deps
cd services/api && pip install -r requirements.txt && cd ../..

# Start API (port 8101)
cd services/api && uvicorn app.main:app --reload --port 8101 &

# Start web (port 3000)
pnpm --filter web dev
```

Open http://localhost:3000

### Start with Docker Compose (full stack)

```bash
docker compose -f infra/docker-compose.yml up
```

This starts: PostgreSQL, Redis, Neo4j, Ollama, LiveKit, all services.

---

## Production Checklist

- [ ] Set `ALLOW_INSECURE_DEMO_AUTH=false`
- [ ] Set strong `API_SECRET` (generate with `openssl rand -hex 32`)
- [ ] Set `ANTHROPIC_API_KEY` for AI narratives
- [ ] Configure Stripe keys and webhook endpoint
- [ ] Configure SMTP for email verification
- [ ] Set `CORS_ORIGINS` to your production domain
- [ ] Set `APP_BASE_URL` to your production URL
- [ ] Enable Sentry DSN for error monitoring
- [ ] Review `ADMIN_EMAILS` — these get admin role automatically
- [ ] Change `SEED_ACCOUNT_PASSWORD` before first deploy
- [ ] Set `SEED_DEMO_ACCOUNTS=false` if you don't want demo accounts in production

---

## Subscription Tier Summary

| Tier | Price | Key Features |
|---|---|---|
| **Free** | ₹0 / $0 | Guided chat, ritual guide, daily preview |
| **Plus** | ₹749 / $9/mo | Full Kundli, Tarot, Numerology, Panchang, Mantra |
| **Pro** | ₹1,599 / $19/mo | Plus + Matchmaking, Kundli Video, Rectification |
| **Elite** | ₹3,249 / $39/mo | Full suite: Vaastu, Gem, Live Video Consult |

### Add-ons (any base plan)
- Vaastu Studio — $12/mo
- Gem Consultancy — $8/mo
- Matchmaking Studio — $10/mo
- Kundli Video — $8/mo
- Consult Video — $10/mo

---

## Architecture

```
                    ┌─────────────────┐
                    │   Next.js Web   │  :3000
                    └────────┬────────┘
                             │ /v1/* proxy
                    ┌────────▼────────┐
                    │  FastAPI (API)  │  :8101
                    └──┬─────────────┘
              ┌────────┘  └──────────────┐
    ┌─────────▼──────┐        ┌──────────▼──────┐
    │  KB Service    │  :8102 │   PostgreSQL     │
    └────────────────┘        └─────────────────┘
```

---

## Support

- Email: support@babaji.app
- Admin: admin@babaji.app
- GitHub Issues: github.com/babaji-app/babaji/issues
