# RTC Service (LiveKit)

Local LiveKit config for secure voice/video consult sessions.

## Start
LiveKit is started from `infra/docker-compose.yml` using `services/rtc/livekit.yaml`.

## Production requirements
- Rotate API keys and secrets.
- Enable TLS and domain routing.
- Issue signed access tokens server-side from `services/api`.
- Enforce per-session consent and retention controls.
