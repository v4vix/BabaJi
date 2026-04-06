# Monetization Tiers

## Plans
- Free: `chat.basic`, `ritual.guide`, `ayurveda.guide`.
- Plus: Free + `kundli.report`, `kundli.talk`, `rashifal.feed`, `panchang.feed`, `muhurta.pick`, `tarot.read`, `numerology.report`, `mantra.plan`.
- Pro: Plus + `kundli.video`, `matchmaking.studio`.
- Elite: Pro + `vaastu.studio`, `gem.consultancy`, `consult.video`.

## Enforcement
- Server-side entitlement checks in API.
- Persisted subscriptions/add-ons override header plan in local-first mode.
- Billing notifications can mutate persisted subscription status.
- Explicit revoke endpoints support entitlement downgrades and lifecycle revocations.

## Add-ons
- `vaastu_studio_addon` -> `vaastu.studio`
- `gem_consultancy_addon` -> `gem.consultancy`
- `consult_video_addon` -> `consult.video`
- `matchmaking_addon` -> `matchmaking.studio`
- `kundli_video_addon` -> `kundli.video`

## Wallet and bundles
- Wallet uses an append-only credit ledger.
- Bundles add credits (for consult minutes and premium usage buffers).
- Offers can grant one-time onboarding credits (e.g., first-session offer).

## Trust workflows
- Reviews support verified purchase metadata and moderation status.
- Disputes support open/list/resolve workflow for support and auditability.
