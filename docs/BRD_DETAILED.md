# Business Requirements Document (BRD)

## 1. Document Control
- Product: Cerebral Cortex Digital Twin Platform
- Scope baseline: Local-first monorepo plus AWS free-tier constrained deployment path
- Version: 1.0
- Date: March 4, 2026

## 2. Executive Summary
Cerebral Cortex is a local-first, safety-gated platform that provides jyotish, scriptures, rituals guidance, tarot, numerology, mantra support, ayurveda education, vaastu consultancy, gemstone guidance, and consult workflows across web/mobile with voice-video patterns.

Primary business outcomes:
- Build trust through citation-grounded outputs and strict safety constraints.
- Convert through tiered subscriptions, add-ons, bundles, and wallet-based credits.
- Retain via recurring insights, report/video generation, and consult follow-ups.
- Control risk through compliant claims boundaries, auditability, and pricing guardrails.

## 3. Business Objectives
1. Deliver a high-quality local-first product for guided spiritual/wellness content with clear disclaimers.
2. Achieve monetization via plans (`free/plus/pro/elite`), add-ons, bundles, offers, and consult credits.
3. Provide operational-grade controls: billing lifecycle handling, disputes, refunds, moderation, and audit trails.
4. Keep cloud cost predictable on AWS free-tier-first infrastructure with hard guardrails.

## 4. In-Scope Capabilities
### 4.1 Core User Modules
- Kundli report, talk-to-kundli, rectification assistant, kundli video queue.
- Matchmaking studio, panchang feed, muhurta picker.
- Vaastu report and video walkthrough queue.
- Tarot, numerology, mantra plans, rashifal, gem guidance.
- Consult session creation and post-consult summary generation.

### 4.2 Knowledge and Grounding
- Admin upload and retrieval-backed grounding via KB/KG services.
- Citation-aware output modes (`cortex-grounded` vs `general-guidance`).

### 4.3 Business and Commerce
- Plans: change/revoke and entitlement resolution.
- Add-ons: activate/revoke.
- Wallet: top-up/debit with ledger.
- Bundles and offers.
- Reviews + moderation workflow.
- Disputes + resolution workflow.
- Refund request + resolution workflow.
- Billing and subscription event audit endpoints.

### 4.4 Platform Operations
- Unified runtime control script: `/Users/vikram/Documents/BabaJi/scripts/cortexctl.sh`
- Warm-up and health orchestration for local services.
- AWS free-tier and pricing guardrail preflight/validation.

## 5. Out of Scope (Current Baseline)
- Native store submission and real production IAP validation pipelines (stubs implemented).
- Full human advisor marketplace onboarding/dispute arbitration portal.
- Production-grade external identity provider integrations beyond local baseline.

## 6. Personas
1. End User (Seeker): consumes reports, guidance, videos, consult sessions.
2. Premium User: uses vaastu/gem consultancy and advanced analytics modules.
3. Admin/Operator: uploads corpus, moderates reviews, resolves disputes/refunds.
4. Finance/Ops: audits billing events, tracks subscriptions and entitlement changes.

## 7. Functional Requirements
### 7.1 Guidance and Reporting
- FR-001: System shall generate kundli reports using deterministic chart facts and disclaimered narrative.
- FR-002: System shall support talk-to-kundli responses with chart elements used.
- FR-003: System shall provide vaastu report outputs with safety-first disclaimers.
- FR-004: System shall queue kundli and vaastu video generation jobs.
- FR-005: System shall provide tarot/numerology/mantra/rashifal/gem outputs.

### 7.2 Consult
- FR-010: System shall create realtime consult sessions with explicit consent flags.
- FR-011: System shall generate post-consult summaries and action plans with disclaimer context.

### 7.3 Entitlements and Tiers
- FR-020: System shall enforce entitlements server-side on premium endpoints.
- FR-021: System shall resolve entitlements from persisted subscription + active add-ons.
- FR-022: System shall treat `active`, `grace`, and `trialing` subscription states as entitlement-active.
- FR-023: System shall support subscription change/revoke operations.

### 7.4 Commerce
- FR-030: System shall support wallet credit top-up and debit with immutable ledger entries.
- FR-031: System shall support bundle purchases and one-time offer claims.
- FR-032: System shall support reviews with moderation statuses and verified purchase hints.
- FR-033: System shall support dispute open/list/resolve flow.
- FR-034: System shall support refund open/list/resolve flow.

### 7.5 Billing Lifecycle
- FR-040: System shall ingest Apple and Google billing notifications via signed webhook stubs.
- FR-041: System shall normalize webhook events into `active|grace|inactive` states.
- FR-042: System shall persist billing audit events with provider/event/plan/status context.
- FR-043: System shall persist subscription transition events with before/after status traceability.

### 7.6 Privacy and Safety
- FR-050: System shall expose privacy deletion request intake.
- FR-051: System shall block disallowed ritual and ayurveda requests per policy.
- FR-052: System shall return mandatory module-specific disclaimers.

## 8. Non-Functional Requirements
1. Reliability: health checks and scripted lifecycle operations for local stack.
2. Security: signature gates on billing stubs, least data retention defaults, explicit consent collection.
3. Performance: local-first runtime with optional ASR/TTS profile fallback behavior.
4. Observability: persisted billing/subscription events and operational logs.
5. Testability: automated integration tests plus Selenium UI functional tests.

