# Business Requirements Document (BRD)
## Cerebral Cortex — Astrology & Spiritual Guidance Platform ("BabaJi")

**Version:** 1.4
**Date:** 2026-03-15
**Prepared from:** Full codebase review across API services, web app, mobile app, packages, tests, and documentation.

---

## 1. Executive Summary

Cerebral Cortex (brand name "BabaJi") is a citations-first, safety-aware multi-modal platform delivering Vedic astrology, Vaastu, spiritual guidance, and live consultation services. The platform targets Indian diaspora and spirituality enthusiasts globally, combining deterministic astrological computation with responsible AI narrative generation. It operates across a Next.js web console, a React Native mobile app, and a FastAPI backend with microservice extensions for knowledge retrieval, knowledge graph, media rendering, and real-time communication.

---

## 2. Business Objectives

| # | Objective |
|---|-----------|
| B1 | Provide accurate, citation-backed Jyotish (Vedic astrology) analysis across Kundli, Panchang, Muhurta, and Rashifal modules |
| B2 | Enable safe, non-coercive spiritual guidance (Tarot, Numerology, Mantra, Ritual, Ayurveda, Gem) with mandatory disclaimers |
| B3 | Operate a tiered subscription model (Free / Plus / Pro / Elite) with add-on and credit wallet capabilities |
| B4 | Support multi-channel live consultation (chat / voice / video) with consent management and post-session summaries |
| B5 | Maintain responsible AI standards: no medical/legal/structural determinism, mandatory safety blocklists, citation gating |
| B6 | Enable full business operations: reviews, disputes, refunds, billing webhooks, privacy deletion |
| B7 | Deliver services on web (Next.js) and native mobile (Expo/React Native) with feature parity |

---

## 3. Scope

### In Scope
- Jyotish computation engine (Swiss Ephemeris with Lahiri fallback)
- All spiritual guidance modules (13 distinct content modules)
- Subscription, add-on, wallet, bundle, and offer management
- Live consult session orchestration via LiveKit RTC
- Knowledge Base (KB) citation retrieval and Knowledge Graph (KG) integration
- AI-narrated video job queue (kundli, vaastu topics)
- Admin corpus upload and OCR ingestion pipeline
- Review moderation, dispute workflow, refund management
- Apple App Store and Google Play billing webhook ingestion
- GDPR-style privacy deletion request handling
- Web console (8 routes) and mobile app (7 tabs)

### Out of Scope (noted for future)
- Payment processing integration (Stripe checkout, Apple Pay, Google Pay)
- Full Apple JWS transaction validation (currently HMAC-gated placeholder)
- Dedicated admin RBAC (currently proxied via elite plan tier)
- Asynchronous privacy deletion pipeline execution
- Full LLM narrative integration (currently deterministic placeholders)
- Production ASR/TTS pipeline wiring

---

## 4. Stakeholders

| Role | Interest |
|------|----------|
| End Users | Accurate, safe, personalized spiritual guidance |
| Premium Subscribers | Access to advanced modules (video, matchmaking, vaastu, gem) |
| Support Agents | Dispute and refund resolution tooling |
| Moderators | Review moderation queue |
| Admins | Corpus upload, subscription management, billing event audit |
| Legal/Compliance | Disclaimer enforcement, privacy deletion, responsible AI |
| Platform/DevOps | Service health, webhook ingestion, data retention |

---

## 5. Functional Requirements

### 5.1 Jyotish Engine

| Req ID | Requirement | Status |
|--------|-------------|--------|
| JY-01 | Compute planetary longitudes using Swiss Ephemeris (pyswisseph) with Lahiri ayanamsha | Implemented (fallback mode active when swe unavailable) |
| JY-02 | Calculate all 9 Grahas + Lagna (ascendant) for a given birth input | Implemented |
| JY-03 | Compute varga charts: D1, D7, D9, D10, D12, D16, D60 | Implemented |
| JY-04 | Compute Vimshottari Dasha timeline (current + 5 subsequent periods) | Implemented |
| JY-05 | Compute Panchang (Tithi, Nakshatra, Yoga, Karana, Vara) | Implemented |
| JY-06 | Support birth time input with timezone and coordinate precision | Implemented |
| JY-07 | Birth time rectification via life-event correlation | Implemented (event-count + window-width confidence scoring with qualitative rationale) |
| JY-08 | Muhurta window selection (3 windows with why/why-not explainability) | Implemented (real panchang-scored windows using Shubha Tithis and Nakshatra quality) |
| JY-09 | Matchmaking compatibility scoring (8-Koota Guna Milan system) | Implemented (Varna/Vashya/Tara/Yoni/Graha Maitri/Gana/Bhakut/Nadi — max 36 pts) |

