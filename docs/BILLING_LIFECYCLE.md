# Billing Lifecycle Notes

## Web
- Stripe-managed subscriptions map to entitlement keys in backend.

## iOS stubs
- Endpoint: `POST /v1/billing/apple/notifications`.
- Current behavior: optional HMAC gate (`apple_webhook_secret`) + subscription mutation by product identifier.
- Required prod work: verify signed JWS and reconcile transaction state.
- Normalized status mapping:
  - `active`: renewals and normal lifecycle events
  - `grace`: billing retry/grace events
  - `inactive`: refunds/revokes/expiration
- Handle renewals, grace, refunds, revokes.

## Android stubs
- Endpoint: `POST /v1/billing/google/rtdn`.
- Current behavior: optional HMAC gate (`google_webhook_secret`) + subscription mutation by subscription identifier.
- Required prod work: validate Pub/Sub auth + Play API token checks.
- Normalized status mapping:
  - `active`: purchase/renew/recover/price-consent events
  - `grace`: account-hold and grace-period events
  - `inactive`: canceled/expired/revoked events
- Handle renewals, expirations, grace, account hold, refunds.

## Entitlement mutation
- Centralized service updates plan/add-on grants.
- Billing ingestion updates subscription status (`active`/`grace`/`inactive`) when user and plan are inferred.
- All premium endpoints enforce entitlements server-side.

## Auditability
- Billing audit endpoint: `GET /v1/business/billing/events`.
- Subscription lifecycle event endpoint: `GET /v1/business/subscription/events`.
- Refund workflow endpoints:
  - `POST /v1/business/refunds`
  - `GET /v1/business/refunds`
  - `POST /v1/business/refunds/{refund_id}/resolve`
