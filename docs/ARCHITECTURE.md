# Architecture

## Objective
Local-first digital twin for jyotish/scriptures/ritual safety/tarot/numerology/mantra/ayurveda education with premium vaastu and gemstone workflows.

## Services
- `services/api`: entrypoint, safety gates, entitlement checks, consent-aware consult sessions.
- `services/kb`: admin upload + retrieval (citation source of truth).
- `services/kg`: graph edges for explainability paths.
- `services/agents`: swarm routing for specialized agents.
- `services/media`: asynchronous video job queue and renderer handoff.
- `services/rtc`: local LiveKit configuration.

## AWS free-tier deployment profile
- Uses `infra/docker-compose.aws-lite.yml` on a single EC2 micro instance.
- Fronts traffic with `nginx` and proxies `/api/*` to API service.
- Excludes managed databases and heavy optional runtime components to contain spend.
- Uses Terraform cost controls (budget alerts, billing alarm, emergency stop lambda, scheduled stop/start).

## Local model stack
- LLM: Ollama OpenAI-compatible endpoint.
- ASR: whisper.cpp service profile.
- TTS: piper service profile.

## Data model highlights
- Sensitive PII: birth profile, consult transcript metadata, audio/video links.
- Controls: consent flags per session, retention policy metadata, deletion workflow.

## API persistence layer
- `services/api/app/store.py` persists consult sessions, summaries, generated reports, billing events, privacy deletion requests, subscriptions/add-ons, wallet ledger, bundle/offer events, reviews, and disputes in SQLite for local-first durability.
- Designed to be replaceable with managed relational storage in hosted production.

## Explainability
- Citations mandatory for cortex-grounded claims.
- Fallback mode returns `general-guidance` label.
- UI exposes chart elements used for kundli responses.