### 5.2 Content Modules

| Module | Endpoint | Entitlement | Status |
|--------|----------|-------------|--------|
| Kundli Report | `POST /v1/kundli/report` | `kundli.report` | Implemented |
| Talk to Kundli | `POST /v1/kundli/talk` | `kundli.talk` | Implemented |
| Birth Rectification | `POST /v1/kundli/rectify` | `kundli.report` | Implemented |
| Kundli Video | `POST /v1/video/kundli` | `kundli.video` | Implemented |
| Vaastu Report | `POST /v1/vaastu/report` | `vaastu.studio` | Implemented |
| Vaastu Video | `POST /v1/video/vaastu` | `vaastu.studio` | Implemented |
| Panchang Daily | `POST /v1/panchang/daily` | `panchang.feed` | Implemented |
| Muhurta Pick | `POST /v1/muhurta/pick` | `muhurta.pick` | Implemented |
| Matchmaking | `POST /v1/matchmaking/compare` | `matchmaking.studio` | Implemented |
| Tarot | `POST /v1/tarot/read` | `tarot.read` | Implemented |
| Numerology | `POST /v1/numerology/report` | `numerology.report` | Implemented |
| Mantra Plan | `POST /v1/mantra/plan` | `mantra.plan` | Implemented |
| Rashifal | `POST /v1/rashifal/personalized` | `rashifal.feed` | Implemented |
| Gem Guidance | `POST /v1/gem/guidance` | `gem.consultancy` | Implemented |
| Ritual Guide | `POST /v1/ritual/guide` | `ritual.guide` | Implemented |
| Ayurveda Guide | `POST /v1/ayurveda/guide` | `ayurveda.guide` | Implemented |

### 5.3 Live Consultation

| Req ID | Requirement | Status |
|--------|-------------|--------|
| CS-01 | Create consent-bound sessions with recording, transcription, memory toggles | Implemented |
| CS-02 | Support chat, voice, video session modes | Implemented |
| CS-03 | Enforce recording + transcription consent as prerequisite for deliverables | Implemented (HTTP 400 if not granted) |
| CS-04 | Debit 120 wallet credits for video consult when `consult.video` entitlement absent | Implemented |
| CS-05 | Persist session with retention policy (30d default) | Implemented |
| CS-06 | Generate post-consult summary with action plan | Implemented |
| CS-07 | Validate session exists before generating summary | Implemented |
| CS-08 | Return LiveKit RTC URL and token hint | Implemented (token signing deferred to production) |

### 5.4 Subscription & Entitlement System

| Req ID | Requirement | Status |
|--------|-------------|--------|
| SB-01 | Four-tier subscription model: Free / Plus ($9) / Pro ($19) / Elite ($39) | Implemented |
| SB-02 | Entitlement set derived from plan + active add-ons | Implemented |
| SB-03 | Plan change and revoke endpoints with subscription event logging | Implemented |
| SB-04 | Five add-ons: Vaastu Studio, Gem Consultancy, Matchmaking, Kundli Video, Consult Video | Implemented |
| SB-05 | Add-on purchase and revoke with per-user tracking | Implemented |
| SB-06 | Active subscription from DB overrides X-Plan header | Implemented |
| SB-07 | Grace and trialing statuses treated as active | Implemented |
| SB-08 | All add-ons exposed in catalog API response | Fixed (matchmaking_addon, kundli_video_addon added) |

### 5.5 Wallet & Credits

| Req ID | Requirement | Status |
|--------|-------------|--------|
| WL-01 | Credit wallet with full ledger history per user | Implemented |
| WL-02 | Top-up credits via web/stripe/apple/google sources | Implemented |
| WL-03 | Debit credits with insufficient-balance guard | Implemented |
| WL-04 | Bundle purchase: 3 bundles (60/180 consult minutes, reports combo) | Implemented |
| WL-05 | One-time offer claim with idempotency guard (409 on re-claim) | Implemented |
| WL-06 | Auto-debit 120 credits for video consult without entitlement | Implemented |

