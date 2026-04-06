from __future__ import annotations

from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "cerebral-cortex-api"
    environment: str = "local"
    kb_service_url: str = "http://localhost:8102"
    kg_service_url: str = "http://localhost:8103"
    media_service_url: str = "http://localhost:8104"
    llm_base_url: str = "http://localhost:11434/v1"
    local_llm_model: str = "llama3.1"
    asr_base_url: str = "http://localhost:9001"
    tts_base_url: str = "http://localhost:9002"
    livekit_url: str = "ws://localhost:7880"
    apple_webhook_secret: Optional[str] = None
    google_webhook_secret: Optional[str] = None
    # Google Pub/Sub push subscription audience URL (your Cloud Run / App Engine URL).
    # When set, RTDN webhooks are verified via OAuth2 JWT instead of HMAC.
    google_pubsub_audience: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    # PostgreSQL connection string. When set, the API uses Postgres instead of SQLite.
    # Format: postgresql://user:password@host:5432/dbname
    database_url: str = ""
    # Set this secret to enable HMAC-signed device Bearer token auth.
    # User JWT auth still works without it for local account flows.
    api_secret: Optional[str] = None
    # Explicit opt-in for unsafe local demo auth. When enabled without API_SECRET,
    # the API accepts X-User-Id / X-Plan headers and unsigned dev device tokens.
    allow_insecure_demo_auth: bool = False
    # Comma-separated list of allowed CORS origins.
    cors_origins: str = (
        "http://localhost:3000,http://localhost:3001,http://localhost:3002,"
        "http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,"
        "http://localhost:19006,http://127.0.0.1:19006"
    )
    # ── Email (verification emails) ───────────────────────────────────────────
    # SendGrid: set SENDGRID_API_KEY for cloud email delivery.
    sendgrid_api_key: Optional[str] = None
    # SMTP fallback: set SMTP_HOST (and optionally the rest) for relay delivery.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    email_from: str = "noreply@babaji.app"
    # Base URL used to build email links (no trailing slash).
    app_base_url: str = "http://localhost:3000"
    # Comma-separated bootstrap lists for operator access. These are useful until
    # dedicated admin role management exists.
    admin_emails: str = ""
    support_emails: str = ""
    # Seeded demo access for showcase environments and operator bootstrapping.
    # These defaults intentionally keep the app easy to review end-to-end.
    seed_demo_accounts: bool = True
    seed_account_password: str = "BabaJiDemo123!"
    expose_seed_account_catalog: bool = True
    # Shared secret for internal admin upload proxy -> KB service.
    admin_api_token: Optional[str] = None


settings = Settings()