## 9. Compliance and Responsible AI Requirements
1. Astrology/tarot/numerology content must remain guidance/reflective, not guaranteed outcomes.
2. Ayurveda content must remain educational; no diagnosis/treatment/dosing.
3. Ritual guidance must block unsafe/illegal/coercive/violent/sexualized instructions.
4. Vaastu and gemstone modules must include no-guarantee, non-coercive, due-diligence disclaimers.
5. Sensitive user data handling must include minimization and deletion workflow controls.

## 10. Product Packaging and Monetization
### 10.1 Plan Tiers
- Free: baseline educational/safe guidance.
- Plus: kundli/talk + panchang/muhurta + tarot/numerology/mantra.
- Pro: plus + kundli video + matchmaking.
- Elite: pro + vaastu studio + gem consultancy + consult video.

### 10.2 Add-ons and Bundles
- Add-ons: vaastu, gem, consult-video, matchmaking, kundli-video unlocks.
- Bundles: credit packs for consult/report utility consumption.
- Offers: one-time onboarding credits.

### 10.3 Service Quality and Trust
- Review moderation and verified-purchase-compatible fields.
- Dispute and refund workflows with status transitions and notes.

## 11. Key User Journeys
1. Subscription Journey:
   - User selects plan -> entitlement applied -> premium features unlocked.
2. Vaastu Premium Journey:
   - User submits layout -> receives report -> optionally queues video walkthrough.
3. Billing Recovery Journey:
   - Billing event enters grace -> entitlements retained -> recover or revoke path audited.
4. Trust & Resolution Journey:
   - User opens dispute/refund -> support resolves -> audit trail retained.

## 12. Data and Audit Requirements
1. Store subscription, add-on, wallet ledger, bundle/offer actions, reviews, disputes, refunds.
2. Store billing events with normalized status and user linkage where inferable.
3. Store subscription transitions for forensic traceability.
4. Maintain UTC timestamps for all lifecycle entries.

## 13. Quality Gates and Acceptance Criteria
### 13.1 Functional Acceptance
- AC-001: All business endpoints return valid responses and enforce user scoping.
- AC-002: Billing ingestion updates subscription lifecycle correctly and writes audit events.
- AC-003: Refund, dispute, and moderation flows are operational via API and web forms.
- AC-004: Premium endpoints reject users without required entitlements.

### 13.2 Test Acceptance
- AC-010: Integration tests pass for API/business/billing workflows.
- AC-011: Selenium tests pass for end-to-end UI functional flows (including refunds/audit views).
- AC-012: AWS guardrail tests and static pricing checks pass with no hard fails.

## 14. AWS Free-Tier and Pricing Guardrails
1. Use `t3.micro` baseline, conservative storage defaults, and low-noise logs.
2. Enforce budget alarms and emergency-stop strategy in infra layer.
3. Validate pre-deploy with:
   - `bash /Users/vikram/Documents/BabaJi/scripts/cortexctl.sh aws-preflight`
   - `bash /Users/vikram/Documents/BabaJi/scripts/cortexctl.sh aws-guardrails --tfvars /Users/vikram/Documents/BabaJi/infra/aws/terraform.tfvars`
4. Block deployment if guardrail checks report hard fails.

## 15. Deployment and Operations Requirements
1. Single operator command surface via `cortexctl.sh`.
2. Warm-up phase available and recommended before full throughput.
3. Start modes must support backend-only, app-only, and all-in-one.
4. Service health, logs, and stop/restart must be script-driven.

## 16. Risks and Mitigations
1. Risk: Vendor webhook spoofing in production.
   - Mitigation: replace HMAC stubs with Apple JWS and Pub/Sub auth validation.
2. Risk: Cost spikes from unconstrained cloud use.
   - Mitigation: mandatory guardrail checks and budget alarms before go-live.
3. Risk: Safety regression in generated guidance.
   - Mitigation: policy gates + regression tests + documented restrictions.
4. Risk: Weak UX completion without journey coverage.
   - Mitigation: Selenium flow automation for high-value business journeys.

## 17. Traceability to Implemented Artifacts
- API: `/Users/vikram/Documents/BabaJi/services/api/app/main.py`
- Schemas: `/Users/vikram/Documents/BabaJi/services/api/app/schemas.py`
- Persistence: `/Users/vikram/Documents/BabaJi/services/api/app/store.py`
- Business UI: `/Users/vikram/Documents/BabaJi/apps/web/app/business/page.tsx`
- UI Tests: `/Users/vikram/Documents/BabaJi/tests/ui/test_web_flows_selenium.py`
- Integration Tests: `/Users/vikram/Documents/BabaJi/tests/integration/test_api_endpoints.py`
- Guardrails: `/Users/vikram/Documents/BabaJi/scripts/aws/guardrails_check.sh`

## 18. Success Metrics (Initial)
1. Conversion: plan upgrade rate and add-on attach rate.
2. Retention: weekly active premium users and repeat report/video usage.
3. Trust: dispute/refund resolution SLA and moderation turnaround.
4. Reliability: health-check success rate and failed deploy prevention via guardrails.