### 5.6 Reviews, Disputes & Refunds

| Req ID | Requirement | Status |
|--------|-------------|--------|
| RV-01 | Users submit module-specific reviews with rating, title, body | Implemented |
| RV-02 | Verified purchase flag auto-sets moderation status | Implemented (verified → approved, unverified → flagged) |
| RV-03 | Moderation endpoint with approved/rejected/flagged actions | Implemented |
| RV-04 | Review moderation accessible by authenticated callers; moderator identity via `moderator_id` field | Implemented (entitlement_context for audit; RBAC deferred) |
| DS-01 | Users open disputes by category (billing/service/content/refund/consult) | Implemented |
| DS-02 | Agent dispute resolution with status and resolution note | Implemented |
| DS-03 | Dispute resolution accessible by authenticated callers; agent identity via `agent_id` field | Implemented (entitlement_context for audit; RBAC deferred) |
| RF-01 | Users submit refund requests with reference ID, reason, optional amount | Implemented |
| RF-02 | Agent refund resolution (approved/processed/rejected) | Implemented |
| RF-03 | Refund resolution accessible by authenticated callers; agent identity via `agent_id` field | Implemented (entitlement_context for audit; RBAC deferred) |

### 5.7 Billing Webhooks

| Req ID | Requirement | Status |
|--------|-------------|--------|
| BW-01 | Apple App Store S2S notifications with HMAC signature gate | Implemented |
| BW-02 | Google Play RTDN notifications with HMAC signature gate | Implemented |
| BW-03 | Webhook events map to subscription status (active/grace/inactive) | Implemented |
| BW-04 | Billing events persisted for audit | Implemented |
| BW-05 | Subscription events logged (old_plan → new_plan, old_status → new_status) | Implemented |
| BW-06 | Full Apple JWS validation | Deferred (production TODO noted in response) |
| BW-07 | Google Pub/Sub authentication | Deferred (production TODO noted in response) |

### 5.8 Privacy & Data Rights

| Req ID | Requirement | Status |
|--------|-------------|--------|
| PV-01 | Privacy deletion request endpoint (profile/consults/media/all scope) | Implemented |
| PV-02 | Request queued with status tracking | Implemented |
| PV-03 | Async redaction pipeline execution | Deferred (noted in response) |
| PV-04 | 30-day default consult retention policy with early deletion option | Implemented (policy text) |

### 5.9 Safety & Responsible AI

| Req ID | Requirement | Status |
|--------|-------------|--------|
| SA-01 | Ayurveda blocklist: blocks dosage, prescription, cure, treatment, medication terms | Implemented |
| SA-02 | Ritual blocklist: blocks harm, blood, coerce, illegal, violent, sexual ritual terms | Implemented |
| SA-03 | Mandatory disclaimer injection for all 12 content module categories | Implemented |
| SA-04 | Citation gating: `cortex-grounded` vs `general-guidance` mode based on KB retrieval | Implemented |
| SA-05 | Escalation to licensed professionals for structural/medical/legal high-stakes queries | Implemented (vaastu, gem, consult disclaimers) |
| SA-06 | No coercive upsell language in gemstone or ritual guidance | Implemented |

### 5.10 Admin & KB Ingestion

| Req ID | Requirement | Status |
|--------|-------------|--------|
| AD-01 | Admin corpus upload interface with collection, language, OCR engine, tier gate metadata | Implemented |
| AD-02 | Multi-file upload to KB service ingestion endpoint | Implemented |
| AD-03 | OCR engine selection: Tesseract / PaddleOCR | Implemented (UI) |
| AD-04 | Supported formats: PDF, EPUB, DJVU, TXT, HTML, DOCX, PNG, JPG | Implemented (UI accept) |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Availability** | API health endpoint `/healthz` for monitoring |
| **Latency** | KB and media service calls timeout at 3 seconds; fallback applied |
| **Security** | CORS restricted to localhost:3000 and localhost:19006 (production update required) |
| **Security** | All user-scoped write operations enforce X-User-Id match |
| **Security** | Billing webhooks require HMAC signature verification |
| **Data Integrity** | SQLite WAL-mode with thread lock for concurrent access |
| **Idempotency** | One-time offer claims enforced via unique index on (user_id, offer_id) |
| **Observability** | Subscription and billing events logged with full payload for audit |
| **Privacy** | All personally sensitive fields are user-scoped; cross-user lookup blocked |
| **Scalability** | DB migration handled via `_ensure_column` helper; zero-downtime schema evolution |
| **Responsiveness** | Web UI uses two-column grid with Surface cards; mobile uses tab navigation |

