# Threat Model

## Assets
- Birth data and location/time metadata.
- User-generated consult audio/video and transcripts.
- Uploaded private books and indexed chunks.
- Entitlement and billing notification payloads.

## Threats and controls
- Unauthorized access to sensitive data:
  - enforce auth + RBAC + row-level policy (production requirement).
  - encrypt at rest and in transit.
- Prompt injection through uploaded corpus:
  - isolate retriever text and strip executable directives.
  - enforce citation and safety post-filter.
- Billing spoofing (Apple/Google notifications):
  - verify provider signatures before entitlement updates.
- Harmful ritual/ayurveda requests:
  - pre-response safety filters and refusal templates.
- Video/media leakage:
  - signed URLs and time-bound playback tokens.

## Residual risk
- Demo mode uses stub verification; production hardening needed before release.
