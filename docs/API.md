# API Surface (Minimum)

## Reports and analysis
- `POST /v1/kundli/report`
- `POST /v1/kundli/talk`
- `POST /v1/kundli/rectify`
- `POST /v1/vaastu/report`
- `POST /v1/matchmaking/compare`
- `POST /v1/panchang/daily`
- `POST /v1/muhurta/pick`
- `POST /v1/ritual/guide`
- `POST /v1/ayurveda/guide`
- `POST /v1/tarot/read`
- `POST /v1/numerology/report`
- `POST /v1/mantra/plan`
- `POST /v1/rashifal/personalized`
- `POST /v1/gem/guidance`

## Video
- `POST /v1/video/kundli`
- `POST /v1/video/vaastu`

## Consult
- `POST /v1/consult/realtime/session`
- `POST /v1/consult/summary`

## Business and monetization
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

## Billing ingestion
- `POST /v1/billing/apple/notifications`
- `POST /v1/billing/google/rtdn`

## Privacy
- `POST /v1/privacy/delete-request`

## KB/KG
- `POST /v1/admin/upload` (KB)
- `POST /v1/retrieve` (KB)
- `POST /v1/build` and `GET /v1/query/{subject}` (KG)