---

## 7. System Architecture

```
Web App (Next.js)  ──┐
                     ├──► FastAPI API Gateway (port 8101)
Mobile App (Expo) ───┘         │
                               ├──► KB Service       (port 8102) → Postgres + pgvector
                               ├──► KG Service       (port 8103) → Neo4j
                               ├──► Agents Service   (port 8104)
                               ├──► Media Service    (port 8105) → ffmpeg renderer
                               ├──► LiveKit RTC      (port 7880)
                               ├──► Ollama/llama.cpp (port 11434)
                               ├──► Whisper ASR      (port 9001)
                               └──► Piper TTS        (port 9002)
```

**Data persistence:** SQLite (`cortex_api.sqlite3`) for API gateway state (sessions, subscriptions, wallet, reviews, disputes, refunds, billing events).

---

## 8. Subscription Tiers & Entitlements Matrix

| Entitlement | Free | Plus | Pro | Elite | Add-on Available |
|-------------|------|------|-----|-------|-----------------|
| `chat.basic` | ✓ | ✓ | ✓ | ✓ | — |
| `ritual.guide` | ✓ | ✓ | ✓ | ✓ | — |
| `ayurveda.guide` | ✓ | ✓ | ✓ | ✓ | — |
| `kundli.report` | — | ✓ | ✓ | ✓ | — |
| `kundli.talk` | — | ✓ | ✓ | ✓ | — |
| `rashifal.feed` | — | ✓ | ✓ | ✓ | — |
| `panchang.feed` | — | ✓ | ✓ | ✓ | — |
| `muhurta.pick` | — | ✓ | ✓ | ✓ | — |
| `tarot.read` | — | ✓ | ✓ | ✓ | — |
| `numerology.report` | — | ✓ | ✓ | ✓ | — |
| `mantra.plan` | — | ✓ | ✓ | ✓ | — |
| `kundli.video` | — | — | ✓ | ✓ | `kundli_video_addon` ($8) |
| `matchmaking.studio` | — | — | ✓ | ✓ | `matchmaking_addon` ($10) |
| `vaastu.studio` | — | — | — | ✓ | `vaastu_studio_addon` ($12) |
| `gem.consultancy` | — | — | — | ✓ | `gem_consultancy_addon` ($8) |
| `consult.video` | — | — | — | ✓ | `consult_video_addon` ($10) |

---

## 9. Credit Bundles & Offers

| Product | Price | Credits | Perks |
|---------|-------|---------|-------|
| Consult Bundle 60 | $29 | 600 | 60 consult-minute equivalent, priority scheduling |
| Consult Bundle 180 | $79 | 1800 | 180 consult-minute equivalent, priority scheduling + recap export |
| Reports Combo | $39 | 350 | 1 Kundli video slot, 1 Vaastu walkthrough, regeneration credits |
| First Session Offer | Free | 120 | One-time onboarding credits (idempotent claim) |

---

## 10. UI Coverage (Web)

| Route | Page | Key Actions | data-testid Coverage |
|-------|------|-------------|---------------------|
| `/` | Home | Navigation links to all 8 modules | N/A |
| `/kundli` | Kundli Studio | Report, Rectification, Video Queue, Talk to Kundli | `kundli-submit`, `kundli-video-submit`, `kundli-report-result`, `kundli-rectify-result`, `kundli-video-result` |
| `/vaastu` | Vaastu Studio | Report, Video Queue, File Upload | `vaastu-submit`, `vaastu-video-submit`, `vaastu-report-result`, `vaastu-video-result` |
| `/consult` | Live Consult | Session creation, Post-consult summary | `consult-submit`, `consult-result` |
| `/matchmaking` | Matchmaking | Dual-profile compatibility scoring | `matchmaking-submit`, `matchmaking-result` |
| `/panchang` | Panchang + Muhurta | Daily panchang, Muhurta windows | `panchang-submit`, `muhurta-submit`, `panchang-result`, `muhurta-result` |
| `/insights` | Insights Hub | Tarot, Numerology, Mantra, Rashifal, Gem, Ritual, Ayurveda, Privacy delete | `tarot-submit`, `numerology-submit`, `mantra-submit`, `rashifal-submit`, `gem-submit`, `ritual-submit`, `ayurveda-submit`, `privacy-delete-submit` + result testids |
| `/business` | Business Console | Catalog, Subscription, Add-ons, Wallet, Bundles, Offers, Reviews, Disputes, Refunds, Billing audit | Full testid coverage across all 8 sections |
| `/admin` | Admin Upload | Corpus upload with collection/OCR/tier-gate metadata | N/A |

### UI Coverage (Mobile — Expo)

| Tab | Endpoints Tested |
|-----|-----------------|
| Home | `/healthz` |
| Kundli | `/v1/kundli/report` |
| Vaastu | `/v1/vaastu/report` |
| Consult | `/v1/consult/realtime/session` |
| Insights | `/v1/tarot/read`, `/v1/numerology/report`, `/v1/mantra/plan`, `/v1/rashifal/personalized`, `/v1/gem/guidance` |
| Matchmaking | `/v1/matchmaking/compare` |
| Panchang | `/v1/muhurta/pick` |

---

## 11. Test Coverage

| Test File | Coverage |
|-----------|----------|
| `tests/unit/test_safety.py` | Ayurveda blocklist, ritual blocklist, citation mode function |
| `tests/evals/test_citation_gate.py` | Kundli report response structure and citation-mode field validation |

| `tests/integration/test_api_endpoints.py` | Full lifecycle: Vaastu, insights, matchmaking, panchang, muhurta, kundli-talk, consult summary, privacy delete; full business workflow (subscription/addon/wallet/bundle/offer/review/dispute/refund); CORS preflight; Apple/Google billing HMAC gate + subscription mutation; revoked-subscription entitlement enforcement; cross-user access 403 guards; free-plan feature gating |
| `tests/ui/test_web_flows_selenium.py` | Selenium browser automation (gated by `RUN_UI_TESTS=1`): home navigation, kundli/vaastu form submit, consult session, business wallet top-up, full business console end-to-end flow, matchmaking, panchang + muhurta |
| `tests/ui/conftest.py` | Selenium WebDriver fixtures: Chrome driver, explicit wait, base_url |

### Known Test Gaps (Recommended additions)

| Gap | Priority |
|-----|----------|
| Business rules: entitlements_for(), plan tier matrix | High |
| Jyotish: panchang_for_date(), pick_muhurta_windows(), score_matchmaking() | High |
| AWS guardrails: `scripts/aws/guardrails_check.sh` and `infra/aws/terraform.tfvars.example` referenced by `tests/integration/test_aws_guardrails.py` — files not present in repo | High |

---

## 12. Issues Found & Fixed (This Review)

| # | Issue | Severity | Fix Applied |
|---|-------|----------|-------------|
| 1 | `matchmaking_addon` and `kundli_video_addon` missing from `/v1/business/catalog` response | Medium | Added both to `PRICING_CATALOG["addons"]` in `business_rules.py` |
| 2 | `/v1/business/reviews/{id}/moderate` had no authentication check — any caller could moderate any review | High | Added `Depends(entitlement_context)` for audit context; admin authority via `moderator_id` field (plan-based RBAC deferred) |
| 3 | `/v1/business/disputes/{id}/resolve` had no authentication check — any caller could resolve any dispute | High | Added `Depends(entitlement_context)` for audit context; agent authority via `agent_id` field (plan-based RBAC deferred) |
| 4 | `/v1/business/refunds/{id}/resolve` had no authentication check — any caller could resolve any refund | High | Added `Depends(entitlement_context)` for audit context; agent authority via `agent_id` field (plan-based RBAC deferred) |
| 5 | Insights page buttons had no `data-testid` attributes, blocking UI test automation for 8 modules | Medium | Added `data-testid` to all action buttons and result elements |
| 6 | `entitlement_context` fell back to `X-Plan` header for revoked/inactive subscriptions — header spoofing vector | High | Fall back to `"free"` when subscription record exists but is inactive; header only used when no DB record exists |
| 7 | `verify_hmac_signature` silently returned `True` when webhook secret unconfigured — no visibility of bypass | Medium | Added warning log so ops team can detect misconfiguration; secret enforcement on deploy required |
| 8 | `NumerologyRequest.birth_date` accepted arbitrary strings — nonsense input produced silent bad output | Low | Added `pattern=r"^\d{4}-\d{2}-\d{2}$"` constraint; also constrained `full_name` length |
| 9 | `BirthRectificationRequest` accepted `time_window_start >= time_window_end` — invalid windows silently processed | Low | Added `model_validator` enforcing start < end; added HH:MM pattern constraints on both fields |
| 10 | All web form pages had no loading state — repeated button clicks fired duplicate requests | Medium | Added `loading` state + `disabled={loading}` + "Loading…" label to all action buttons across Kundli, Vaastu, Consult, Matchmaking, Panchang, Insights pages |
| 11 | Vaastu file input accepted any file type and size without validation | Low | Added client-side validation: PDF/PNG/JPG/TXT only, max 20 MB per file; invalid selection clears input and shows error |
| 12 | Integration tests only exercised elite-plan happy paths — revocation enforcement, cross-user guards, and free-plan gating were untested | High | Added `test_revoked_subscription_loses_entitlements`, `test_cross_user_access_denied`, `test_free_plan_feature_gating` to `test_api_endpoints.py` |
| 13 | Kundli rectification and talk buttons had no `data-testid` attributes; `talkResult` had no testid | Low | Added `data-testid="kundli-rectify-submit"`, `data-testid="kundli-talk-submit"`, `data-testid="kundli-talk-result"` |
| 14 | Gem guidance returned a single-line planet→gem lookup with no practical guidance | High | Replaced with full `_GEM_DATA` table for all 9 planets (sun/moon/mars/mercury/jupiter/venus/saturn/rahu/ketu): gem name + sub-gem, metal, finger, min carat, activation day/hora, areas strengthened, quality notes, 3 contraindication cautions, budget-adaptive recommendation, 7-step due-diligence checklist |
| 15 | Ritual guide returned a single fixed generic line regardless of query | High | Replaced with `_RITUAL_GUIDANCE` library (7 categories: morning sadhana, evening sandhya, prosperity/Lakshmi puja, healing/Dhanvantari, protection/Sudarshana kavach, marriage/Uma-Maheshwara puja, general); keyword-matched 7-step ritual with materials and duration |
| 16 | Ayurveda guide returned a single fixed generic line regardless of query | High | Replaced with `_AYURVEDA_GUIDANCE` library (7 categories: vata, pitta, kapha, digestion/agni, sleep/nidra, stress, general); keyword-matched guidance with full description, 5 dietary points, 5 lifestyle practices, herb list, and complementary mantra |
| 17 | Rectification confidence was based on string-length modulo of event text — essentially random | Medium | Replaced with structured scoring: `event_score = min(event_count × 8, 40)` + `window_score` based on window duration; qualitative rationale adapts to event count (preliminary/moderate/strong); confidence ceiling 90% by design |
| 18 | Panchang returned bare numbers ("Tithi 15") instead of named Vedic values | High | Replaced with full named lookups: 30 Tithi names, 27 Nakshatra names, 27 Yoga names, 11 Karana names, 7 Vara names with descriptions |
| 19 | Muhurta used hash-seeded fake planetary positions instead of real astronomy | High | Replaced with Meeus-formula solar/lunar longitude approximation (`_approx_solar_longitude`, `_approx_lunar_longitude`) using J2000 epoch; Muhurta scores use Shubha Tithi set and Nakshatra quality classification |
| 20 | Matchmaking used Moon + Venus house delta — not a recognised Jyotish system | High | Replaced with complete 8-Koota Guna Milan: Varna (1), Vashya (2), Tara (3), Yoni (4), Graha Maitri (5), Gana (6), Bhakut (7), Nadi (8) — max 36 points; Nadi dosha detection; verdict bands (Excellent/Good/Acceptable/Marginal/Incompatible) |
| 21 | Tarot returned a single generic line per card position | High | Replaced with `_TAROT_MAJOR_ARCANA` dictionary (all 22 Major Arcana with 2–3 sentence authentic meanings); 3-card reading with woven thematic reflection |
| 22 | Numerology returned fixed stub output | High | Replaced with `_LIFE_PATH_MEANINGS` (numbers 1–9, paragraph each) + `_EXPRESSION_QUALITIES` (1–9) + proper Pythagorean letter-to-number table |
| 23 | Mantra returned generic mindfulness advice | High | Replaced with `_MANTRA_LIBRARY` (18 focus areas); fuzzy key matching; returns mantra, deity, tradition, benefit, and 7-step practice |
| 24 | Rashifal returned identical content for all 12 signs | High | Replaced with `_RASHIFAL_SIGN_DATA` (all 12 signs × 3 horizons: daily/weekly/monthly); each entry is sign-specific multi-sentence insight with lord, element, quality, and influences list |
| 25 | Kundli narrative was a fixed template ("Your chart shows...") | High | Replaced with chart-derived multi-paragraph narrative using actual lagna_sign, moon_sign, sun_sign, dasha_lord, dasha_end, nakshatra, tithi with full `LAGNA_DESCRIPTIONS`, `MOON_SIGN_DESCRIPTIONS`, `DASHA_LORD_MEANINGS` |

---

## 13. Known Deferred Items (Production Hardening)

| Item | Notes |
|------|-------|
| Replace HMAC webhook gate with full Apple JWS validation | Noted inline in webhook response |
| Replace HMAC webhook gate with Google Pub/Sub authentication | Noted inline in webhook response |
| Implement admin RBAC layer for moderator/agent/admin role enforcement on resolution endpoints | Required before production launch |
| Implement async privacy deletion pipeline | Currently queued only; no deletion executed |
| Wire real LLM for narrative generation (Ollama/llama.cpp) | Currently deterministic placeholders |
| LiveKit token signing server-side | Token hint returned; signing deferred |
| Move CORS allowed origins to environment config | Currently hardcoded to localhost |
| Swap SQLite for Postgres for production multi-instance deployment | Noted in architecture as target |
| Add Stripe payment processing for web checkout | Revenue collection not yet wired |
| Replace `X-User-Id` / `X-Plan` header auth with signed JWT or API key | Current headers are spoofable; any user can impersonate any other |
| Add rate limiting to all endpoints | No throttling; DoS and cost-blowup risk on KB/video services |
| Restrict CORS `allow_methods` and `allow_headers` from `["*"]` to explicit lists | Should enumerate GET/POST and allowed headers in production config |
| Wire Vaastu multipart file upload to backend media service | Files are validated client-side (type + 20 MB limit); filenames sent in payload; actual upload to media service deferred |
| Wire real LLM (Ollama/llama.cpp) for narrative personalisation | All content modules now use rich deterministic templates with chart-derived data; LLM integration will further personalise beyond what template variables allow |
| Video assessment pipeline (kundli/vaastu) | `/v1/video/kundli` and `/v1/video/vaastu` store jobs in memory dict; no actual ffmpeg/TTS rendering wired |
| Output quality validation layer | No coherence or completeness check on generated responses before returning to user; consider a lightweight validator that checks minimum response length and presence of required sections |
| UI animations and skeleton loading states | Loading state is boolean; production quality would add animated loading skeletons per Surface card and micro-interaction feedback on button clicks |

---

## 14. Glossary

| Term | Definition |
|------|------------|
| Kundli | Vedic birth chart (Janam Kundali) |
| Ayanamsha | Precession correction; Lahiri is the default Indian standard |
| Vimshottari Dasha | Planetary period system spanning 120 years |
| Panchang | Hindu almanac: Tithi, Nakshatra, Yoga, Karana, Vara |
| Muhurta | Auspicious timing window for important activities |
| Vaastu | Traditional Indian spatial science (analogous to Feng Shui) |
| Rashifal | Horoscope / zodiac sign forecast (daily / weekly / monthly) |
| Nakshatra | Lunar mansion — 27 divisions of the ecliptic |
| Guna Milan | Classical matchmaking compatibility scoring system |
| Cortex-grounded | Response mode with KB citations retrieved |
| General-guidance | Response mode when KB retrieval returns zero results |
| RTDN | Real-Time Developer Notifications (Google Play billing) |
| S2S | Server-to-Server notifications (Apple App Store) |

---

*End of BRD*
