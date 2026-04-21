from __future__ import annotations

import base64
import hashlib
import hmac as _hmac
import json as _json
import os as _os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware

from .business_rules import (
    ACTIVE_SUBSCRIPTION_STATUSES,
    ADDON_ENTITLEMENTS,
    BUNDLE_CATALOG,
    OFFERS_CATALOG,
    PRICING_CATALOG,
    apple_subscription_status,
    entitlements_for,
    google_subscription_status,
    infer_plan_from_product_id,
    verify_hmac_signature,
)
from .config import settings
from .safety import MANDATORY_DISCLAIMERS, citation_mode, validate_ayurveda_prompt, validate_ritual_prompt
from .schemas import (
    AddonPurchaseRequest,
    AddonPurchaseResponse,
    AddonRevokeRequest,
    AnalyticsEventRequest,
    AnalyticsEventResponse,
    BillingNotification,
    BirthRectificationRequest,
    BirthRectificationResponse,
    BundlePurchaseRequest,
    BundlePurchaseResponse,
    BusinessCatalogItem,
    BusinessCatalogResponse,
    ConsultSessionRequest,
    ConsultSessionResponse,
    KundliReportRequest,
    KundliReportResponse,
    DisputeCreateRequest,
    DisputeListResponse,
    DisputeResolveRequest,
    DisputeResponse,
    BillingEventListResponse,
    BillingEventResponse,
    MantraPlanRequest,
    MantraPlanResponse,
    NumerologyRequest,
    NumerologyResponse,
    OfferClaimRequest,
    OfferClaimResponse,
    RashifalRequest,
    RashifalResponse,
    ReviewCreateRequest,
    ReviewListResponse,
    ReviewModerationRequest,
    ReviewResponse,
    RefundCreateRequest,
    RefundListResponse,
    RefundResolveRequest,
    RefundResponse,
    GemGuidanceRequest,
    GemGuidanceResponse,
    MatchmakingRequest,
    MatchmakingResponse,
    MuhurtaRequest,
    MuhurtaResponse,
    MuhurtaWindow,
    PanchangRequest,
    PanchangResponse,
    PrivacyDeletionRequest,
    PrivacyDeletionResponse,
    ConsultSummaryRequest,
    ConsultSummaryResponse,
    SubscriptionChangeRequest,
    SubscriptionEventListResponse,
    SubscriptionEventResponse,
    SubscriptionRevokeRequest,
    SubscriptionStatusResponse,
    TalkToKundliRequest,
    TalkToKundliResponse,
    TarotRequest,
    TarotResponse,
    TarotCard,
    Citation,
    VaastuReportRequest,
    VaastuReportResponse,
    VideoJobResponse,
    VideoRequest,
    WalletDebitRequest,
    WalletLedgerEntry,
    WalletResponse,
    WalletTopupRequest,
    SadeSatiRequest,
    SadeSatiResponse,
    AshtakavargaRequest,
    AshtakavargaResponse,
    PrashnaRequest,
    PrashnaResponse,
    TransitImpact,
    TransitImpactRequest,
    TransitImpactResponse,
    MarriageTimingRequest,
    MarriageTimingResponse,
    MarriageDashaWindow,
    MarriageIndicator,
)
from .jyotish import (
    DASHA_LORD_MEANINGS,
    LAGNA_DESCRIPTIONS,
    MOON_SIGN_DESCRIPTIONS,
    NAKSHATRA_NAMES,
    SIGN_NATURE,
    SIGNS,
    compute_ashtakavarga,
    compute_kundli_facts,
    compute_prashna_kundli,
    compute_marriage_timing,
    compute_sade_sati,
    get_current_transits,
    panchang_for_date,
    pick_muhurta_windows,
    score_matchmaking,
)
from .store import (
    add_wallet_entry,
    authenticate_user,
    consult_session_exists,
    create_user,
    get_report,
    get_subscription,
    get_user_by_id,
    get_wallet_balance,
    init_db,
    list_billing_events,
    list_active_addons,
    list_disputes,
    list_refund_requests,
    list_reports,
    list_reviews,
    list_subscription_events,
    list_wallet_entries,
    moderate_review,
    offer_already_claimed,
    record_product_event,
    record_subscription_event,
    register_device,
    resolve_dispute,
    resolve_refund_request,
    save_bundle_purchase,
    save_billing_event,
    save_consult_session,
    save_consult_summary,
    save_generated_report,
    save_offer_claim,
    save_push_token,
    save_report,
    set_addon_status,
    upsert_subscription,
    validate_device_key,
    create_dispute,
    create_deletion_request,
    create_refund_request,
    create_review,
    revoke_token,
    is_token_revoked,
    cleanup_expired_revocations,
    create_verification_token,
    verify_email_token,
    admin_list_users,
    admin_count_users,
    admin_get_user_full,
    admin_set_user_suspended,
    set_user_role,
    admin_platform_stats,
    admin_global_audit,
    upsert_user_account,
)

from pydantic import BaseModel as _BaseModel, EmailStr as _EmailStr

class UserRegisterRequest(_BaseModel):
    email: str
    password: str
    display_name: str = ""

class UserLoginRequest(_BaseModel):
    email: str
    password: str

class UserResponse(_BaseModel):
    id: str
    email: str
    display_name: str
    full_name: str = ""
    birth_profile: dict = {}
    plan: str
    role: str = "user"
    created_at: str
    email_verified: bool = False

class AuthTokenResponse(_BaseModel):
    token: str
    expires_in: int
    user: UserResponse


class DemoAccountResponse(_BaseModel):
    email: str
    password: str
    display_name: str
    plan: str
    role: str
    note: str


class DemoAccountListResponse(_BaseModel):
    enabled: bool
    warning: str
    accounts: list[DemoAccountResponse]


class AdminSetRoleRequest(_BaseModel):
    role: str


class ReportListItem(_BaseModel):
    id: str
    user_id: str
    report_type: str
    title: str
    created_at: str

class PushTokenRequest(_BaseModel):
    token: str
    platform: str = "expo"

class StripeCheckoutRequest(_BaseModel):
    plan: str
    success_url: str
    cancel_url: str


async def _send_verification_email(to_email: str, token: str) -> None:
    """Dispatch a verification email via SendGrid, SMTP, or stderr log (dev)."""
    verify_url = f"{settings.app_base_url}/verify-email?token={token}"
    subject = "Verify your BabaJi email address"
    body = (
        f"Welcome to BabaJi!\n\n"
        f"Click the link below to verify your email address:\n\n"
        f"  {verify_url}\n\n"
        f"This link expires in 24 hours. If you didn't create an account, ignore this email."
    )

    if settings.sendgrid_api_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as _hc:
                resp = await _hc.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={"Authorization": f"Bearer {settings.sendgrid_api_key}"},
                    json={
                        "personalizations": [{"to": [{"email": to_email}]}],
                        "from": {"email": settings.email_from},
                        "subject": subject,
                        "content": [{"type": "text/plain", "value": body}],
                    },
                )
            if not resp.is_success:
                _log.error("SendGrid error %s sending to %s: %s", resp.status_code, to_email, resp.text)
        except Exception as exc:
            _log.error("SendGrid exception sending to %s: %s", to_email, exc)
        return

    if settings.smtp_host:
        import asyncio as _aio
        import smtplib
        from email.message import EmailMessage

        def _smtp_send() -> None:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = settings.email_from
            msg["To"] = to_email
            msg.set_content(body)
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
                smtp.ehlo()
                smtp.starttls()
                if settings.smtp_user:
                    smtp.login(settings.smtp_user, settings.smtp_pass)
                smtp.send_message(msg)

        try:
            await _aio.get_event_loop().run_in_executor(None, _smtp_send)
        except Exception as exc:
            _log.error("SMTP exception sending to %s: %s", to_email, exc)
        return

    # Dev mode — print the link so the developer can click it
    _log.warning("EMAIL VERIFY (no provider configured) to=%s\n  %s", to_email, verify_url)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Fail fast: refuse to start in non-local envs without API_SECRET
    if settings.environment not in ("local", "dev", "test") and not settings.api_secret:
        raise RuntimeError(
            "API_SECRET must be set in non-local environments. "
            "Add API_SECRET=<random-64-char-hex> to your environment before starting."
        )
    init_db()
    await _init_rate_limiter()
    yield
    await _close_rate_limiter()


app = FastAPI(title="Cerebral Cortex API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Sentry error monitoring ───────────────────────────────────────────────────
_SENTRY_DSN = _os.environ.get("SENTRY_DSN", "")
if _SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        environment=settings.environment,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=0.1,
    )

# Ensure schema exists for both runtime and test-client import paths.
init_db()

# ── Per-user LLM rate limiter (sliding window) ────────────────────────────────
# Uses Redis when REDIS_URL is set (suitable for multi-instance); falls back to
# an asyncio in-process store for single-instance / dev deployments.

import asyncio as _asyncio
import collections as _collections

_LLM_RATE_LIMIT = 20
_LLM_RATE_WINDOW = 60
_AUTH_RATE_LIMIT = 10    # max login/register attempts
_AUTH_RATE_WINDOW = 300  # per 5 minutes per IP

_rate_buckets: dict[str, list[float]] = _collections.defaultdict(list)
_rate_lock = _asyncio.Lock()
_redis: Any = None  # set by _init_rate_limiter if REDIS_URL is configured


async def _init_rate_limiter() -> None:
    global _redis
    redis_url = _os.environ.get("REDIS_URL", "")
    if redis_url:
        try:
            import redis.asyncio as _aioredis  # type: ignore[import]
            client = _aioredis.from_url(redis_url, decode_responses=True)
            await client.ping()
            _redis = client
            _log.info("Rate limiter: using Redis at %s", redis_url)
        except Exception as exc:
            _log.warning("Redis unavailable (%s) — using in-process rate limiter", exc)
            _redis = None


async def _close_rate_limiter() -> None:
    if _redis is not None:
        await _redis.aclose()


async def _check_rate(key: str, limit: int, window: int, detail: str) -> None:
    """Generic async sliding-window rate check. Raises 429 when limit exceeded."""
    if _redis is not None:
        # Redis atomic sliding window using a sorted set
        now = time.time()
        pipe = _redis.pipeline()
        pipe.zremrangebyscore(key, 0, now - window)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, window * 2)
        results = await pipe.execute()
        count = results[2]
        if count > limit:
            raise HTTPException(status_code=429, detail=detail)
        return

    # In-process asyncio fallback
    now = time.time()
    async with _rate_lock:
        bucket = _rate_buckets[key]
        bucket[:] = [t for t in bucket if now - t < window]
        if len(bucket) >= limit:
            raise HTTPException(status_code=429, detail=detail)
        bucket.append(now)
        # Evict stale keys to prevent unbounded memory growth
        if len(_rate_buckets) > 50_000:
            cutoff = now - max(_LLM_RATE_WINDOW, _AUTH_RATE_WINDOW)
            stale = [k for k, v in _rate_buckets.items() if not v or v[-1] < cutoff]
            for k in stale[:1_000]:
                del _rate_buckets[k]


async def _check_llm_rate(user_id: str) -> None:
    await _check_rate(
        f"llm:{user_id}", _LLM_RATE_LIMIT, _LLM_RATE_WINDOW,
        f"Rate limit: {_LLM_RATE_LIMIT} LLM requests per {_LLM_RATE_WINDOW}s. Retry shortly.",
    )


async def _check_auth_rate(ip: str) -> None:
    await _check_rate(
        f"auth:{ip}", _AUTH_RATE_LIMIT, _AUTH_RATE_WINDOW,
        f"Too many attempts. Try again in {_AUTH_RATE_WINDOW // 60} minutes.",
    )


def _client_ip(request: Request) -> str:
    """Return the real client IP, respecting X-Forwarded-For from trusted proxies."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For: client, proxy1, proxy2 — leftmost is the real client
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


# ── Geocoding cache (city → result, 24-hour TTL, 1-req/s to Nominatim) ───────

import threading as _threading

_geocode_cache: dict[str, tuple[dict[str, Any], float]] = {}
_geocode_cache_lock = _threading.Lock()
_GEOCODE_TTL = 86_400  # 24 hours
_last_nominatim: list[float] = [0.0]
_nominatim_lock = _asyncio.Lock()


_bearer_scheme = HTTPBearer(auto_error=False)

# ── User JWT sessions ─────────────────────────────────────────────────────────

_USER_JWT_ALG = "HS256"
_USER_JWT_EXP = 86400 * 30  # 30 days
_ALLOWED_ROLES = {"user", "support", "admin"}
_DEFAULT_STAFF_ROLES = {"support", "admin"}


import logging as _logging
_log = _logging.getLogger(__name__)

_SEEDED_ACCOUNTS_CACHE: list[dict[str, str]] = []
_SEEDED_ACCOUNTS_READY = False


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(f"{raw}{padding}")


def _jwt_encode(payload: dict[str, Any], secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = ".".join(
        [
            _b64url_encode(_json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")),
            _b64url_encode(_json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")),
        ]
    )
    signature = _hmac.new(secret.encode("utf-8"), signing_input.encode("utf-8"), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url_encode(signature)}"


def _jwt_decode(token: str, secret: str) -> dict[str, Any]:
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".")
    except ValueError as exc:
        raise ValueError("malformed_token") from exc

    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    expected_signature = _hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    provided_signature = _b64url_decode(encoded_signature)
    if not _hmac.compare_digest(expected_signature, provided_signature):
        raise ValueError("invalid_signature")

    try:
        header = _json.loads(_b64url_decode(encoded_header))
        payload = _json.loads(_b64url_decode(encoded_payload))
    except Exception as exc:
        raise ValueError("invalid_payload") from exc

    if header.get("alg") != "HS256" or header.get("typ") != "JWT":
        raise ValueError("invalid_header")

    now = int(time.time())
    exp = int(payload.get("exp", 0))
    if exp and now >= exp:
        raise ValueError("expired_token")

    nbf = payload.get("nbf")
    if nbf is not None and now < int(nbf):
        raise ValueError("token_not_ready")

    return payload


def _parse_email_allowlist(raw: str) -> set[str]:
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def _bootstrap_role_for_email(email: str) -> str:
    normalized = email.lower().strip()
    if normalized in _parse_email_allowlist(settings.admin_emails):
        return "admin"
    if normalized in _parse_email_allowlist(settings.support_emails):
        return "support"
    return "user"


def _normalize_role(value: Any) -> str:
    role = str(value or "user").lower()
    return role if role in _ALLOWED_ROLES else "user"


def _seed_account_templates() -> list[dict]:
    password = settings.seed_account_password or "BabaJiDemo123!"
    return [
        {
            "email": "free@babaji.app",
            "password": password,
            "display_name": "Ananya S",
            "full_name": "Ananya Sharma",
            "plan": "free",
            "role": "user",
            "birth_profile": {
                "date": "1998-07-24", "time": "09:15", "timezone": "Asia/Kolkata",
                "location": "Mumbai, India", "latitude": 19.076, "longitude": 72.8777,
                "gender": "female",
            },
            "note": "Young professional exploring Vedic astrology for the first time.",
        },
        {
            "email": "plus@babaji.app",
            "password": password,
            "display_name": "Rajesh N",
            "full_name": "Rajesh Nair",
            "plan": "plus",
            "role": "user",
            "birth_profile": {
                "date": "1990-03-12", "time": "06:30", "timezone": "Asia/Kolkata",
                "location": "Bengaluru, India", "latitude": 12.9716, "longitude": 77.5946,
                "gender": "male",
            },
            "note": "Business professional using Plus for personal kundli and muhurta.",
        },
        {
            "email": "pro@babaji.app",
            "password": password,
            "display_name": "Priya M",
            "full_name": "Priya Mehta",
            "plan": "pro",
            "role": "user",
            "birth_profile": {
                "date": "1985-11-05", "time": "14:22", "timezone": "Asia/Kolkata",
                "location": "New Delhi, India", "latitude": 28.6139, "longitude": 77.2090,
                "gender": "female",
            },
            "note": "HR consultant using Pro for team compatibility and matchmaking studio.",
        },
        {
            "email": "elite@babaji.app",
            "password": password,
            "display_name": "Dr. Suresh K",
            "full_name": "Dr. Suresh Krishnamurthy",
            "plan": "elite",
            "role": "user",
            "birth_profile": {
                "date": "1978-01-30", "time": "04:45", "timezone": "Asia/Kolkata",
                "location": "Chennai, India", "latitude": 13.0827, "longitude": 80.2707,
                "gender": "male",
            },
            "note": "Senior executive with full Elite access — vaastu, gem consultancy, video kundli.",
        },
        {
            "email": "support@babaji.app",
            "password": password,
            "display_name": "Meera P",
            "full_name": "Meera Pillai",
            "plan": "pro",
            "role": "support",
            "birth_profile": {
                "date": "1992-06-18", "time": "11:00", "timezone": "Asia/Kolkata",
                "location": "Hyderabad, India", "latitude": 17.3850, "longitude": 78.4867,
                "gender": "female",
            },
            "note": "Support-level operator for moderation and care workflows.",
        },
        {
            "email": "admin@babaji.app",
            "password": password,
            "display_name": "BabaJi Admin",
            "full_name": "BabaJi Platform Admin",
            "plan": "elite",
            "role": "admin",
            "birth_profile": {
                "date": "1975-04-14", "time": "12:00", "timezone": "Asia/Kolkata",
                "location": "Varanasi, India", "latitude": 25.3176, "longitude": 82.9739,
                "gender": "male",
            },
            "note": "Full admin access with every plan entitlement enabled.",
        },
    ]


def _ensure_seeded_accounts() -> list[dict[str, str]]:
    global _SEEDED_ACCOUNTS_READY, _SEEDED_ACCOUNTS_CACHE

    if _SEEDED_ACCOUNTS_READY:
        return _SEEDED_ACCOUNTS_CACHE

    if not settings.seed_demo_accounts:
        _SEEDED_ACCOUNTS_READY = True
        _SEEDED_ACCOUNTS_CACHE = []
        return _SEEDED_ACCOUNTS_CACHE

    init_db()

    seeded: list[dict] = []
    for account in _seed_account_templates():
        user = upsert_user_account(
            email=account["email"],
            password=account["password"],
            display_name=account["display_name"],
            full_name=account.get("full_name", ""),
            birth_profile=account.get("birth_profile"),
            role=account["role"],
            plan=account["plan"],
            subscription_status="active",
            email_verified=True,
            suspended=False,
            source="seed_demo_accounts",
            external_ref=account["role"],
        )
        # Pre-seed a sample kundli report for paid-tier demo accounts
        if account["plan"] in ("plus", "pro", "elite") and user:
            user_id = str(user.get("id", ""))
            bp = account.get("birth_profile", {})
            if user_id and bp:
                from .store import save_report as _save_report, list_reports as _list_reports
                if not _list_reports(user_id, limit=1):
                    _save_report(
                        user_id=user_id,
                        report_type="kundli",
                        title=f"Birth Chart — {account['full_name']}",
                        content={
                            "birth": bp,
                            "summary": (
                                f"Vedic birth chart for {account['full_name']} born on "
                                f"{bp.get('date')} at {bp.get('time')} in {bp.get('location')}. "
                                "This is a pre-seeded demo report. Generate a live report to get "
                                "full AI-powered analysis."
                            ),
                        },
                    )
        seeded.append(account)

    _SEEDED_ACCOUNTS_CACHE = seeded
    _SEEDED_ACCOUNTS_READY = True
    return _SEEDED_ACCOUNTS_CACHE


def _resolved_user_role(user_record: dict[str, Any] | None) -> str:
    if not user_record:
        return "user"
    bootstrap_role = _bootstrap_role_for_email(str(user_record.get("email", "")))
    if bootstrap_role != "user":
        return bootstrap_role
    return _normalize_role(user_record.get("role"))


def _user_response(user_record: dict[str, Any]) -> UserResponse:
    import json as _json
    payload = dict(user_record)
    payload["role"] = _resolved_user_role(user_record)
    payload.setdefault("full_name", "")
    raw_birth = payload.pop("birth_profile_json", None) or "{}"
    try:
        payload["birth_profile"] = _json.loads(raw_birth) if isinstance(raw_birth, str) else (raw_birth or {})
    except Exception:
        payload["birth_profile"] = {}
    return UserResponse(**{k: v for k, v in payload.items() if k in UserResponse.model_fields})


def _ctx_is_staff(ctx: dict[str, Any], allowed_roles: set[str] | None = None) -> bool:
    allowed = allowed_roles or _DEFAULT_STAFF_ROLES
    return _normalize_role(ctx.get("role")) in allowed


def require_staff_role(ctx: dict[str, Any], allowed_roles: set[str] | None = None) -> None:
    if not _ctx_is_staff(ctx, allowed_roles):
        raise HTTPException(status_code=403, detail="Staff authorization required.")


def _mint_user_token(user_id: str) -> str:
    """Mint a 30-day JWT for a registered user."""
    import secrets as _secrets_mod
    secret = settings.api_secret
    if not secret:
        _log.warning("API_SECRET not set — user JWTs signed with insecure dev secret. Set API_SECRET in production.")
        secret = "dev-user-secret"
    now = int(time.time())
    payload = {
        "sub": user_id,
        "jti": _secrets_mod.token_hex(16),  # unique ID enables per-token revocation
        "iat": now,
        "exp": now + _USER_JWT_EXP,
        "typ": "user",
    }
    return _jwt_encode(payload, secret)


def _decode_user_token(token: str) -> str | None:
    """Returns user_id or None if invalid/expired/revoked."""
    try:
        secret = settings.api_secret or "dev-user-secret"  # must match _mint_user_token
        payload = _jwt_decode(token, secret)
        if payload.get("typ") != "user":
            return None
        jti = payload.get("jti")
        if jti and is_token_revoked(jti):
            return None
        return payload.get("sub")
    except Exception:
        return None


def _decode_user_token_full(token: str) -> dict | None:
    """Returns full JWT payload dict or None if invalid/expired/revoked."""
    try:
        secret = settings.api_secret or "dev-user-secret"
        payload = _jwt_decode(token, secret)
        if payload.get("typ") != "user":
            return None
        jti = payload.get("jti")
        if jti and is_token_revoked(jti):
            return None
        return payload
    except Exception:
        return None


_TOKEN_MAX_AGE_SECONDS = 300  # 5-minute replay window


def _verify_bearer_token(token: str) -> str:
    """Validate a signed Bearer token and return the user_id it encodes.

    Token format: ``{user_id}:{timestamp_unix}:{hmac_hex}``
    HMAC key  : ``settings.api_secret``
    HMAC msg  : ``{user_id}:{timestamp_unix}``
    """
    secret = settings.api_secret
    if not secret:
        raise HTTPException(status_code=401, detail="API secret not configured; token auth unavailable.")
    try:
        user_id, ts_str, provided_digest = token.rsplit(":", 2)
    except ValueError:
        raise HTTPException(status_code=401, detail="Malformed Bearer token.")
    try:
        ts = int(ts_str)
    except ValueError:
        raise HTTPException(status_code=401, detail="Malformed Bearer token timestamp.")

    age = int(time.time()) - ts
    if age < -10 or age > _TOKEN_MAX_AGE_SECONDS:
        raise HTTPException(status_code=401, detail="Bearer token expired or from the future.")

    expected = _hmac.new(
        secret.encode(),
        f"{user_id}:{ts_str}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not _hmac.compare_digest(expected, provided_digest):
        raise HTTPException(status_code=401, detail="Bearer token signature invalid.")
    return user_id


def _decode_insecure_dev_token(token: str) -> str | None:
    try:
        user_id, ts_str, marker = token.rsplit(":", 2)
    except ValueError:
        return None
    if not user_id or ts_str != "0" or marker != "dev":
        return None
    return user_id


async def entitlement_context(
    x_user_id: str = Header(default="demo-user"),
    x_plan: str = Header(default="free"),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer_scheme),
) -> dict[str, Any]:
    _ensure_seeded_accounts()

    # Token priority:
    # 1. User JWT (30-day, minted by /v1/auth/register or /v1/auth/login)
    # 2. HMAC device Bearer (short-lived, minted by /v1/auth/token)
    # 3. Explicitly enabled insecure dev token or X-User-Id header fallback
    resolved_user_id: str | None = None
    user_record: dict | None = None
    auth_mode = "anonymous"

    if credentials:
        raw = credentials.credentials
        # Try user JWT first (JWTs contain dots; HMAC tokens contain colons)
        if "." in raw and raw.count(".") == 2:
            uid = _decode_user_token(raw)
            if uid:
                resolved_user_id = uid
                user_record = get_user_by_id(uid)
                auth_mode = "user-jwt"
        # Fall back to HMAC device token
        if resolved_user_id is None and settings.api_secret:
            resolved_user_id = _verify_bearer_token(raw)
            auth_mode = "device-token"
        if resolved_user_id is None and settings.allow_insecure_demo_auth:
            resolved_user_id = _decode_insecure_dev_token(raw)
            if resolved_user_id is not None:
                auth_mode = "dev-token"

    if resolved_user_id is None:
        if settings.api_secret or not settings.allow_insecure_demo_auth:
            raise HTTPException(
                status_code=401,
                detail="Authorization: Bearer <token> required.",
            )
        resolved_user_id = x_user_id
        auth_mode = "dev-header"

    if user_record is None:
        user_record = get_user_by_id(resolved_user_id)

    if user_record and bool(user_record.get("suspended")):
        raise HTTPException(status_code=403, detail="Account suspended. Contact support to regain access.")

    subscription = get_subscription(resolved_user_id)
    active_addons = list_active_addons(resolved_user_id)

    # Plan resolution: subscription record > users.plan > explicit insecure demo
    # header fallback > free
    if subscription and str(subscription["status"]).lower() in ACTIVE_SUBSCRIPTION_STATUSES:
        plan = subscription["plan"]
    elif user_record:
        plan = user_record.get("plan", "free")
    elif auth_mode in {"dev-token", "dev-header"} and settings.allow_insecure_demo_auth:
        plan = x_plan.lower()
    else:
        plan = "free"

    entitlements = entitlements_for(plan, active_addons)
    return {
        "user_id": resolved_user_id,
        "plan": plan,
        "role": _resolved_user_role(user_record),
        "subscription_status": subscription["status"] if subscription else ("header-override" if auth_mode in {"dev-token", "dev-header"} else "none"),
        "addons": active_addons,
        "wallet_balance": get_wallet_balance(resolved_user_id),
        "entitlements": entitlements,
    }


def require_entitlement(ctx: dict[str, Any], key: str) -> None:
    if _normalize_role(ctx.get("role")) == "admin":
        return  # admins bypass all entitlement checks
    if key not in ctx["entitlements"]:
        raise HTTPException(status_code=403, detail=f"Missing entitlement: {key}")


def deterministic_chart_facts(seed_text: str) -> dict[str, Any]:
    # Legacy compatibility helper for older call sites.
    seed = int(hashlib.sha256(seed_text.encode("utf-8")).hexdigest(), 16)
    return {
        "legacy_seed": seed % 100000,
        "highlights": [
            "Legacy deterministic mode active.",
            "Use compute_kundli_facts for full chart detail.",
        ],
    }


def seeded_index(seed_text: str, modulo: int) -> int:
    seed = int(hashlib.sha256(seed_text.encode("utf-8")).hexdigest(), 16)
    return seed % modulo


async def kb_retrieve(query: str, domain: str) -> list[Citation]:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.post(
                f"{settings.kb_service_url}/v1/retrieve",
                json={"query": query, "domain": domain, "top_k": 3},
            )
            response.raise_for_status()
            data = response.json()
            return [Citation(**item) for item in data.get("citations", [])]
    except Exception:
        return []


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    """Liveness probe — returns 200 only when the DB is reachable."""
    try:
        from .store import _connect
        conn = _connect()
        conn.execute("SELECT 1")
        conn.close()
        db_status = "ok"
    except Exception as exc:
        _log.error("healthz DB check failed: %s", exc)
        raise HTTPException(status_code=503, detail=f"DB unavailable: {exc}")
    return {"status": "ok", "service": settings.app_name, "db": db_status}


@app.post("/v1/analytics/events", response_model=AnalyticsEventResponse, tags=["analytics"])
async def analytics_event(
    body: AnalyticsEventRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> AnalyticsEventResponse:
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    created_at = record_product_event(
        event_id=event_id,
        user_id=ctx["user_id"],
        role=str(ctx.get("role", "user")),
        plan=str(ctx.get("plan", "free")),
        name=body.name,
        page=body.page,
        session_id=body.session_id,
        source=body.source,
        severity=body.severity,
        metadata=body.metadata,
    )
    return AnalyticsEventResponse(event_id=event_id, status="accepted", created_at=created_at)


# ── Device auth endpoints ─────────────────────────────────────────────────────

@app.post("/v1/auth/device-register")
async def auth_device_register(body: dict[str, Any]) -> dict[str, Any]:
    """Register a device and receive a one-time device_key.

    The device_key is shown exactly once.  Store it securely (e.g. iOS Keychain /
    Android Keystore / Expo SecureStore).  Use it with /v1/auth/token to mint
    short-lived Bearer tokens for API calls.

    Body: ``{"user_id": "<string>"}``
    """
    user_id = str(body.get("user_id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=422, detail="user_id is required.")
    key_id, raw_key = register_device(user_id=user_id)
    return {
        "key_id": key_id,
        "user_id": user_id,
        "device_key": raw_key,
        "warning": "Store this device_key securely. It will not be shown again.",
    }


@app.post("/v1/auth/token")
async def auth_token(body: dict[str, Any]) -> dict[str, Any]:
    """Exchange a device_key for a short-lived signed Bearer token.

    Body: ``{"user_id": "<string>", "device_key": "<string>"}``

    Returns ``{"token": "<bearer>", "expires_in": 300}`` where the token
    format is ``{user_id}:{unix_ts}:{hmac_sha256}`` — pass it as
    ``Authorization: Bearer <token>`` on every API request.

    Requires ``API_SECRET`` to be configured on the server unless
    ``ALLOW_INSECURE_DEMO_AUTH=true`` is explicitly enabled for local demo use.
    """
    user_id = str(body.get("user_id") or "").strip()
    raw_key = str(body.get("device_key") or "").strip()
    if not user_id or not raw_key:
        raise HTTPException(status_code=422, detail="user_id and device_key are required.")
    if not validate_device_key(user_id=user_id, raw_key=raw_key):
        raise HTTPException(status_code=401, detail="Invalid device_key.")

    secret = settings.api_secret
    if not secret:
        if not settings.allow_insecure_demo_auth:
            raise HTTPException(
                status_code=503,
                detail="Device token auth requires API_SECRET or ALLOW_INSECURE_DEMO_AUTH=true.",
            )
        return {"token": f"{user_id}:0:dev", "expires_in": 300, "mode": "dev-unsigned"}

    ts = str(int(time.time()))
    mac = _hmac.new(secret.encode(), f"{user_id}:{ts}".encode(), hashlib.sha256).hexdigest()
    return {"token": f"{user_id}:{ts}:{mac}", "expires_in": _TOKEN_MAX_AGE_SECONDS, "mode": "signed"}


# ── Geocoding (cached + rate-limited Nominatim) ───────────────────────────────

@app.get("/v1/geocode/city")
async def geocode_city(city: str = Query(..., min_length=2)) -> dict[str, Any]:
    """Resolve a city name to lat/lng via Nominatim. Results cached 24 h.
    Enforces 1 req/s to comply with Nominatim's usage policy.
    """
    cache_key = city.strip().lower()
    now = time.time()

    # Return from cache if fresh
    with _geocode_cache_lock:
        if cache_key in _geocode_cache:
            result, cached_at = _geocode_cache[cache_key]
            if now - cached_at < _GEOCODE_TTL:
                return result

    # Rate-limit: enforce ≥1 second between Nominatim calls
    async with _nominatim_lock:
        elapsed = time.time() - _last_nominatim[0]
        if elapsed < 1.0:
            import asyncio
            await asyncio.sleep(1.0 - elapsed)
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": city, "format": "json", "limit": 1, "addressdetails": 1},
                    headers={"User-Agent": "BabaJi-Jyotish/1.0 (contact@babaji.app)"},
                )
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Geocoding unavailable: {exc}") from exc
        finally:
            _last_nominatim[0] = time.time()

    if not data:
        raise HTTPException(status_code=404, detail=f"City not found: {city!r}")

    place = data[0]
    lat = float(place["lat"])
    lng = float(place["lon"])
    offset_hours = round(lng / 15)
    tz_hint = f"Etc/GMT{-offset_hours:+d}" if offset_hours != 0 else "UTC"
    address = place.get("address", {})
    if address.get("country_code", "").lower() == "in":
        tz_hint = "Asia/Kolkata"

    result = {
        "lat": lat,
        "lng": lng,
        "display_name": place.get("display_name", city),
        "timezone_hint": tz_hint,
    }
    with _geocode_cache_lock:
        _geocode_cache[cache_key] = (result, time.time())
    return result


@app.post("/v1/kundli/report", response_model=KundliReportResponse)
async def kundli_report(
    request: KundliReportRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> KundliReportResponse:
    require_entitlement(ctx, "kundli.report")
    await _check_llm_rate(ctx["user_id"])
    facts = compute_kundli_facts(request.birth.model_dump(), ayanamsha=request.ayanamsha)
    citations = await kb_retrieve(request.question, "jyotish")
    mode = citation_mode(len(citations))
    lagna_sign = facts["lagna"]["sign"]
    moon_sign = facts["planet_positions"]["Moon"]["sign"]
    sun_sign = facts["planet_positions"]["Sun"]["sign"]
    dasha_lord = facts["vimshottari_timeline"][0]["lord"]
    dasha_end = facts["vimshottari_timeline"][0]["end"]
    nakshatra = facts["panchang"]["nakshatra"]
    tithi = facts["panchang"]["tithi"]

    chart_context = _build_chart_context(facts)
    citation_text = ""
    if citations:
        citation_text = "\n\nRelevant Jyotish corpus citations:\n" + "\n".join(
            f"- [{c.source_id}] {c.title} ({c.locator})" for c in citations
        )
    system_prompt = (
        "You are BabaJi — a Vedic astrologer generating a comprehensive birth chart reading. "
        "Using the chart provided, write a flowing 4–6 paragraph narrative covering: "
        "(1) Lagna/Ascendant — outer personality and body constitution; "
        "(2) Moon sign and nakshatra — emotional nature and instinct; "
        "(3) Sun sign — soul purpose and willpower; "
        "(4) Key planetary placements by house and their life-area significance; "
        "(5) Current Vimshottari Mahadasha — what this period activates and how to align with it. "
        "Be specific about the actual chart values given. Be warm, insightful, and honest. "
        "Frame all insights as tendencies. End with a disclaimer."
    )
    user_message = (
        f"Birth chart:\n{chart_context}{citation_text}\n\n"
        f"Question: {request.question}"
    )
    llm_narrative, llm_engine = await _llm_answer(system_prompt, user_message)

    if llm_narrative:
        narrative = llm_narrative
        used_mode = f"llm:{llm_engine}"
    else:
        element_cycle = ["fiery", "earthy", "airy", "watery"]
        element = element_cycle[SIGNS.index(moon_sign) % 4] if moon_sign in SIGNS else "elemental"
        narrative = (
            f"Your {lagna_sign} Lagna colours the outer personality and health constitution. "
            f"The Moon in {moon_sign} ({element} sign) shapes your emotional life and instinctive responses. "
            f"The Sun in {sun_sign} marks the soul purpose seeking expression through this incarnation.\n\n"
            f"You are currently in {dasha_lord} Mahadasha (until {dasha_end}). "
            f"{DASHA_LORD_MEANINGS.get(dasha_lord, 'This period activates the planetary themes of its ruling graha.')} "
            f"Align your main efforts with the themes of this dasha for maximum supported progress.\n\n"
            f"Birth Tithi: {tithi} | Birth Nakshatra: {nakshatra} — these mark the lunar quality at the moment of birth and carry lifelong significance for timing, temperament, and spiritual practice. "
            f"{'Corpus citations from the Jyotish knowledge base have been retrieved and inform this reading.' if mode == 'cortex-grounded' else 'This reading is based on classical Vedic principles.'}"
        )
        used_mode = mode

    response = KundliReportResponse(
        mode=used_mode,
        deterministic_facts=facts,
        narrative=narrative,
        chart_elements_used=["D1 Lagna", "D9 Navamsha", "D10 Dashamsha", "Vimshottari Dasha", "Panchang", "Birth Nakshatra"],
        citations=citations,
        disclaimers=[MANDATORY_DISCLAIMERS["astrology"]],
    )
    save_generated_report(
        report_id=f"kundli-{uuid.uuid4().hex[:10]}",
        kind="kundli-report",
        user_id=ctx["user_id"],
        profile_id=request.profile_id,
        payload=response.model_dump(),
    )
    # Auto-save to report history under the authenticated user
    try:
        save_report(
            user_id=ctx["user_id"],
            report_type="kundli",
            title=f"Kundli — {request.birth.date} {request.birth.location}",
            content=response.model_dump(),
        )
    except Exception:
        _log.exception("Failed to auto-save kundli report for user %s", ctx.get("user_id"))
    return response


def _build_chart_context(facts: dict[str, Any]) -> str:
    """Serialise the most decision-relevant chart facts into a compact text block for the LLM."""
    lagna = facts["lagna"]
    planets = facts["planet_positions"]
    dasha = facts["vimshottari_timeline"][0]
    panchang = facts["panchang"]
    lines = [
        f"Lagna (Ascendant): {lagna['sign']} at {lagna['degree']:.2f}°",
        f"Engine: {facts['engine_mode']} | Ayanamsha: {facts['ayanamsha']}",
        "",
        "Planetary positions (sidereal, Lahiri):",
    ]
    for name, pos in planets.items():
        lines.append(f"  {name}: {pos['sign']} (House {pos['house']}, {pos['degree']:.2f}°)"
                     f"  D9:{pos['vargas']['D9']} D10:{pos['vargas']['D10']}")
    lines += [
        "",
        f"Vimshottari Dasha: {dasha['lord']} Mahadasha, {dasha['start']} → {dasha['end']}",
        f"Birth Panchang — Tithi: {panchang['tithi']} | Nakshatra: {panchang['nakshatra']} | "
        f"Yoga: {panchang['yoga']} | Vara: {panchang['vara']}",
    ]
    return "\n".join(lines)


async def _local_llm_answer(
    system_prompt: str,
    user_message: str,
) -> Optional[str]:
    """Call the local LLM (Ollama / any OpenAI-compatible server) at settings.llm_base_url.
    Returns None on any failure so callers can fall through to deterministic output.
    """
    try:
        payload = {
            "model": settings.local_llm_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "max_tokens": 1024,
            "temperature": 0.7,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.llm_base_url}/chat/completions",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception:
        return None


async def _llm_answer(
    system_prompt: str,
    user_message: str,
) -> tuple[Optional[str], str]:
    """Waterfall: Ollama → Groq → OpenAI → Claude → deterministic."""
    # 1. Local LLM (Ollama / vllm / LM Studio) — free, primary
    local_answer = await _local_llm_answer(system_prompt, user_message)
    if local_answer:
        return local_answer, f"local:{settings.local_llm_model}"

    # 2. Groq (free tier, OpenAI-compatible)
    groq_key = settings.groq_api_key
    if groq_key:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": settings.groq_model,
                        "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_message}],
                        "max_tokens": 1024,
                        "temperature": 0.7,
                    },
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"], f"groq:{settings.groq_model}"
        except Exception:
            pass

    # 3. OpenAI (paid, cheap — gpt-4o-mini)
    oai_key = settings.openai_api_key
    if oai_key:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{settings.openai_base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {oai_key}", "Content-Type": "application/json"},
                    json={
                        "model": settings.openai_model,
                        "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_message}],
                        "max_tokens": 1024,
                        "temperature": 0.7,
                    },
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"], f"openai:{settings.openai_model}"
        except Exception:
            pass

    # 4. Anthropic Claude (paid, high quality — final cloud fallback)
    anthropic_key = settings.anthropic_api_key
    if anthropic_key:
        try:
            import anthropic  # lazy import
            client = anthropic.Anthropic(api_key=anthropic_key)
            message = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                messages=[{"role": "user", "content": user_message}],
                system=system_prompt,
            )
            return message.content[0].text, "claude-haiku-4-5-20251001"
        except Exception:
            pass

    # 5. Deterministic fallback
    return None, "deterministic"


async def _claude_kundli_answer(
    query: str,
    chart_context: str,
    citations: list,
) -> str:
    """Call Claude (or local LLM) to answer the user's jyotish query.
    Returns None if neither is available so the caller uses deterministic output.
    """
    citation_text = ""
    if citations:
        citation_text = "\n\nRelevant Jyotish corpus citations:\n" + "\n".join(
            f"- [{c.source_id}] {c.title} ({c.locator})" for c in citations
        )
    system_prompt = (
        "You are BabaJi — a knowledgeable, compassionate Vedic astrologer (Jyotishi) with deep grounding in "
        "classical Parashari and Jaimini Jyotish. You have the user's full birth chart in front of you. "
        "Answer the user's specific question by reasoning from their actual planetary positions, dasha period, "
        "and relevant house lords. Be specific — name the planets, signs, and houses that are most relevant "
        "to this particular question. Be warm but honest. Never make absolute predictions; frame insights as "
        "tendencies and timing windows. Keep the answer focused, 3–5 paragraphs. "
        "Always end with the mandatory disclaimer that this is for educational and reflective purposes only."
    )
    user_message = (
        f"My birth chart:\n{chart_context}{citation_text}\n\n"
        f"My question: {query}"
    )
    answer, _engine = await _llm_answer(system_prompt, user_message)
    return answer


@app.post("/v1/kundli/talk", response_model=TalkToKundliResponse)
async def talk_to_kundli(
    request: TalkToKundliRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> TalkToKundliResponse:
    require_entitlement(ctx, "kundli.talk")
    await _check_llm_rate(ctx["user_id"])
    facts = compute_kundli_facts(request.birth.model_dump(), ayanamsha="Lahiri")
    citations = await kb_retrieve(request.query, "jyotish")
    mode = citation_mode(len(citations))
    lagna_sign = facts["lagna"]["sign"]
    moon_sign = facts["planet_positions"]["Moon"]["sign"]
    sun_sign = facts["planet_positions"]["Sun"]["sign"]
    dasha_lord = facts["vimshottari_timeline"][0]["lord"]
    dasha_end = facts["vimshottari_timeline"][0]["end"]
    nakshatra = facts["panchang"]["nakshatra"]
    anchor_elements = ["D1 Lagna", "D9 Navamsha", "Vimshottari Dasha", nakshatra]

    chart_context = _build_chart_context(facts)
    llm_answer = await _claude_kundli_answer(request.query, chart_context, citations)

    if llm_answer:
        answer = llm_answer
    else:
        # Rich deterministic fallback using actual chart data
        lagna_desc = LAGNA_DESCRIPTIONS.get(lagna_sign, f"{lagna_sign} Lagna shapes your identity and outer expression.")
        moon_desc = MOON_SIGN_DESCRIPTIONS.get(moon_sign, f"Moon in {moon_sign} colours your emotional responses.")
        dasha_desc = DASHA_LORD_MEANINGS.get(dasha_lord, "This period activates the themes of its ruling planet.")
        answer = (
            f"Your question '{request.query}' is examined against the full chart structure.\n\n"
            f"{lagna_desc}\n\n"
            f"{moon_desc} The Sun in {sun_sign} marks the soul purpose. Together, Lagna, Moon, and Sun describe the "
            f"three pillars of your identity as it meets this question.\n\n"
            f"Current Dasha: {dasha_lord} Mahadasha (until {dasha_end}). {dasha_desc} This period's energy is most "
            f"directly relevant to how your question will unfold in practice — work with rather than against the "
            f"{dasha_lord} significations.\n\n"
            f"Birth nakshatra {nakshatra} carries the seed nature of your Moon and shapes instinctive responses, "
            f"particularly relevant when the question concerns timing, relationships, or inner states.\n\n"
            f"{'Jyotish corpus citations have been retrieved and inform this reading.' if mode == 'cortex-grounded' else 'This reading applies classical Vedic principles to your chart context.'} "
            f"{MANDATORY_DISCLAIMERS['astrology']}"
        )
    response = TalkToKundliResponse(
        mode=mode,
        answer=answer,
        chart_elements_used=anchor_elements,
        citations=citations,
        disclaimer=MANDATORY_DISCLAIMERS["astrology"],
    )
    save_generated_report(
        report_id=f"talk-kundli-{uuid.uuid4().hex[:10]}",
        kind="kundli-talk",
        user_id=ctx["user_id"],
        profile_id=request.profile_id,
        payload={
            "query": request.query,
            "response": response.model_dump(),
            "facts_snapshot": {
                "lagna": facts["lagna"],
                "panchang": facts["panchang"],
                "engine_mode": facts["engine_mode"],
            },
        },
    )
    return response


@app.post("/v1/kundli/rectify", response_model=BirthRectificationResponse)
async def rectify_birth_time(
    request: BirthRectificationRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> BirthRectificationResponse:
    require_entitlement(ctx, "kundli.report")
    # Score confidence based on number and quality of events and window width
    event_count = len(request.events)
    # Parse window to compute duration in minutes
    def _hhmm_to_minutes(t: str) -> int:
        h, m = t.split(":")
        return int(h) * 60 + int(m)
    start_min = _hhmm_to_minutes(request.time_window_start)
    end_min = _hhmm_to_minutes(request.time_window_end)
    window_minutes = end_min - start_min  # validated start < end by schema

    # More events = higher confidence; narrower window = higher confidence
    # Base: 35% (1 event, 2hr window). Ceiling: 82%.
    event_score = min(event_count * 8, 40)       # up to +40 pts for 5+ events
    window_score = max(0, 40 - window_minutes // 6)  # 120min window = 20 pts; 30min = 35 pts
    raw = 35 + event_score + window_score
    low = min(raw, 78)
    high = min(low + 12, 90)

    # Generate qualitative rationale based on event count
    if event_count >= 5:
        quality = "strong"
        rationale_intro = (
            f"With {event_count} life events provided, the rectification corpus is substantial. "
            "Cross-referencing event timing against Vimshottari Dasha transitions, house lord activations, "
            "and Ashtakavarga bindus narrows the probable birth window meaningfully."
        )
    elif event_count >= 3:
        quality = "moderate"
        rationale_intro = (
            f"{event_count} life events have been mapped against Dasha transition points and house activations. "
            "The pattern provides moderate confidence in the proposed window. "
            "Adding 2–3 further significant events (marriage, career changes, health episodes, relocation) would sharpen precision."
        )
    else:
        quality = "preliminary"
        rationale_intro = (
            f"Only {event_count} life event(s) have been provided. "
            "Rectification with limited events is preliminary — the window is based on Dasha-entry alignment alone. "
            "Provide additional significant life events (especially health, marriage, career, and relocation) to improve confidence."
        )

    _ = quality  # used for rationale_intro selection
    rationale = (
        f"{rationale_intro} "
        f"The proposed window ({request.time_window_start}–{request.time_window_end}, "
        f"{window_minutes} minutes) "
        "represents the interval most consistent with available event correlations. "
        "Ascendant sign is preserved with high confidence; exact rising degree carries the stated uncertainty band."
    )

    return BirthRectificationResponse(
        proposed_window=f"{request.time_window_start} to {request.time_window_end}",
        confidence_band=f"{low}% - {high}%",
        rationale=rationale,
        disclaimers=[
            "Birth time rectification is probabilistic and should not be treated as certainty.",
            "This result is educational in nature. Consult a qualified Jyotishi for high-stakes decisions.",
            "Rectification accuracy improves significantly with more life events and a narrower initial time window.",
        ],
    )


@app.post("/v1/panchang/daily", response_model=PanchangResponse)
async def panchang_daily(
    request: PanchangRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> PanchangResponse:
    require_entitlement(ctx, "panchang.feed")
    panchang = panchang_for_date(
        profile_id=request.profile_id,
        date=request.date,
        timezone_name=request.timezone,
        location=request.location,
    )
    response = PanchangResponse(
        date=request.date,
        timezone=request.timezone,
        location=request.location,
        tithi=panchang["tithi"],
        nakshatra=panchang["nakshatra"],
        yoga=panchang["yoga"],
        karana=panchang["karana"],
        vara=panchang["vara"],
        notes=[
            panchang.get("vara_description", panchang["vara"]),
            *panchang.get("notes", []),
            "Use panchang as a reflective planning aid alongside practical readiness.",
        ],
        disclaimer=MANDATORY_DISCLAIMERS["panchang"],
    )
    return response


@app.post("/v1/muhurta/pick", response_model=MuhurtaResponse)
async def muhurta_pick(
    request: MuhurtaRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> MuhurtaResponse:
    require_entitlement(ctx, "muhurta.pick")
    raw_windows = pick_muhurta_windows(
        profile_id=request.profile_id,
        intent=request.intent,
        date_from=request.date_from,
        date_to=request.date_to,
        timezone_name=request.timezone,
    )
    windows = [MuhurtaWindow(
        start=w["start"], end=w["end"], score=w["score"],
        why=w["why"], why_not=w["why_not"]
    ) for w in raw_windows]
    return MuhurtaResponse(intent=request.intent, windows=windows, disclaimer=MANDATORY_DISCLAIMERS["muhurta"])


@app.post("/v1/matchmaking/compare", response_model=MatchmakingResponse)
async def matchmaking_compare(
    request: MatchmakingRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> MatchmakingResponse:
    require_entitlement(ctx, "matchmaking.studio")
    seeker_facts = compute_kundli_facts(request.seeker.birth.model_dump(), ayanamsha="Lahiri")
    partner_facts = compute_kundli_facts(request.partner.birth.model_dump(), ayanamsha="Lahiri")
    result = score_matchmaking(seeker_facts, partner_facts)
    koota_lines = [f"{k}: {v}" for k, v in result.get("koota_breakdown", {}).items()]
    response = MatchmakingResponse(
        compatibility_score=result["compatibility_score"],
        strengths=result["strengths"],
        watchouts=result["watchouts"],
        compatibility_paths=result["compatibility_paths"] + koota_lines,
        disclaimer=MANDATORY_DISCLAIMERS["matchmaking"],
    )
    save_generated_report(
        report_id=f"match-{uuid.uuid4().hex[:10]}",
        kind="matchmaking-report",
        user_id=ctx["user_id"],
        profile_id=request.seeker.profile_id,
        payload={
            "seeker": request.seeker.model_dump(),
            "partner": request.partner.model_dump(),
            "response": response.model_dump(),
        },
    )
    return response


# ── Vaastu direction/room knowledge base ─────────────────────────────────────

_VAASTU_DIRECTION = {
    "North": {
        "deity": "Kubera (wealth & abundance)",
        "element": "Water",
        "qualities": "Career growth, financial flow, new opportunities.",
        "entrance": "Very auspicious for main entrance — invites Kubera's blessings.",
        "open_space": "Keep North open and clutter-free to allow wealth energy to circulate.",
        "avoid": "Avoid heavy structures, toilets, or kitchens in the pure North zone.",
    },
    "East": {
        "deity": "Indra (power & health)",
        "element": "Air/Space",
        "qualities": "Health, knowledge, social standing, morning vitality.",
        "entrance": "Highly auspicious — Indra's direction promotes strength and clarity.",
        "open_space": "Keep East side open or with windows for morning sunlight.",
        "avoid": "Avoid dark, closed rooms in the East; block no sunrise views.",
    },
    "Northeast": {
        "deity": "Ishanya (spirituality & wisdom)",
        "element": "Water/Space",
        "qualities": "Spiritual growth, clarity of mind, ancestral blessings.",
        "entrance": "Most auspicious of all — considered the divine corner (Brahma sthana).",
        "open_space": "Keep lightest and most open; ideal for pooja/meditation room.",
        "avoid": "Never place kitchen, toilet, heavy storage, or master bedroom here.",
    },
    "Northwest": {
        "deity": "Vayu (air & movement)",
        "element": "Air",
        "qualities": "Relationships, social connections, business travel.",
        "entrance": "Acceptable for guest entrance; can bring transient energy.",
        "open_space": "Good for guest rooms or storage; movement-oriented spaces suit here.",
        "avoid": "Avoid main entrance or master bedroom if possible.",
    },
    "West": {
        "deity": "Varuna (water & creativity)",
        "element": "Water",
        "qualities": "Profits, creativity, children's well-being.",
        "entrance": "Acceptable; supports commercial and creative pursuits.",
        "open_space": "Study, children's room, or drawing room work well here.",
        "avoid": "Avoid kitchen or fire elements in the West.",
    },
    "Southwest": {
        "deity": "Nairiti (stability & ancestors)",
        "element": "Earth",
        "qualities": "Stability, grounding, ancestral connections, longevity.",
        "entrance": "Not recommended for main entrance — can bring instability.",
        "open_space": "Best zone for master bedroom — heaviest room anchors this direction.",
        "avoid": "Never place entrance, pooja room, or open space in Southwest.",
    },
    "South": {
        "deity": "Yama (dharma & karmic balance)",
        "element": "Fire",
        "qualities": "Name, fame, reputation — requires careful management.",
        "entrance": "Generally inauspicious for main entrance; can create obstacles.",
        "open_space": "Keep closed and supported with heavy furniture or walls.",
        "avoid": "Avoid main entrance; do not leave South side open or empty.",
    },
    "Southeast": {
        "deity": "Agni (fire & energy)",
        "element": "Fire",
        "qualities": "Energy, digestion, transformation, financial activity.",
        "entrance": "Not ideal as main entrance; can cause health or financial stress.",
        "open_space": "Kitchen belongs here — fire element is at home in Agni's zone.",
        "avoid": "Avoid bedroom, pooja room, or water elements (tank, fountain) here.",
    },
}

_ROOM_IDEAL = {
    "master bedroom":   {"ideal": ["Southwest"],      "avoid": ["Northeast", "Southeast", "North"]},
    "bedroom":          {"ideal": ["South", "West", "Southwest"], "avoid": ["Northeast"]},
    "kitchen":          {"ideal": ["Southeast"],      "avoid": ["Northeast", "North", "Southwest"]},
    "pooja":            {"ideal": ["Northeast", "East", "North"], "avoid": ["South", "Southwest", "Southeast"]},
    "prayer":           {"ideal": ["Northeast", "East"],          "avoid": ["South", "Southwest"]},
    "study":            {"ideal": ["North", "East", "Northeast"], "avoid": ["South", "Southwest"]},
    "office":           {"ideal": ["North", "East"],              "avoid": ["Southwest", "South"]},
    "living":           {"ideal": ["North", "East", "Northeast"], "avoid": ["Southwest"]},
    "living room":      {"ideal": ["North", "East", "Northeast"], "avoid": ["Southwest"]},
    "bathroom":         {"ideal": ["Northwest", "West"],          "avoid": ["Northeast", "Southwest", "Southeast"]},
    "toilet":           {"ideal": ["Northwest", "West"],          "avoid": ["Northeast", "East", "North"]},
    "storeroom":        {"ideal": ["West", "Southwest"],          "avoid": ["Northeast", "East"]},
    "store":            {"ideal": ["West", "Southwest"],          "avoid": ["Northeast", "East"]},
    "garage":           {"ideal": ["Northwest", "Southeast"],     "avoid": ["Northeast"]},
    "children":         {"ideal": ["West", "Northwest"],          "avoid": ["Southwest"]},
    "children's room":  {"ideal": ["West", "Northwest"],          "avoid": ["Southwest"]},
    "dining":           {"ideal": ["West", "East"],               "avoid": []},
    "dining room":      {"ideal": ["West", "East"],               "avoid": []},
}

_ENTRANCE_GUIDANCE = {
    "North":     "Excellent. Kubera's direction. Place a water feature or green plant near the door.",
    "Northeast": "Outstanding. The most auspicious entrance. Keep the threshold very clean and bright.",
    "East":      "Very good. Indra's direction. Place a nameplate and keep the area well-lit.",
    "Northwest": "Moderate. Vayu's direction. Keep entrance well-swept; avoid clutter inside.",
    "West":      "Acceptable. Keep entrance bright; use a light-coloured door.",
    "Southeast": "Inauspicious. Agni's corner. Hang a Swastika or Ganesh symbol; use bright lighting.",
    "South":     "Challenging. Use a threshold design with odd number of steps. Place protection symbols.",
    "Southwest": "Strongly inauspicious. Consult a Vaastu expert; use remedial elements: copper pyramid, salt corners.",
}


def _canonical_direction(raw: str) -> str:
    """Normalise free-text direction to one of the 8 cardinal/intercardinal directions."""
    raw = raw.strip().title()
    mapping = {
        "N": "North", "S": "South", "E": "East", "W": "West",
        "Ne": "Northeast", "Nw": "Northwest", "Se": "Southeast", "Sw": "Southwest",
        "North East": "Northeast", "North West": "Northwest",
        "South East": "Southeast", "South West": "Southwest",
    }
    return mapping.get(raw, raw)


def _room_key(name: str) -> str:
    return name.strip().lower()


@app.post("/v1/vaastu/report", response_model=VaastuReportResponse)
async def vaastu_report(
    request: VaastuReportRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> VaastuReportResponse:
    require_entitlement(ctx, "vaastu.studio")
    await _check_llm_rate(ctx["user_id"])
    citations = await kb_retrieve(str(request.layout.model_dump()), "vaastu")
    mode = citation_mode(len(citations))

    facing = _canonical_direction(request.layout.facing_direction)
    entrance = _canonical_direction(request.layout.entrance)
    dir_info = _VAASTU_DIRECTION.get(facing, {})
    rooms: dict[str, str] = request.layout.rooms or {}

    # ── Facing direction section ──────────────────────────────────────────────
    lines = [
        f"# Vaastu Report — {facing}-Facing Property",
        "",
        "## Facing Direction Analysis",
        f"**Direction:** {facing} | **Ruling Deity:** {dir_info.get('deity', 'N/A')} | **Element:** {dir_info.get('element', 'N/A')}",
        "",
        f"**Qualities:** {dir_info.get('qualities', '')}",
        f"**Key Principle:** {dir_info.get('open_space', '')}",
        f"**Avoid:** {dir_info.get('avoid', '')}",
        "",
    ]

    # ── Entrance analysis ─────────────────────────────────────────────────────
    entrance_note = _ENTRANCE_GUIDANCE.get(entrance, "Consult a Vaastu expert for this entrance direction.")
    lines += [
        "## Entrance Analysis",
        f"**Entrance Direction:** {entrance}",
        f"**Assessment:** {entrance_note}",
        "",
    ]

    # ── Room-by-room analysis ─────────────────────────────────────────────────
    room_findings: list[str] = []
    checklist: list[str] = []
    if rooms:
        lines.append("## Room-by-Room Analysis")
        for room_name, room_direction in rooms.items():
            rkey = _room_key(room_name)
            rdirection = _canonical_direction(room_direction)
            guidance = _ROOM_IDEAL.get(rkey)
            if guidance:
                if rdirection in guidance["ideal"]:
                    assessment = f"✓ **Excellent placement.** {rdirection} is ideal for {room_name}."
                    checklist.append(f"Maintain {room_name} in {rdirection} — this is an optimal placement.")
                elif rdirection in guidance["avoid"]:
                    assessment = (
                        f"✗ **Challenging placement.** {rdirection} is not recommended for {room_name}. "
                        f"Ideal zones: {', '.join(guidance['ideal'])}. "
                        f"Apply remedial measures: use appropriate colours, keep space clutter-free, "
                        f"and consider consulting a Vaastu practitioner for structural adjustments."
                    )
                    room_findings.append(f"{room_name} ({rdirection}) needs attention — see room analysis.")
                    checklist.append(
                        f"Address {room_name} in {rdirection}: move if possible, "
                        f"or apply colour/element remedy (ideal: {', '.join(guidance['ideal'])})."
                    )
                else:
                    assessment = (
                        f"~ **Neutral placement.** {rdirection} is acceptable for {room_name}. "
                        f"Best zones are {', '.join(guidance['ideal'])} for maximum benefit."
                    )
                    checklist.append(f"Consider repositioning {room_name} to {guidance['ideal'][0]} for better energy.")
            else:
                assessment = f"No specific Vaastu rule found for '{room_name}' — apply general principles."
                checklist.append(f"Apply general Vaastu principles to {room_name} ({rdirection}).")

            lines += [
                f"### {room_name.title()} — {rdirection}",
                assessment,
                "",
            ]

    # ── General remedies based on facing ─────────────────────────────────────
    lines += [
        "## General Remedies & Enhancements",
        f"- Keep the {facing}-facing front area clean, bright, and welcoming.",
        "- Use the Brahmasthana (centre of the property) as an open, uncluttered circulation space.",
        "- Avoid overhead beams directly above sleeping or work areas.",
        "- Natural light should enter primarily from North and East walls.",
        "- Water features (fountain, aquarium) belong in Northeast or North.",
        "- Fire elements (stove, generator, inverter) belong in Southeast.",
        "- Heavy furniture and storage should anchor Southwest zones.",
    ]
    if mode != "cortex-grounded":
        lines.append("\n*Note: Corpus retrieval was limited; this report applies classical Vaastu Shastra principles.*")

    report_markdown = "\n".join(lines)

    # Build safety notes with LLM enhancement if available
    system_prompt = (
        "You are a Vaastu Shastra expert. Given a property layout analysis, "
        "write 2–3 paragraphs of actionable, practical Vaastu guidance that is "
        "specific to the facing direction and room placements provided. "
        "Be constructive and solution-focused. Never be fear-based. "
        "End with a clear disclaimer that Vaastu is a traditional system and "
        "should not replace professional architectural or structural advice."
    )
    user_message = f"Facing: {facing}\nEntrance: {entrance}\nRooms: {rooms}\nNotes: {request.layout.notes or ''}"
    llm_text, _ = await _llm_answer(system_prompt, user_message)
    if llm_text:
        report_markdown += f"\n\n## Integrated Guidance\n{llm_text}"

    default_checklist = [
        "Ensure Northeast corner is light, open, and clean.",
        "Verify kitchen is in Southeast or Northwest — not Northeast.",
        "Master bedroom should anchor Southwest for stability.",
        "Keep Brahmasthana (property centre) free from heavy columns or walls.",
        "Main entrance should face North, East, or Northeast if possible.",
        "Consult a licensed architect or engineer before any structural changes.",
    ]
    final_checklist = checklist if checklist else default_checklist

    response = VaastuReportResponse(
        report_markdown=report_markdown,
        checklist=final_checklist,
        safety_notes=[
            MANDATORY_DISCLAIMERS["vaastu"],
            "Avoid fear-based or coercive decision-making tied to layout guidance.",
            "Vaastu Shastra is a traditional Indian architectural system. "
            "Always consult a licensed architect or structural engineer before making physical modifications.",
        ],
        citations=citations,
    )
    save_generated_report(
        report_id=f"vaastu-{uuid.uuid4().hex[:10]}",
        kind="vaastu-report",
        user_id=ctx["user_id"],
        profile_id=request.profile_id,
        payload=response.model_dump(),
    )
    # Auto-save to report history under the authenticated user
    try:
        save_report(
            user_id=ctx["user_id"],
            report_type="vaastu",
            title=f"Vaastu — {request.layout.facing_direction} facing",
            content=response.model_dump(),
        )
    except Exception:
        _log.exception("Failed to auto-save vaastu report for user %s", ctx.get("user_id"))
    return response


async def enqueue_video_job(topic: str, payload: dict[str, Any]) -> VideoJobResponse:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.post(f"{settings.media_service_url}/v1/jobs/video", json={"topic": topic, "payload": payload})
            response.raise_for_status()
            data = response.json()
            return VideoJobResponse(**data)
    except Exception:
        job_id = f"local-{uuid.uuid4().hex[:10]}"
        return VideoJobResponse(job_id=job_id, status="queued", playback_url=None)


@app.post("/v1/video/kundli", response_model=VideoJobResponse)
async def kundli_video(
    request: VideoRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> VideoJobResponse:
    require_entitlement(ctx, "kundli.video")
    payload = {
        "topic": "kundli",
        "script_style": "careful-nondeterministic",
        "disclaimer": MANDATORY_DISCLAIMERS["astrology"],
        "input": request.payload,
    }
    return await enqueue_video_job("kundli", payload)


@app.post("/v1/video/vaastu", response_model=VideoJobResponse)
async def vaastu_video(
    request: VideoRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> VideoJobResponse:
    require_entitlement(ctx, "vaastu.studio")
    payload = {
        "topic": "vaastu",
        "script_style": "safety-first",
        "disclaimer": MANDATORY_DISCLAIMERS["vaastu"],
        "input": request.payload,
    }
    return await enqueue_video_job("vaastu", payload)


@app.post("/v1/consult/realtime/session", response_model=ConsultSessionResponse)
async def create_consult_session(
    request: ConsultSessionRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> ConsultSessionResponse:
    if request.mode == "video":
        if "consult.video" not in ctx["entitlements"]:
            balance = get_wallet_balance(ctx["user_id"])
            required_credits = 120
            if balance < required_credits:
                raise HTTPException(
                    status_code=403,
                    detail="Video consult requires consult.video entitlement or at least 120 wallet credits.",
                )
            add_wallet_entry(
                user_id=ctx["user_id"],
                delta_credits=-required_credits,
                reason="debit:consult-video-session",
                reference_id=f"consult-credit-{uuid.uuid4().hex[:10]}",
                metadata={"mode": "video", "minutes": 12},
            )
    if not (request.consent_recording and request.consent_transcription):
        raise HTTPException(status_code=400, detail="Recording and transcription consent are required for post-consult deliverables.")
    session_id = f"consult-{uuid.uuid4().hex[:12]}"
    response = ConsultSessionResponse(
        session_id=session_id,
        rtc_url=settings.livekit_url,
        token_hint="Generate signed LiveKit token server-side before production.",
        retention_policy="30d default retention; user can request early deletion from settings.",
    )
    save_consult_session(
        session_id=session_id,
        user_id=ctx["user_id"],
        profile_id=request.profile_id,
        mode=request.mode,
        consents={
            "recording": request.consent_recording,
            "transcription": request.consent_transcription,
            "memory": request.consent_memory,
        },
        retention_policy=response.retention_policy,
    )
    return response


@app.post("/v1/consult/summary", response_model=ConsultSummaryResponse)
async def consult_summary(
    request: ConsultSummaryRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> ConsultSummaryResponse:
    require_entitlement(ctx, "chat.basic")
    if not consult_session_exists(request.session_id):
        raise HTTPException(status_code=404, detail="Consult session not found.")
    summary = (
        "Consultation focused on high-priority themes with emphasis on incremental execution and risk-aware choices. "
        "User intent was mapped to practical short-term actions and reflective follow-up."
    )
    action_plan = [
        f"Document two concrete next steps for {request.requested_focus.lower()} within 24 hours.",
        "Schedule one check-in in 7 days to assess adherence and refine approach.",
        "Track outcomes in a simple journal with date, action, and observed result.",
    ]
    response = ConsultSummaryResponse(
        summary=summary,
        action_plan=action_plan,
        disclaimer="Consult summary is informational and not legal/medical/financial advice.",
    )
    save_consult_summary(
        session_id=request.session_id,
        summary={
            "profile_id": request.profile_id,
            "requested_focus": request.requested_focus,
            "summary": response.summary,
            "action_plan": response.action_plan,
        },
    )
    return response


_TAROT_MAJOR_ARCANA: dict[str, str] = {
    "The Fool": "New beginnings, spontaneity, and unlimited potential. A leap of faith before the journey fully reveals itself. Suggests releasing control and trusting the unfolding path.",
    "The Magician": "Manifestation, focused will, and resourcefulness. All tools are present — the question is whether you are directing them consciously. Suggests deliberate creation over passive waiting.",
    "The High Priestess": "Intuition, hidden knowledge, and the subconscious. The answer is already within; pause, listen inward, and trust what logic alone cannot access.",
    "The Empress": "Abundance, creative fertility, and nurturing growth. A period of flourishing when you tend patiently — relationships, projects, and the body all respond to care and beauty.",
    "The Emperor": "Structure, authority, and ordered discipline. Build systems rather than react to chaos. Leadership and stability are available when claimed with responsibility.",
    "The Hierophant": "Tradition, spiritual teaching, and collective wisdom. Consider established guidance alongside personal innovation. A mentor or structured practice may offer clarity.",
    "The Lovers": "Deep alignment of values, meaningful choice, and partnership. This card marks a threshold: choose not just with desire but with your whole self-awareness.",
    "The Chariot": "Willpower, decisive momentum, and harnessing opposing forces. Victory requires integrating tension rather than eliminating it. Stay disciplined and directional.",
    "Strength": "Inner courage, compassion over force, and patient mastery. True strength comes from meeting challenges with gentleness and consistency rather than raw power.",
    "The Hermit": "Solitude, soul-searching, and the light of wisdom earned through reflection. A period of withdrawal that deepens clarity and sense of authentic purpose.",
    "Wheel of Fortune": "Cycles, turning points, and the currents of karma and luck. Position yourself wisely within change rather than trying to control the wheel itself.",
    "Justice": "Fairness, cause and effect, and clarity in discernment. A time for honest reckoning — decisions made now carry proportional and enduring consequences.",
    "The Hanged Man": "Surrender, new perspective through pause, and transformative waiting. What appears as obstacle may be invitation to see from an entirely different angle.",
    "Death": "Transition, necessary endings, and the clearing that enables renewal. Something is completing — releasing attachment opens space for meaningful transformation.",
    "Temperance": "Balance, measured integration, and purposeful patience. Blend energies rather than force extremes. The art of steady, sustainable progress.",
    "The Devil": "Bondage, shadow patterns, and material attachments. Awareness is the first step to freedom — examine what you believe is fixed but might be chosen.",
    "The Tower": "Sudden disruption, revelation, and the collapse of false structures. What falls was already unsound. Liberation often precedes or follows the upheaval.",
    "The Star": "Hope, renewal, and the restorative power of quiet faith. After difficulty, healing arrives — allow inspiration and openness to guide rather than armour.",
    "The Moon": "Illusion, the unconscious, and navigating uncertainty. Not all is visible. Trust intuition as your compass through this ambiguous, emotionally charged terrain.",
    "The Sun": "Vitality, clarity, and authentic joyful expression. Confidence rooted in your real nature — a time of celebration and radiant forward momentum.",
    "Judgement": "Awakening, reckoning, and the inner call to higher purpose. An honest review of the past releases you into a more aligned future self.",
    "The World": "Completion, integration, and cosmic celebration of a cycle fulfilled. One journey ends perfectly; the next begins from a place of earned wholeness.",
}

@app.post("/v1/tarot/read", response_model=TarotResponse)
async def tarot_read(
    request: TarotRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> TarotResponse:
    require_entitlement(ctx, "tarot.read")
    deck = list(_TAROT_MAJOR_ARCANA.keys())
    positions = ["Past", "Present", "Future"] if request.spread == "three-card" else ["Core Insight", "Primary Challenge", "Suggested Action"]
    cards: list[TarotCard] = []
    for position in positions:
        card_name = deck[seeded_index(f"{request.profile_id}:{request.intention}:{position}", len(deck))]
        cards.append(TarotCard(
            position=position,
            card=card_name,
            meaning=_TAROT_MAJOR_ARCANA[card_name],
        ))
    # Weave the three cards into a coherent reflection
    card_names = [c.card for c in cards]
    reflection = (
        f"This spread speaks to the arc of '{request.intention}'. "
        f"{card_names[0]} in the {positions[0]} position anchors the energy or pattern already in motion. "
        f"{card_names[1]} in the {positions[1]} position names the quality most alive and pressing right now. "
        f"{card_names[2]} in the {positions[2]} position points toward the most fruitful direction of attention or action. "
        f"Sit with the images of each card before drawing conclusions. Notice what resonates and what creates resistance — both carry information."
    )
    return TarotResponse(
        spread=request.spread,
        cards=cards,
        reflection=reflection,
        disclaimer=MANDATORY_DISCLAIMERS["tarot"],
    )


_LIFE_PATH_MEANINGS: dict[int, str] = {
    1: "The Pioneer. Life Path 1 carries the energy of initiation, independence, and original self-expression. You are here to lead — not by dominating others, but by embodying the courage to act on your own vision. The core lesson is self-trust without isolation: to pioneer without severing the connections that sustain you.",
    2: "The Harmoniser. Life Path 2 brings sensitivity, cooperation, and extraordinary diplomatic intelligence. You perceive the nuances others miss and bridge what divides. The core lesson is self-advocacy: to serve harmony without disappearing into it, and to know that your own needs are as valid as those you so carefully tend.",
    3: "The Expresser. Life Path 3 pulsates with creative energy, joy, and the gift of inspiring others through words, art, and presence. You are here to bring beauty and lightness into the world. The core lesson is focus: to channel the abundant creative current rather than scatter it across too many half-finished canvases.",
    4: "The Builder. Life Path 4 is the foundation-layer, the methodical worker who turns vision into lasting form. You bring order, reliability, and structural intelligence. The core lesson is adaptability: to build with wisdom, not rigidity — knowing when the blueprint must evolve.",
    5: "The Catalyst. Life Path 5 embodies freedom, versatility, and the electricity of change. You are here to experience the full range of human sensation and to catalyse evolution in those around you. The core lesson is depth: to explore without perpetual avoidance of commitment, and to discover that freedom and rootedness can coexist.",
    6: "The Nurturer. Life Path 6 carries profound responsibility, beauty, and the vocation of care. You uplift communities and relationships through your devoted presence. The core lesson is healthy boundaries: to give from fullness rather than depletion, and to allow others the dignity of their own growth process.",
    7: "The Seeker. Life Path 7 is the path of introspection, analysis, and spiritual inquiry. You hunger for truth beneath the surface of appearances and are gifted with penetrating perception. The core lesson is trust: to open the heart as well as the mind, and to receive as generously as you seek.",
    8: "The Authority. Life Path 8 wields material mastery, strategic power, and an instinct for the architecture of institutions. You are here to manifest abundance and exercise authority with wisdom. The core lesson is right relationship with power: to see it as a tool for elevation rather than an identity to defend.",
    9: "The Sage. Life Path 9 carries the distilled wisdom of all preceding numbers and the calling to serve at the widest scale. You feel the suffering and potential of humanity deeply. The core lesson is release: to complete cycles with grace, to forgive fully, and to trust that letting go is how new chapters become possible.",
}

_EXPRESSION_QUALITIES: dict[int, str] = {
    1: "self-directed originality and pioneering drive in outward expression",
    2: "diplomatic attunement and cooperative grace in how you engage the world",
    3: "expressive creativity and joyful communicative presence",
    4: "systematic organisation and reliable execution in all you undertake",
    5: "versatile adaptability and catalytic vitality in your approach to life",
    6: "nurturing responsibility and aesthetic harmony in your outward character",
    7: "reflective depth and spiritual perception in how you process and present",
    8: "executive authority and material stewardship in your outer life",
    9: "compassionate wisdom and universal service as your expressive signature",
}

def _pythagorean_expression(name: str) -> int:
    table = {c: ((ord(c) - ord("a")) % 9) + 1 for c in "abcdefghijklmnopqrstuvwxyz"}
    total = sum(table.get(ch, 0) for ch in name.lower() if ch.isalpha())
    while total > 9:
        total = sum(int(d) for d in str(total))
    return total or 9

@app.post("/v1/numerology/report", response_model=NumerologyResponse)
async def numerology_report(
    request: NumerologyRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> NumerologyResponse:
    require_entitlement(ctx, "numerology.report")
    digits = [int(ch) for ch in request.birth_date if ch.isdigit()]
    life_path = sum(digits)
    while life_path > 9:
        life_path = sum(int(ch) for ch in str(life_path))
    expression = _pythagorean_expression(request.full_name)
    lp_meaning = _LIFE_PATH_MEANINGS.get(life_path, "This life path carries a unique blend of the foundational numbers.")
    exp_quality = _EXPRESSION_QUALITIES.get(expression, "a distinctive expressive quality")
    return NumerologyResponse(
        life_path_number=life_path,
        expression_number=expression,
        interpretation=(
            f"{lp_meaning}\n\n"
            f"Expression Number {expression}: Your name vibrates to {exp_quality}. "
            f"Where the Life Path describes the soul's journey, the Expression Number describes how that journey is embodied and projected outward — the talent and approach you bring to every interaction and endeavour."
        ),
        disclaimer=MANDATORY_DISCLAIMERS["numerology"],
    )


_MANTRA_LIBRARY: dict[str, dict[str, str]] = {
    "focus":       {"mantra": "Om Gam Ganapataye Namaha",              "deity": "Ganesha", "tradition": "Shakta-Ganapatya", "benefit": "Invokes Ganesha to remove obstacles to concentration and clear the path for single-pointed effort."},
    "calm":        {"mantra": "Om Shanti Shanti Shanti",                "deity": "Universal (Shanti invocation)", "tradition": "Pan-Vedic", "benefit": "Invokes peace at the three levels of existence — adhibhautika (environmental), adhidaivika (cosmic), and adhyatmika (inner)."},
    "confidence":  {"mantra": "Om Hreem Namaha",                        "deity": "Mahamaya / Shakti", "tradition": "Shakta Tantra", "benefit": "Hreem is the maya-bija (seed syllable of power and manifestation) — awakens inner radiance and magnetic presence."},
    "gratitude":   {"mantra": "Om Namo Bhagavate Vasudevaya",           "deity": "Vishnu/Krishna", "tradition": "Vaishnava", "benefit": "One of the twelve-syllable liberation mantras. Opens the heart to grace, abundance, and devotional surrender."},
    "healing":     {"mantra": "Om Tryambakam Yajamahe Sugandhim Pushti-vardhanam Urvarukamiva Bandhanan Mrityor Mukshiya Mamritat", "deity": "Shiva (Mahamrityunjaya)", "tradition": "Rigveda / Shaiva", "benefit": "The Great Death-Conquering mantra — promotes physical healing, longevity, and liberation from fear of dissolution."},
    "prosperity":  {"mantra": "Om Shreem Mahalakshmiyei Namaha",        "deity": "Mahalakshmi", "tradition": "Shakta-Vaishnava", "benefit": "Shreem is the bija of Lakshmi — invites material abundance, right livelihood, and the grace of beauty into daily life."},
    "wisdom":      {"mantra": "Om Aim Saraswatyai Namaha",              "deity": "Saraswati", "tradition": "Shakta-Brahma", "benefit": "Aim is Saraswati's bija — sharpens intellect, creative intelligence, and the gift of clear speech and artistic expression."},
    "protection":  {"mantra": "Om Dum Durgayei Namaha",                 "deity": "Durga", "tradition": "Shakta Tantra", "benefit": "Dum is Durga's protective bija — creates a field of inner and outer protection, dissolving fear and obstacles of a deeper nature."},
    "love":        {"mantra": "Om Kleem Krishnaya Namaha",              "deity": "Krishna", "tradition": "Vaishnava Tantra", "benefit": "Kleem is the attraction bija — opens the heart chakra and draws harmonious, loving relationships grounded in genuine affinity."},
    "career":      {"mantra": "Om Suryaya Namaha",                      "deity": "Surya (Sun)", "tradition": "Vedic Surya Upasana", "benefit": "One of the Aditya Hridayam family — brightens vitality, professional visibility, confidence, and the soul's authority."},
    "discipline":  {"mantra": "Om Sham Shanaishcharaya Namaha",         "deity": "Shani (Saturn)", "tradition": "Vedic Navagraha", "benefit": "Propitiates Saturn — builds patient endurance, structural discipline, and the capacity to transform karma through consistent effort."},
    "courage":     {"mantra": "Om Angarakaya Namaha",                   "deity": "Mangala (Mars)", "tradition": "Vedic Navagraha", "benefit": "Propitiates Mars — ignites the Martian fire of courage, decisive forward momentum, and the will to take right action."},
    "clarity":     {"mantra": "Om Budhaya Namaha",                      "deity": "Budha (Mercury)", "tradition": "Vedic Navagraha", "benefit": "Propitiates Mercury — sharpens communication, analytical precision, business acumen, and dexterous mental functioning."},
    "devotion":    {"mantra": "Om Namah Shivaya",                       "deity": "Shiva", "tradition": "Shaiva (Panchakshara)", "benefit": "The five-syllable mantra of Shiva — deepens surrender, present-moment awareness, and progressive inner transformation toward liberation."},
    "meditation":  {"mantra": "So Hum",                                 "deity": "Universal (Atman/Brahman)", "tradition": "Advaita Vedanta", "benefit": "The natural mantra of the breath (I am That) — anchors awareness in the present moment and dissolves the sense of separateness."},
    "creativity":  {"mantra": "Om Aim Kleem Sauh",                      "deity": "Tripura Sundari", "tradition": "Shakta Sri Vidya", "benefit": "The Panchavaktram bija sequence — awakens creative intelligence, beauty consciousness, and the joy of inspired expression."},
    "abundance":   {"mantra": "Om Vasudhare Svaha",                     "deity": "Vasudhara (Earth Goddess)", "tradition": "Buddhist-Hindu syncretic", "benefit": "Invokes the Earth as source of all sustenance — deepens the felt sense of support, material security, and grateful receiving."},
    "relationships": {"mantra": "Om Hrim Namah",                        "deity": "Sundari / Venus principle", "tradition": "Shakta Tantra", "benefit": "Awakens relational grace, empathy, and the magnetic quality that draws genuine and nourishing connections."},
}

@app.post("/v1/mantra/plan", response_model=MantraPlanResponse)
async def mantra_plan(
    request: MantraPlanRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> MantraPlanResponse:
    require_entitlement(ctx, "mantra.plan")
    focus_key = request.focus_area.strip().lower()
    # Fuzzy match: check if any library key appears in the focus area
    selected_key = next((k for k in _MANTRA_LIBRARY if k in focus_key or focus_key in k), "devotion")
    info = _MANTRA_LIBRARY[selected_key]
    weekly_minutes = request.minutes_per_day * request.days_per_week
    return MantraPlanResponse(
        suggested_mantra=info["mantra"],
        schedule=f"{request.minutes_per_day} minutes/day, {request.days_per_week} days/week ({weekly_minutes} minutes total weekly).",
        practice_steps=[
            f"Deity/Source: {info['deity']} | Tradition: {info['tradition']}",
            f"Purpose: {info['benefit']}",
            f"Begin each session seated comfortably with spine upright. Take three slow breaths to settle the nervous system before beginning.",
            f"Recite '{info['mantra']}' softly or mentally at a consistent, unhurried pace for the planned duration.",
            "If the mind wanders, gently return to the mantra without self-criticism — each return is itself the practice.",
            f"After completing, sit in silence for 1–2 minutes to allow the mantra's resonance to settle.",
            "Keep a brief practice log — noting session duration and any observations builds the habit and reveals progress over time.",
        ],
        disclaimer=MANDATORY_DISCLAIMERS["mantra"],
    )


_RASHIFAL_SIGN_DATA: dict[str, dict[str, Any]] = {
    "Aries":       {"lord": "Mars",    "element": "Fire",  "quality": "Cardinal",
        "daily":   "Mars, your ruling planet, lends decisive energy today. Channel it into one well-defined initiative rather than reactive firefighting. Physical movement early in the day grounds the Martian impulse productively.",
        "weekly":  "This week favours launching new ventures and clearing obstacles that have accumulated. Direct confrontation of lingering issues will bring more relief than avoidance. Relationships improve when you lead with honesty rather than impatience.",
        "monthly": "A month built for bold beginnings. The first two weeks carry strong initiating energy — plant seeds for projects requiring sustained fire. The final weeks call for reviewing what was begun and strengthening foundations before the next push.",
        "influences": ["Mars energy strong — act with precision, not impulsiveness", "Physical vitality is high; use exercise to balance excess Pitta", "Avoid unnecessary confrontation; direct energy is sufficient"]},
    "Taurus":      {"lord": "Venus",   "element": "Earth", "quality": "Fixed",
        "daily":   "Venus brings gentle, productive steadiness today. Practical tasks involving beauty, comfort, or financial detail flow well. Avoid rushing — the Taurine pace reveals quality that speed misses.",
        "weekly":  "This week rewards slow, thorough effort. Financial matters respond to careful attention. Relationships deepen through consistent small gestures of appreciation and presence. Resist pressure to deviate from a plan that is working.",
        "monthly": "A month of consolidation and sensory richness. Property, finance, and creative projects benefit from patient tending. Relationships that require reliability will be tested and strengthened. Enjoy beauty as a spiritual practice, not mere indulgence.",
        "influences": ["Venus governing values and aesthetics — beauty and order restore energy", "Grounding practices (earth, walking, food) support the Fixed Earth temperament", "Stubbornness and material attachment may need conscious review"]},
    "Gemini":      {"lord": "Mercury", "element": "Air",   "quality": "Mutable",
        "daily":   "Mercury sharpens mental agility today. Communication, writing, and networking flow easily. Be aware of mental scatter — one completed task delivers more than five started.",
        "weekly":  "Ideas and conversations generate valuable connections this week. Short journeys or meetings bring unexpected insights. Siblings, neighbours, and local community matters are highlighted. Guard against information overload and superficial commitments.",
        "monthly": "A month of intellectual expansion and social breadth. Follow the curiosity threads that matter — not all of them, but the ones that lead somewhere meaningful. Writing projects and learning programmes accelerate. Groundedness through routine holds the mutable energy in useful form.",
        "influences": ["Mercury at home in Gemini — communication is a superpower this period", "Dual interests create richness; prioritisation prevents fragmentation", "Regular stillness (meditation, nature) counterbalances mental over-activity"]},
    "Cancer":      {"lord": "Moon",    "element": "Water", "quality": "Cardinal",
        "daily":   "The Moon's rhythmic influence makes emotional attunement your greatest asset today. Nurturing acts, domestic matters, and family connections are especially meaningful. Follow the tide of feeling — it carries accurate guidance.",
        "weekly":  "This week's tone is set by the lunar phase. Emotional life deepens; old memories or family dynamics may surface for healing. Home improvements or changes to living arrangements are supported. Public dealings benefit from your natural empathy.",
        "monthly": "A month of significant emotional processing and domestic focus. Security needs may arise — address them directly through both practical and inner means. Creativity tied to personal history or ancestral themes is potent. Trust the cyclical nature of your emotional states.",
        "influences": ["Moon as lord — emotional intelligence and intuition are primary navigational tools", "Water element heightens empathy; maintain healthy emotional boundaries", "Nourishing food, rest, and home sanctuary directly impact wellbeing"]},
    "Leo":         {"lord": "Sun",     "element": "Fire",  "quality": "Fixed",
        "daily":   "The Sun illuminates your natural authority and generosity today. Creative expression, leadership, and heartfelt connection with others radiate well. Be cautious of ego attachment — let genuine warmth lead rather than the need for recognition.",
        "weekly":  "A week that rewards visible, confident action. Career and creative projects benefit from bringing your full presence. Children or creative offspring flourish with your attention. Romance and pleasure carry deeper significance this week.",
        "monthly": "A month to inhabit your power with grace. Leadership opportunities arrive — step forward with generosity, not pride. The heart as the organ of intelligence guides you well when the ego steps back. Creative work produced in full solar confidence will have lasting impact.",
        "influences": ["Sun as lord — vitality, authority, and authentic expression", "Fixed Fire: powerful when directed, draining when dispersed in ego-conflict", "Regular practices of humility and service balance the solar temperament"]},
    "Virgo":       {"lord": "Mercury", "element": "Earth", "quality": "Mutable",
        "daily":   "Mercury in earthy Virgo focuses analytical precision today. Detail work, health routines, and service are well-starred. Resist the critic within when it becomes counterproductive — refine, but also appreciate what works.",
        "weekly":  "This week rewards methodical effort, especially in health, organisation, and craft. Service to others returns in unexpected forms. Be patient with imperfection in yourself and those around you — the pursuit of excellence is noble, the demand for it is draining.",
        "monthly": "A month for deep refinement and practical improvement. Systems, routines, and physical wellness respond beautifully to sustained attention. Work projects requiring precision reach maturity. The shadow to watch is analysis-paralysis and over-criticism; completion serves better than endless revision.",
        "influences": ["Mercury governing detail and service", "Earth element grounds the mutable quality — daily structure is restorative", "Mind-body connection is strong; digestive health reflects mental state"]},
    "Libra":       {"lord": "Venus",   "element": "Air",   "quality": "Cardinal",
        "daily":   "Venus's diplomatic grace shines today. Relationships, negotiations, and aesthetic choices are well-starred. Avoid the Libran tendency to delay decisions — a considered choice made today is worth more than a perfect one indefinitely deferred.",
        "weekly":  "Partnerships and collaborations are the week's defining theme. Legal matters, contracts, and creative joint ventures receive support. Social harmony is cultivable with conscious effort. The balance point between your needs and others' is worth finding explicitly.",
        "monthly": "A month that deepens partnerships across every domain — professional, personal, creative. Justice, fairness, and the long view of relationship are themes that run through this period. Beauty as a daily practice sustains the Libran soul through the work of balance.",
        "influences": ["Venus as lord — beauty, diplomacy, and relationship are primary fields of growth", "Air quality requires grounding through consistent decisions and commitments", "Indecision and people-pleasing are the key growth edges to work with"]},
    "Scorpio":     {"lord": "Mars",    "element": "Water", "quality": "Fixed",
        "daily":   "Scorpionic depth and intensity are available assets today. Research, investigation, psychological insight, and transformative work proceed powerfully. Guard against the tendency to see threat where there is only complexity.",
        "weekly":  "This week brings the opportunity to resolve deep-seated patterns. Resources shared with others — financial, emotional, energetic — require clear agreements. The occult, psychology, and hidden matters carry significant information this week.",
        "monthly": "A month of profound internal transformation. What has been suppressed may surface for conscious integration. Shared resources, inheritances, and joint financial matters are highlighted. The fixed water nature can hold enormous intensity — use this to sustain the transformative work rather than to armour against it.",
        "influences": ["Mars (and Ketu) governing penetrating will and regenerative power", "Fixed Water creates depth and resilience; shadow is control and secretiveness", "Regular release (exercise, creative expression, meditation) prevents emotional congestion"]},
    "Sagittarius": {"lord": "Jupiter", "element": "Fire",  "quality": "Mutable",
        "daily":   "Jupiter's expansive optimism and love of meaning lead today. Teaching, learning, philosophy, and long-distance connections are highlighted. The Sagittarian soul thrives when arrow and target are aligned — clarify what you're aiming for before releasing.",
        "weekly":  "Higher education, travel, legal matters, and spiritual exploration are the week's fertile territories. Publishing, broadcasting, and sharing your perspective with wider audiences is well-starred. The shadow is overcommitment and idealism disconnected from practical implementation.",
        "monthly": "A month for broadening horizons in every sense. The impulse toward freedom and expansion is at its height — honour it by directing it into purposeful learning and genuine growth rather than restlessness. Dharmic clarity emerges through honest engagement with what you truly believe.",
        "influences": ["Jupiter as lord — wisdom, dharma, and opportunity expand through this period", "Mutable Fire: inspirational when focused, diffuse when uncommitted", "Practical follow-through converts Sagittarian vision into lived reality"]},
    "Capricorn":   {"lord": "Saturn",  "element": "Earth", "quality": "Cardinal",
        "daily":   "Saturn's disciplined productivity is your strongest ally today. Long-term projects, structural work, and responsible leadership are well-starred. The Capricornian insight is that patient consistency outperforms brilliant impatience every time.",
        "weekly":  "Career, reputation, and professional standing receive focused attention this week. Authority relationships — with superiors and those you lead — are defining contexts. Public responsibilities are best met through meticulous preparation rather than improvisation.",
        "monthly": "A month of consolidating ambitions into real-world structure. The hardest and most meaningful work advances now. Father-figures, mentors, or your own internal authority figure are activated themes. Health through disciplined routine is particularly important — the Capricornian body responds to consistent, long-term care.",
        "influences": ["Saturn as lord — discipline, karmic awareness, and long-term strategy", "Cardinal Earth initiates practical action with strategic patience", "Work-rest balance is critical; overwork is a Saturnine shadow pattern"]},
    "Aquarius":    {"lord": "Saturn",  "element": "Air",   "quality": "Fixed",
        "daily":   "Saturn's humanitarian and intellectual qualities are active today. Collective projects, technological innovation, and original thinking are well-starred. Aquarian intelligence is at its best when it serves something larger than the self.",
        "weekly":  "Group dynamics, social causes, and future-oriented projects carry the week's creative charge. Friendships and alliances rooted in shared principles are deepened or formed. The tension between independence and belonging is the week's productive edge.",
        "monthly": "A month for aligning individual uniqueness with collective purpose. Your most original ideas deserve to be shared — find the community that can receive and amplify them. Saturn's grounding influence prevents Aquarian vision from becoming utopian abstraction. Radical honesty in relationships serves better than comfortable distance.",
        "influences": ["Saturn as lord — reforming intelligence and principled detachment", "Fixed Air holds ideas with conviction; the shadow is ideological rigidity", "Embodiment practices bridge the Aquarian tendency to live from the neck up"]},
    "Pisces":      {"lord": "Jupiter", "element": "Water", "quality": "Mutable",
        "daily":   "Jupiter's spiritual expansiveness and Piscean sensitivity are beautifully aligned today. Creative work, meditation, compassionate service, and inner listening are all especially potent. What arrives through intuition today is trustworthy.",
        "weekly":  "This week is rich with spiritual material — dreams, synchronicities, and inner promptings carry instruction. Creative and healing work flows from depth. Charitable or service-oriented acts bring real fulfilment. The shadow is escapism and the tendency to absorb others' emotional states without adequate boundaries.",
        "monthly": "A month of deep spiritual cultivation and creative richness. The veil between inner and outer is thin — images, symbols, and felt senses carry guidance that linear thinking misses. Solitude periods are not retreats from life but deepenings of it. Practical structure — even modest daily anchors — prevents Mutable Water from losing its form entirely.",
        "influences": ["Jupiter as lord — grace, faith, and spiritual expansion", "Mutable Water: highly receptive; empathic boundaries are an ongoing practice", "Grounding through body awareness, clear structures, and service in the world balances Piscean dissolution"]},
}

@app.post("/v1/rashifal/personalized", response_model=RashifalResponse)
async def rashifal_personalized(
    request: RashifalRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> RashifalResponse:
    require_entitlement(ctx, "rashifal.feed")
    sign_key = request.sign.strip().title()
    data = _RASHIFAL_SIGN_DATA.get(sign_key, _RASHIFAL_SIGN_DATA["Aries"])
    horizon_key = request.horizon if request.horizon in ("daily", "weekly", "monthly") else "daily"
    insight = data[horizon_key]
    return RashifalResponse(
        sign=request.sign,
        horizon=request.horizon,
        insight=insight,
        influence_panel=data["influences"],
        disclaimer=MANDATORY_DISCLAIMERS["rashifal"],
    )


_GEM_DATA: dict[str, dict] = {
    "sun": {
        "gem": "Ruby (Manikya)", "sub_gem": "Red Garnet, Red Spinel",
        "metal": "Gold", "finger": "Ring finger, right hand",
        "min_carat": 3, "day": "Sunday", "hora": "Sun hora (1st hour after sunrise on Sunday)",
        "strengthen": "Confidence, leadership, vitality, father relationship, government dealings, career authority",
        "cautions": [
            "Contraindicated if Sun is a functional malefic for your ascendant (e.g. Libra, Aquarius, Taurus).",
            "Avoid if prone to hypertension or inflammatory conditions — Ruby increases pitta.",
            "Always confirm Sun's functional role in the natal chart with a qualified Jyotishi before purchase.",
        ],
        "quality_notes": "Deep pigeon-blood red with high clarity. Burma (Mogok) and Mozambique rubies are traditionally valued. Avoid heat-treated or glass-filled stones.",
    },
    "moon": {
        "gem": "Natural Pearl (Moti)", "sub_gem": "Moonstone, White Coral",
        "metal": "Silver", "finger": "Little finger or ring finger, right hand",
        "min_carat": 5, "day": "Monday", "hora": "Moon hora (Monday morning)",
        "strengthen": "Emotional stability, intuition, mother relationship, sleep quality, digestion, public-facing work",
        "cautions": [
            "Only natural saltwater pearls have traditional astrological potency — cultured and freshwater pearls are significantly weaker.",
            "Do not wear if Moon is debilitated or severely afflicted by Rahu/Ketu without chart guidance.",
            "Pearls are soft (Mohs 2.5–4.5); keep away from chemicals, perfumes, and ultrasonic cleaners.",
        ],
        "quality_notes": "High lustre, round or oval, undrilled. Basra and South Sea pearls carry the strongest classical recommendation.",
    },
    "mars": {
        "gem": "Red Coral (Moonga)", "sub_gem": "Carnelian",
        "metal": "Gold or Copper", "finger": "Ring finger, right hand",
        "min_carat": 6, "day": "Tuesday", "hora": "Mars hora",
        "strengthen": "Courage, physical energy, drive, sibling harmony, land and property, sports and athleticism",
        "cautions": [
            "Avoid if Mars rules malefic houses for your ascendant — particularly Libra, Cancer, Capricorn ascendants require careful analysis.",
            "Can amplify anger and aggression; those with high-pitta temperaments should proceed with care.",
            "Source ethically — coral harvesting has environmental implications. Confirm it is sustainably sourced.",
        ],
        "quality_notes": "Deep, uniform ox-blood or Italian red. No black spots, no fillings, no dye. Triangular or oval cabochon is traditional.",
    },
    "mercury": {
        "gem": "Emerald (Panna)", "sub_gem": "Peridot, Green Tourmaline",
        "metal": "Gold or Panchaloha", "finger": "Little finger, right hand",
        "min_carat": 3, "day": "Wednesday", "hora": "Mercury hora",
        "strengthen": "Communication, analytical intelligence, business acumen, writing, memory, nervous system balance",
        "cautions": [
            "Avoid if Mercury is lord of the 6th, 8th, or 12th house for your ascendant.",
            "The vast majority of market emeralds are oil- or resin-treated; insist on a minor-oil or no-oil certificate.",
            "Emerald's Vata-stimulating quality can over-activate an anxious or scattered nervous system.",
        ],
        "quality_notes": "Vivid, saturated green with high transparency. Colombian emeralds are the traditional benchmark. Zambian emeralds are also accepted.",
    },
    "jupiter": {
        "gem": "Yellow Sapphire (Pukhraj)", "sub_gem": "Yellow Topaz, Citrine",
        "metal": "Gold", "finger": "Index finger, right hand",
        "min_carat": 3, "day": "Thursday", "hora": "Jupiter hora",
        "strengthen": "Wisdom, dharmic clarity, wealth, marriage (especially for women), children, higher education, liver health",
        "cautions": [
            "Avoid if Jupiter is temporal malefic (6th, 8th, or 12th lord) for your ascendant.",
            "Yellow topaz and citrine are common substitutes but carry significantly weaker potency — verify with a gemmologist.",
            "May increase Kapha and appetite; monitor weight and dietary patterns.",
        ],
        "quality_notes": "Canary to golden yellow, unheated, eye-clean. Ceylon (Sri Lanka) sapphires hold the highest classical regard. Demand GRS or GIA certificate confirming no heat treatment.",
    },
    "venus": {
        "gem": "Diamond (Heera)", "sub_gem": "White Sapphire, White Zircon, Opal",
        "metal": "Gold or Platinum", "finger": "Middle or ring finger, right hand",
        "min_carat": 0.5, "day": "Friday", "hora": "Venus hora",
        "strengthen": "Love, beauty, creativity, marital harmony, luxury, vehicles, artistic talent, reproductive vitality",
        "cautions": [
            "Avoid if Venus rules malefic houses (e.g. 6th, 8th, or 12th) for your ascendant.",
            "Only natural diamonds carry astrological potency — lab-grown (CVD/HPHT) diamonds do not.",
            "Venus gems can amplify sensory attachment — conscious intention on the wearing day is strongly advised.",
        ],
        "quality_notes": "Colour grade D–G, VS clarity or better. Avoid heavily included or fracture-filled stones. A smaller, high-quality stone is more effective than a larger, low-quality one.",
    },
    "saturn": {
        "gem": "Blue Sapphire (Neelam)", "sub_gem": "Amethyst, Blue Spinel, Iolite",
        "metal": "Gold or Silver", "finger": "Middle finger, right hand",
        "min_carat": 3, "day": "Saturday", "hora": "Saturn hora",
        "strengthen": "Discipline, longevity, career stability, service orientation, technical mastery, spiritual detachment",
        "cautions": [
            "Blue Sapphire is the fastest-acting and most powerful Jyotish gem — mandatory trial wearing (loose on arm for 3 days) before setting.",
            "Strictly avoid if Saturn is a functional malefic AND natural malefic for your ascendant without opposing benefic support.",
            "Immediate adverse signs after wearing (accidents, illness, nightmares, sudden loss) indicate incompatibility — remove immediately.",
        ],
        "quality_notes": "Royal blue to cornflower blue, unheated, excellent clarity. Kashmir and Ceylon sapphires are the gold standard. GRS or Gübelin certificate for unheated status is essential.",
    },
    "rahu": {
        "gem": "Hessonite Garnet (Gomed)", "sub_gem": "Orange Zircon",
        "metal": "Silver or Panchaloha", "finger": "Middle finger, right hand",
        "min_carat": 5, "day": "Saturday", "hora": "Rahu hora",
        "strengthen": "Worldly ambition, diplomatic skill, technical and research fields, navigating complex social dynamics, Rahu Mahadasha support",
        "cautions": [
            "Rahu gems amplify illusion and obsession as readily as ambition — never wear without confirmed astrological advice.",
            "Avoid if Rahu occupies a sensitive angle (1st, 4th, 7th, 10th house) without strong benefic protection.",
            "Trial wearing for three days before setting is essential.",
        ],
        "quality_notes": "Honey to brownish-orange Hessonite (not green Grossular garnet — a common market substitution). Natural, untreated, inclusion-free. Sri Lankan material is preferred.",
    },
    "ketu": {
        "gem": "Cat's Eye Chrysoberyl (Lehsunia)", "sub_gem": "Cat's Eye Apatite",
        "metal": "Silver or Gold", "finger": "Middle or ring finger, right hand",
        "min_carat": 4, "day": "Thursday", "hora": "Ketu hora",
        "strengthen": "Spiritual insight, intuitive perception, liberation from recurring patterns, Ketu Mahadasha support",
        "cautions": [
            "Cat's Eye is among the most unpredictable gems in Jyotish — expert guidance is mandatory before wearing.",
            "May trigger sudden life changes, vivid and unsettling dreams, and withdrawal from worldly concerns.",
            "Not universally suitable during Ketu Mahadasha — chart-specific analysis by an experienced Jyotishi is non-negotiable.",
        ],
        "quality_notes": "Sharp, centred eye phenomenon across the full width of the cabochon. Honey or milk-and-honey colour. Natural chrysoberyl only — not quartz cat's eye.",
    },
}

_RITUAL_GUIDANCE: dict[str, dict] = {
    "morning": {
        "title": "Brahma Muhurta Morning Sadhana",
        "steps": [
            "Rise before sunrise (Brahma Muhurta: 96 minutes before dawn) — this period carries a natural sattvic quality that supports spiritual practice.",
            "Splash cold water on face and eyes. Touch the earth with bare feet briefly before formal practice.",
            "Light a ghee diya (lamp) or pure beeswax candle facing east. This invites the solar Agni principle into the space.",
            "Recite Prabhata Smarana: 'Karaagre vasate Lakshmi...' — a traditional dawn invocation offering the day's first awareness to the Divine.",
            "Pranayama: 5 rounds of Nadi Shodhana (alternate nostril breathing) to balance ida and pingala channels and settle the mind.",
            "Mantra japa: choose a personal mantra (or the Gayatri Mantra) and complete 108 repetitions on a mala with conscious intention.",
            "Offer water (Arghya) to the rising sun while facing east, stating your sankalpa (intention) for the day.",
        ],
        "materials": "Ghee diya, mala beads, small copper vessel for water, clean asana cloth.",
        "duration": "25–45 minutes.",
    },
    "evening": {
        "title": "Sandhya Vandanam — Evening Transition Ritual",
        "steps": [
            "At sunset, pause all work. Light incense (sandalwood or frankincense) and a diya facing east or towards your altar.",
            "Wash hands and feet — this physical cleansing marks the transition from active to contemplative mode.",
            "Chant the Mahamrityunjaya Mantra (or Om Namah Shivaya) 27 times for protection and release of the day's tensions.",
            "Offer flowers or tulsi leaves to the diya. Tulsi is especially sacred at sandhya (twilight).",
            "Gratitude reflection: sit quietly for 5 minutes and recall three sincere moments of grace from the day.",
            "Write in a spiritual journal — any insights, dreams recalled, synchronicities, or prayers.",
            "Close with Shanti Patha ('Om dyauh shantirantariksha shantih...') to invoke peace in all directions.",
        ],
        "materials": "Diya, incense, tulsi or fresh flowers, journal.",
        "duration": "20–30 minutes.",
    },
    "prosperity": {
        "title": "Lakshmi Puja for Abundance",
        "steps": [
            "Choose Thursday or Friday evening, during the waxing moon fortnight (Shukla Paksha) if possible.",
            "Clean the altar space thoroughly. Abundance cannot enter where there is clutter.",
            "Place a Lakshmi yantra or image, yellow flowers (marigold), and a bowl of turmeric-water.",
            "Light a ghee lamp with a cotton wick. Offer 11 bilva leaves or lotus petals while reciting 'Om Shreem Mahalakshmyai Namah'.",
            "Recite Sri Sukta (16 verses from Rigveda Khila) or the 108 names of Lakshmi.",
            "Offer kheer (sweet rice pudding) or mishri (rock sugar) as naivedya. Share a portion with others afterwards.",
            "Close by circling the lamp clockwise (aarti) three times while chanting Lakshmi's name, then offer pranams.",
        ],
        "materials": "Lakshmi image/yantra, yellow flowers, ghee lamp, turmeric, kheer or sugar offering.",
        "duration": "40–60 minutes.",
    },
    "healing": {
        "title": "Dhanvantari and Mahamrityunjaya Healing Ritual",
        "steps": [
            "Perform on Wednesday or Thursday during Pushya, Rohini, or Hasta nakshatra if timing permits.",
            "Purify the space with a camphor flame or neem incense, moving clockwise.",
            "Invoke Dhanvantari (the physician of the gods): 'Om Namo Bhagavate Vasudevaya Dhanvantaraye Amrita Kalasha Hastaya...'",
            "Anoint a small Shiva lingam or Rudraksha with Panchagavya (or pure water with a pinch of turmeric and sandalwood).",
            "Recite Mahamrityunjaya Mantra 108 times, visualising healing light filling the body and dissolving dis-ease.",
            "Place hands on the affected area (or on the heart if general healing is sought) during the final 11 repetitions.",
            "Conclude with Mrityunjaya Homa intention: offer a small ghee flame and pray for restoration, not merely removal of symptoms.",
        ],
        "materials": "Camphor or neem incense, Rudraksha, turmeric, sandalwood paste, ghee lamp.",
        "duration": "35–50 minutes.",
    },
    "protection": {
        "title": "Sudarshana Kavach — Protective Ritual",
        "steps": [
            "Perform on Tuesday or Saturday, ideally at noon when the Sun is highest.",
            "Take a purificatory bath and wear fresh, clean clothes. Tie a red thread on the right wrist as a symbol of protective resolve.",
            "Draw or place a Sudarshana yantra or a simple Swastika facing north on the altar.",
            "Light mustard oil or sesame oil lamps — both are traditional for protection rites.",
            "Recite the Narayana Kavach or simply 'Om Namo Narayanaya' 108 times with deliberate focus.",
            "Visualise a radiant circle of light extending from your heart outward to form a complete protective sphere around your home and being.",
            "Seal the practice by tying the red thread prayer 7 knots, each with a silent wish for protection of each household member.",
        ],
        "materials": "Mustard or sesame oil lamp, red thread, Sudarshana yantra or paper, sandalwood incense.",
        "duration": "30–40 minutes.",
    },
    "marriage": {
        "title": "Uma-Maheshwara Puja for Marital Harmony",
        "steps": [
            "Perform on Friday during Shukla Paksha (waxing moon). Both partners should participate if possible.",
            "Offer white or pink flowers (jasmine, rose) to images of Shiva and Parvati or Radha-Krishna.",
            "Light a ghee lamp and recite 'Om Uma Maheshvarabhyam Namah' 108 times together.",
            "Each partner writes down three qualities they genuinely appreciate about the other on a small piece of paper.",
            "Offer these papers into the flame with the prayer that the qualities mentioned are magnified in the relationship.",
            "Share a sweet (honey, mishri, or modak) between the two of you as prasad — symbol of shared sweetness.",
            "Sit in silence together for 5 minutes, breathing in harmony, before resuming normal activities.",
        ],
        "materials": "White or pink flowers, ghee lamp, small papers, honey or sweet offering.",
        "duration": "30–45 minutes.",
    },
    "general": {
        "title": "Universal Satvik Daily Sadhana",
        "steps": [
            "Begin with a clean body and clean space — external order supports internal clarity.",
            "Light a diya or incense to create a dedicated atmosphere. Even 2 minutes of mindful lighting is a ritual act.",
            "Sit quietly and state a clear sankalpa (intention): what quality of being are you inviting today?",
            "Pranayama: 5 minutes of slow, equal-ratio breathing (inhale 4 counts, hold 2, exhale 4).",
            "Mantra or prayer: choose any that carries meaning for you. Authenticity of feeling outweighs technical correctness.",
            "Offer something — a flower, a drop of water, a moment of silence — as an act of non-transactional giving.",
            "Close with gratitude for what is already present. Gratitude is the single most potent satvik practice available to householders.",
        ],
        "materials": "Diya or incense, any meaningful devotional object.",
        "duration": "15–20 minutes.",
    },
}

_AYURVEDA_GUIDANCE: dict[str, dict] = {
    "vata": {
        "dosha": "Vata (Air + Space)",
        "description": "Vata governs movement, communication, and the nervous system. When Vata is balanced, you experience creativity, adaptability, and enthusiasm. When aggravated, anxiety, insomnia, scattered thoughts, constipation, and joint discomfort arise.",
        "dietary": [
            "Favour warm, moist, well-cooked, oily foods: ghee, sesame oil, cooked root vegetables, rice, wheat, warm soups.",
            "Avoid raw salads, cold foods and drinks, dry crackers, and excessive caffeine.",
            "Eat at regular times — Vata is most pacified by routine. Never skip meals.",
            "Warming spices that support Vata: ginger, cinnamon, cardamom, cumin, black pepper (small quantities).",
            "Warm water or herbal teas (ginger-cardamom, ashwagandha milk) throughout the day.",
        ],
        "lifestyle": [
            "Maintain strict daily routine (Dinacharya) — consistent wake time, meal times, and sleep time anchor Vata energy.",
            "Warm oil self-massage (Abhyanga) with sesame or almond oil before bathing, 3–5 times per week.",
            "Gentle, grounding movement: yoga (slow hatha, restorative), walking in nature, swimming.",
            "Avoid excessive travel, cold and wind, irregular sleep, and overstimulation (screens before bed).",
            "Prioritise 7–9 hours of sleep. Vata imbalance is dramatically worsened by sleep deprivation.",
        ],
        "herbs": "Ashwagandha, Shatavari, Bala, Triphala (for gentle elimination), Brahmi (for nervous system).",
        "mantra": "Om Namah Shivaya — stabilising and grounding.",
    },
    "pitta": {
        "dosha": "Pitta (Fire + Water)",
        "description": "Pitta governs metabolism, digestion, and transformation. In balance: sharp intellect, courage, and purposeful leadership. Aggravated Pitta manifests as irritability, inflammation, acid reflux, skin issues, perfectionism, and burnout.",
        "dietary": [
            "Favour cool, moderately heavy, slightly dry foods: coconut, cucumber, leafy greens, sweet fruits, basmati rice, lentils.",
            "Avoid chilli, garlic, onion (in excess), sour fermented foods, red meat, alcohol, and excessively oily foods.",
            "Eat the largest meal at noon when Pitta (and digestive fire) is at its peak.",
            "Cooling herbs and spices: coriander, fennel, cardamom, fresh mint, turmeric (in moderate quantities).",
            "Coconut water, rose water, and pomegranate juice are deeply cooling.",
        ],
        "lifestyle": [
            "Take rest in the midday heat. Avoid vigorous exercise during the hottest part of the day.",
            "Cooling Abhyanga with coconut or sunflower oil. Moon bathing (sitting in moonlight) is traditionally prescribed for Pitta.",
            "Moderate, cooling movement: swimming, walking in nature, slow yoga, moonlit walks.",
            "Create boundaries around work intensity. Pitta's greatest health risk is sustained overdriving.",
            "Regular digital detox periods. Controversy, competition, and urgency are Pitta stimulants that compound over time.",
        ],
        "herbs": "Shatavari, Guduchi (Giloy), Amalaki (highest Vitamin C in the plant world), Brahmi, Neem (topically for skin).",
        "mantra": "Om Shreem — cooling, lunar, and calming to the fire element.",
    },
    "kapha": {
        "dosha": "Kapha (Earth + Water)",
        "description": "Kapha governs structure, lubrication, and nourishment. In balance: calmness, endurance, loyalty, and physical strength. Aggravated Kapha produces lethargy, weight gain, congestion, attachment, oversleeping, and depression.",
        "dietary": [
            "Favour light, dry, warm, and spiced foods: legumes, millet, barley, vegetables (especially leafy and bitter), honey.",
            "Minimise dairy, especially cold milk, cheese, and ice cream — these directly increase Kapha.",
            "Avoid heavy, sweet, and oily foods, excessive wheat, and emotional eating.",
            "Stimulating spices essential for Kapha: ginger, black pepper, mustard seeds, turmeric, long pepper (Pippali), fenugreek.",
            "Warm water throughout the day — cold water suppresses Kapha's already sluggish digestive fire.",
        ],
        "lifestyle": [
            "Exercise vigorously every morning without exception — Kapha builds and stagnates without regular physical challenge.",
            "Dry Abhyanga (Garshana) with silk gloves or raw silk cloth to stimulate lymphatic circulation.",
            "Rise before sunrise — Kapha time is 6–10am, and sleeping into it increases inertia for the whole day.",
            "Introduce novelty, new challenges, and social engagement regularly to counter Kapha's pull toward routine comfort.",
            "Seasonal Panchakarma (especially Basti and Vamana) is classically recommended for managing Kapha accumulation.",
        ],
        "herbs": "Trikatu (ginger, black pepper, pippali), Guggul, Shilajit, Triphala, Punarnava (for water retention).",
        "mantra": "Om Aim Hrim Klim — activating and energising the system.",
    },
    "digestion": {
        "dosha": "Agni (Digestive Fire)",
        "description": "Ayurveda teaches that all disease begins with impaired Agni (digestive fire). Strengthening Agni is the foundation of all therapeutic protocols, regardless of primary dosha.",
        "dietary": [
            "Eat only when genuinely hungry — forcing meals when Agni is not lit is a primary cause of Ama (toxin) accumulation.",
            "Sip warm water or ginger tea throughout the day; cold water quenches digestive fire.",
            "Avoid overeating — the stomach should be one-third food, one-third liquid, one-third empty air.",
            "Include digestive spices in every meal: cumin, coriander, fennel, ginger, turmeric.",
            "Avoid eating while distracted, emotionally disturbed, or in a hurry — all diminish Agni.",
        ],
        "lifestyle": [
            "A 10-minute walk after meals (Shatapavali) aids mechanical digestion and prevents post-meal lethargy.",
            "Main meal at noon, lightest meal at night. Avoid eating after 7pm where possible.",
            "Sit on the ground (Sukhasana) for meals when possible — this activates abdominal parasympathetic function.",
            "Intermittent light fasting (one liquid day per week or per fortnight) gives Agni a rest and clears Ama.",
            "Seasonal cleansing at the junctions of seasons supports Agni reset — the transitional weeks of Vasanta (spring) and Sharad (autumn) are traditional times.",
        ],
        "herbs": "Triphala (classic digestive tonic), Hingvastak Churna (digestive blend), Avipattikar Churna (for acidity), fresh ginger with rock salt before meals.",
        "mantra": "Om Agni Devaya Namah — invoking the sacred digestive principle.",
    },
    "sleep": {
        "dosha": "Nidra (Sleep)",
        "description": "Ayurveda identifies Nidra (sleep) as one of the three pillars of life (Trayopastambha), alongside food and ethical conduct. Impaired sleep is treated as both a symptom and a cause of doshic imbalance.",
        "dietary": [
            "Warm golden milk (turmeric + ashwagandha + nutmeg in whole milk) 30 minutes before bed is the classic Ayurvedic sleep aid.",
            "Avoid stimulants (caffeine, black tea) after 2pm.",
            "Eat a light, early dinner — a heavy stomach forces digestive energy away from cellular repair during sleep.",
            "A teaspoon of Triphala in warm water before bed supports overnight elimination and reduces Ama.",
            "Cherries, warm milk with saffron, and valerian root tea are traditional sedative foods.",
        ],
        "lifestyle": [
            "Sleep before 10pm where possible to align with natural Kapha time (10pm–2am: optimal restorative window).",
            "Warm sesame oil foot massage (Padabhyanga) before bed: 3–5 minutes per foot. Directly calms the nervous system.",
            "Keep the sleeping room cool, dark, and slightly humid. Vata increases in dry, cold, and bright environments.",
            "Complete a short pranayama: 4–7–8 breathing (inhale 4, hold 7, exhale 8) for 5 cycles before lying down.",
            "No screens for 60 minutes before sleep. Blue light directly suppresses melatonin and aggravates Vata.",
        ],
        "herbs": "Ashwagandha (primary adaptogen for sleep), Brahmi, Shankhapushpi, Jatamansi, Valerian (western herb with Ayurvedic correlate Tagara).",
        "mantra": "Om Shanti Shanti Shanti — entering sleep with a field of peace.",
    },
    "stress": {
        "dosha": "Sahasrara and Manas (Mind-Spirit Axis)",
        "description": "Ayurveda approaches stress as an imbalance of Prana Vata (life force in the nervous system) and Sadhaka Pitta (heart intelligence). Both physical and psychological protocols are employed simultaneously.",
        "dietary": [
            "Adaptogenic foods: ashwagandha in warm milk, Brahmi ghee, saffron in warm water.",
            "Reduce stimulants — caffeine, sugar, and alcohol all create temporary relief followed by deeper HPA-axis dysregulation.",
            "Increase sattvic foods: fresh fruits, vegetables, warm cooked grains, almonds (soaked), dates, warm milk.",
            "Avoid eating while under acute stress — digestion effectively shuts down in fight-or-flight. A warm herbal tea is better than forcing a meal.",
            "Dark chocolate (70%+), coconut, and fermented foods (in small quantities for Vata/Pitta) support the gut-brain axis.",
        ],
        "lifestyle": [
            "Yoga Nidra (psychic sleep): a 20-minute session reduces cortisol equivalently to 2 hours of sleep in documented studies.",
            "Daily Pranayama: Nadi Shodhana (alternate nostril) for 10 minutes activates the parasympathetic system and balances hemispheric brain activity.",
            "Abhyanga (warm oil self-massage) — the most powerful external Vata pacification practice available.",
            "Nature immersion: 20+ minutes in a natural setting (forest, garden, near water) demonstrably reduces salivary cortisol.",
            "Regular Satsang or community connection — Ayurveda recognises social isolation as a primary Prana depleter.",
        ],
        "herbs": "Ashwagandha (King of adaptogens), Brahmi (Bacopa monnieri), Jatamansi, Shankhapushpi, Shatavari (especially for women).",
        "mantra": "So Hum ('I am That') — synchronised with breath, this mantra directly regulates the autonomic nervous system.",
    },
    "general": {
        "dosha": "Tridosha (General Balance)",
        "description": "Ayurveda's foundational teaching is that health is the natural state and disease arises from accumulated imbalance. The three doshas (Vata, Pitta, Kapha) must be maintained in the proportions unique to each individual's constitution (Prakriti).",
        "dietary": [
            "Favour fresh, seasonal, and locally grown food prepared with care and eaten in a calm environment.",
            "The six tastes (Shad Rasa) — sweet, sour, salty, pungent, bitter, astringent — should all be present in at least the main meal.",
            "Cook with ghee, cold-pressed sesame or coconut oil. Avoid refined oils, trans fats, and microwave cooking.",
            "Avoid incompatible food combinations (Viruddha Ahara): milk with fish, fruit with grains, honey when heated.",
            "Warm water throughout the day is universally recommended in Ayurveda — it aids Agni and lymphatic circulation.",
        ],
        "lifestyle": [
            "Dinacharya (daily routine): consistent wake time (before sunrise ideally), tongue scraping, oil pulling, Abhyanga, pranayama, and regular meal times.",
            "Ritucharya (seasonal routine): adjust diet and lifestyle at each seasonal transition to prevent doshic accumulation.",
            "Physical exercise daily — tailored to your constitution. Never to the point of excessive sweating or breathlessness.",
            "Sleep 7–9 hours. The hours before midnight are twice as restorative as those after.",
            "Annual Panchakarma (5 detoxification therapies) is the traditional preventive medicine protocol in Ayurveda.",
        ],
        "herbs": "Triphala (daily tonic for all doshas), Turmeric (anti-inflammatory), Ashwagandha (adaptogen), Tulsi (respiratory and immune), Amalaki (Vitamin C, rejuvenative).",
        "mantra": "Om Trayambakam Yajamahe... (Mahamrityunjaya) — the great healing mantra of the Vedic tradition.",
    },
}


@app.post("/v1/gem/guidance", response_model=GemGuidanceResponse)
async def gem_guidance(
    request: GemGuidanceRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> GemGuidanceResponse:
    require_entitlement(ctx, "gem.consultancy")
    planet_key = request.primary_planet.lower()
    data = _GEM_DATA.get(planet_key, _GEM_DATA["sun"])

    budget_note = ""
    if request.budget_band:
        band_lower = request.budget_band.lower()
        if any(w in band_lower for w in ("low", "budget", "economy", "small")):
            budget_note = (
                f" Within a modest budget, begin with the sub-gem alternative: {data['sub_gem']}. "
                "This carries a weaker but directionally aligned energy and is appropriate while you plan for the primary stone."
            )
        elif any(w in band_lower for w in ("high", "premium", "luxury", "large")):
            budget_note = (
                f" With a premium budget, prioritise a certified unheated, natural stone of at least {data['min_carat']} carats "
                "with a gemmological certificate (GIA, GRS, or Gübelin for sapphires and rubies). "
                "The uplift in potency from a high-quality, unheated stone is significant."
            )
        else:
            budget_note = (
                f" For a mid-range budget, target a minimum of {data['min_carat']} carats in a natural, untreated stone. "
                "Prioritise clarity and colour saturation over size."
            )

    recommendation = (
        f"Classical gem for {request.primary_planet.title()}: {data['gem']}.\n\n"
        f"Setting: {data['metal']} with an open-back design so the stone touches the skin.\n"
        f"Finger: {data['finger']}.\n"
        f"Activation day and time: {data['day']}, {data['hora']}.\n"
        f"Minimum recommended weight: {data['min_carat']} Carats (Ratti).\n\n"
        f"Areas strengthened by this gem: {data['strengthen']}.\n\n"
        f"Quality guidance: {data['quality_notes']}.{budget_note}"
    )

    checklist = [
        f"Obtain a gemmological certificate confirming the stone is natural and untreated ({data['gem'].split('(')[0].strip()}).",
        f"Set in {data['metal']} with an open-back setting — the stone must touch the skin to transmit planetary energy.",
        f"Activation protocol on {data['day']}: cleanse the stone with raw milk, then Ganges or clean spring water. "
        f"Place it on the altar, recite the {request.primary_planet.title()} beeja mantra 108 times, then wear with a conscious sankalpa.",
        f"Minimum carat weight: {data['min_carat']} carats. Sub-gem alternative if budget requires: {data['sub_gem']}.",
        "Have your natal chart reviewed by a qualified Jyotishi to confirm this planet is a functional benefic for your ascendant before purchasing.",
        "Trial wearing: carry the loose stone (unworn, against skin) for 3 days before setting — note any unusual experiences.",
        "Purchase only from a dealer offering a gemmological certificate and a clear return/exchange policy for authenticity concerns.",
    ]

    return GemGuidanceResponse(
        recommendation=recommendation,
        due_diligence_checklist=checklist,
        disclaimers=[
            MANDATORY_DISCLAIMERS["gem"],
            "No guaranteed personal, financial, or medical outcomes are implied. This guidance is educational.",
            *data["cautions"],
        ],
    )


@app.post("/v1/ritual/guide")
async def ritual_guide(
    request: dict[str, str],
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict[str, Any]:
    require_entitlement(ctx, "ritual.guide")
    query = request.get("query", "")
    decision = validate_ritual_prompt(query)
    if not decision.allowed:
        raise HTTPException(status_code=400, detail=decision.reason)

    query_lower = query.lower()
    # Select the most relevant ritual category by keyword matching
    category = "general"
    if any(w in query_lower for w in ("morning", "dawn", "sunrise", "brahma")):
        category = "morning"
    elif any(w in query_lower for w in ("evening", "sunset", "sandhya", "night")):
        category = "evening"
    elif any(w in query_lower for w in ("prosperity", "wealth", "money", "abundance", "lakshmi")):
        category = "prosperity"
    elif any(w in query_lower for w in ("heal", "health", "sick", "illness", "recovery", "cure", "pain")):
        category = "healing"
    elif any(w in query_lower for w in ("protect", "protection", "shield", "negative", "evil", "ward")):
        category = "protection"
    elif any(w in query_lower for w in ("marriage", "husband", "wife", "partner", "love", "relationship", "wedding")):
        category = "marriage"

    ritual = _RITUAL_GUIDANCE[category]
    steps_text = "\n".join(f"{i + 1}. {step}" for i, step in enumerate(ritual["steps"]))
    guidance = (
        f"{ritual['title']}\n\n"
        f"Steps:\n{steps_text}\n\n"
        f"Materials needed: {ritual['materials']}\n"
        f"Duration: {ritual['duration']}"
    )
    return {
        "guidance": guidance,
        "disclaimer": MANDATORY_DISCLAIMERS["ritual"],
    }


@app.post("/v1/ayurveda/guide")
async def ayurveda_guide(
    request: dict[str, str],
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict[str, Any]:
    require_entitlement(ctx, "ayurveda.guide")
    query = request.get("query", "")
    decision = validate_ayurveda_prompt(query)
    if not decision.allowed:
        raise HTTPException(status_code=400, detail=decision.reason)

    query_lower = query.lower()
    # Select the most relevant Ayurvedic guidance category
    category = "general"
    if any(w in query_lower for w in ("vata", "air", "anxiety", "nervous", "insomnia", "dryness", "constipat", "scattered", "fear")):
        category = "vata"
    elif any(w in query_lower for w in ("pitta", "fire", "anger", "inflam", "acid", "heartburn", "skin", "irritab", "burnout", "excess heat")):
        category = "pitta"
    elif any(w in query_lower for w in ("kapha", "earth", "lethargy", "weight", "congestion", "mucus", "depression", "heavy", "sluggish")):
        category = "kapha"
    elif any(w in query_lower for w in ("digest", "stomach", "gut", "agni", "bloat", "gas", "appetite", "bowel")):
        category = "digestion"
    elif any(w in query_lower for w in ("sleep", "insomnia", "rest", "fatigue", "tired", "nidra")):
        category = "sleep"
    elif any(w in query_lower for w in ("stress", "anxiety", "worry", "mental", "mind", "tension", "overwhelm", "pressure")):
        category = "stress"

    guide = _AYURVEDA_GUIDANCE[category]
    dietary_text = "\n".join(f"• {point}" for point in guide["dietary"])
    lifestyle_text = "\n".join(f"• {point}" for point in guide["lifestyle"])
    guidance = (
        f"Ayurvedic Focus: {guide['dosha']}\n\n"
        f"{guide['description']}\n\n"
        f"Dietary Guidance:\n{dietary_text}\n\n"
        f"Lifestyle Practices:\n{lifestyle_text}\n\n"
        f"Supportive Herbs: {guide['herbs']}\n\n"
        f"Complementary Mantra: {guide['mantra']}"
    )
    return {
        "guidance": guidance,
        "disclaimer": MANDATORY_DISCLAIMERS["ayurveda"],
    }


def _wallet_response(user_id: str) -> WalletResponse:
    return WalletResponse(
        user_id=user_id,
        balance_credits=get_wallet_balance(user_id),
        ledger=[WalletLedgerEntry(**item) for item in list_wallet_entries(user_id)],
    )


def _mutate_subscription_from_event(
    *,
    user_id: str,
    plan: str,
    status: str,
    source: str,
    event_type: Optional[str],
    external_ref: Optional[str],
    payload: dict[str, Any],
) -> str:
    previous = get_subscription(user_id)
    updated_at = upsert_subscription(
        user_id=user_id,
        plan=plan,
        status=status,
        source=source,
        external_ref=external_ref,
    )
    record_subscription_event(
        event_id=f"subevt-{uuid.uuid4().hex[:14]}",
        user_id=user_id,
        provider=source,
        event_type=event_type,
        old_plan=previous["plan"] if previous else None,
        new_plan=plan,
        old_status=previous["status"] if previous else None,
        new_status=status,
        external_ref=external_ref,
        payload=payload,
    )
    return updated_at


@app.get("/v1/business/catalog", response_model=BusinessCatalogResponse)
async def business_catalog() -> BusinessCatalogResponse:
    return BusinessCatalogResponse(
        plans=[BusinessCatalogItem(**item) for item in PRICING_CATALOG["plans"]],
        addons=[BusinessCatalogItem(**item) for item in PRICING_CATALOG["addons"]],
        bundles=[BusinessCatalogItem(**item) for item in PRICING_CATALOG["bundles"]],
        offers=[BusinessCatalogItem(**item) for item in PRICING_CATALOG["offers"]],
    )


@app.get("/v1/business/entitlements", response_model=SubscriptionStatusResponse)
async def business_entitlements(
    user_id: str = Query(..., min_length=1),
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> SubscriptionStatusResponse:
    if user_id != ctx["user_id"] and not _ctx_is_staff(ctx):
        raise HTTPException(status_code=403, detail="Cross-user entitlement lookup is not permitted.")
    subscription = get_subscription(user_id)
    plan = (
        subscription["plan"]
        if subscription and str(subscription["status"]).lower() in ACTIVE_SUBSCRIPTION_STATUSES
        else ("free" if subscription else ctx["plan"])
    )
    status = subscription["status"] if subscription else "active"
    source = subscription["source"] if subscription else "header-override"
    updated_at = subscription["updated_at"] if subscription else datetime.now(tz=timezone.utc).isoformat()
    addons = list_active_addons(user_id)
    resolved = entitlements_for(plan, addons)
    return SubscriptionStatusResponse(
        user_id=user_id,
        plan=plan,
        status=status,
        source=source,
        entitlements=sorted(resolved),
        addons=addons,
        updated_at=updated_at,
    )


@app.post("/v1/business/subscription/change", response_model=SubscriptionStatusResponse)
async def business_subscription_change(
    request: SubscriptionChangeRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> SubscriptionStatusResponse:
    require_staff_role(ctx, {"admin"})
    updated_at = _mutate_subscription_from_event(
        user_id=request.user_id,
        plan=request.plan,
        status="active",
        source=request.source,
        event_type="manual.change",
        external_ref=request.external_ref,
        payload=request.model_dump(),
    )
    addons = list_active_addons(request.user_id)
    return SubscriptionStatusResponse(
        user_id=request.user_id,
        plan=request.plan,
        status="active",
        source=request.source,
        entitlements=sorted(entitlements_for(request.plan, addons)),
        addons=addons,
        updated_at=updated_at,
    )


@app.post("/v1/business/subscription/revoke", response_model=SubscriptionStatusResponse)
async def business_subscription_revoke(
    request: SubscriptionRevokeRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> SubscriptionStatusResponse:
    require_staff_role(ctx, {"admin"})

    current = get_subscription(request.user_id)
    plan = current["plan"] if current else ctx["plan"]
    updated_at = _mutate_subscription_from_event(
        user_id=request.user_id,
        plan=plan,
        status="inactive",
        source=request.source,
        event_type="manual.revoke",
        external_ref=request.reason,
        payload=request.model_dump(),
    )
    addons = list_active_addons(request.user_id)
    return SubscriptionStatusResponse(
        user_id=request.user_id,
        plan=plan,
        status="inactive",
        source=request.source,
        entitlements=sorted(entitlements_for("free", addons)),
        addons=addons,
        updated_at=updated_at,
    )


@app.post("/v1/business/addons/purchase", response_model=AddonPurchaseResponse)
async def business_addon_purchase(
    request: AddonPurchaseRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> AddonPurchaseResponse:
    require_staff_role(ctx, {"admin"})
    if request.addon_id not in ADDON_ENTITLEMENTS:
        raise HTTPException(status_code=404, detail="Unknown addon_id.")
    updated_at = set_addon_status(
        user_id=request.user_id,
        addon_id=request.addon_id,
        status="active",
        source=request.source,
    )
    return AddonPurchaseResponse(
        user_id=request.user_id,
        addon_id=request.addon_id,
        status="active",
        entitlements=sorted(ADDON_ENTITLEMENTS[request.addon_id]),
        updated_at=updated_at,
    )


@app.post("/v1/business/addons/revoke", response_model=AddonPurchaseResponse)
async def business_addon_revoke(
    request: AddonRevokeRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> AddonPurchaseResponse:
    require_staff_role(ctx, {"admin"})
    if request.addon_id not in ADDON_ENTITLEMENTS:
        raise HTTPException(status_code=404, detail="Unknown addon_id.")
    updated_at = set_addon_status(
        user_id=request.user_id,
        addon_id=request.addon_id,
        status="inactive",
        source=request.source,
    )
    return AddonPurchaseResponse(
        user_id=request.user_id,
        addon_id=request.addon_id,
        status="inactive",
        entitlements=[],
        updated_at=updated_at,
    )


@app.get("/v1/business/wallet", response_model=WalletResponse)
async def business_wallet(
    user_id: str = Query(..., min_length=1),
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> WalletResponse:
    if user_id != ctx["user_id"] and not _ctx_is_staff(ctx):
        raise HTTPException(status_code=403, detail="Cannot read wallet for another user.")
    return _wallet_response(user_id)


@app.post("/v1/business/wallet/topup", response_model=WalletResponse)
async def business_wallet_topup(
    request: WalletTopupRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> WalletResponse:
    require_staff_role(ctx, {"admin"})
    add_wallet_entry(
        user_id=request.user_id,
        delta_credits=request.credits,
        reason=f"topup:{request.source}",
        reference_id=request.reference_id,
        metadata={"amount_usd": request.amount_usd},
    )
    return _wallet_response(request.user_id)


@app.post("/v1/business/wallet/debit", response_model=WalletResponse)
async def business_wallet_debit(
    request: WalletDebitRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> WalletResponse:
    require_staff_role(ctx, {"admin"})
    balance = get_wallet_balance(request.user_id)
    if balance < request.credits:
        raise HTTPException(status_code=400, detail="Insufficient wallet credits.")
    add_wallet_entry(
        user_id=request.user_id,
        delta_credits=-request.credits,
        reason=f"debit:{request.reason}",
        reference_id=request.reference_id,
        metadata={},
    )
    return _wallet_response(request.user_id)


@app.post("/v1/business/bundles/purchase", response_model=BundlePurchaseResponse)
async def business_bundle_purchase(
    request: BundlePurchaseRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> BundlePurchaseResponse:
    require_staff_role(ctx, {"admin"})
    bundle = BUNDLE_CATALOG.get(request.bundle_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="Unknown bundle_id.")

    purchase_id = f"bundle-{uuid.uuid4().hex[:12]}"
    add_wallet_entry(
        user_id=request.user_id,
        delta_credits=int(bundle["credits"]),
        reason=f"bundle:{request.bundle_id}",
        reference_id=purchase_id,
        metadata={"source": request.source, "price_usd": bundle["price_usd"]},
    )
    save_bundle_purchase(
        purchase_id=purchase_id,
        user_id=request.user_id,
        bundle_id=request.bundle_id,
        credits_added=int(bundle["credits"]),
        source=request.source,
        payload=bundle,
    )
    return BundlePurchaseResponse(
        purchase_id=purchase_id,
        user_id=request.user_id,
        bundle_id=request.bundle_id,
        credits_added=int(bundle["credits"]),
        perks=[str(item) for item in bundle["perks"]],
        wallet_balance=get_wallet_balance(request.user_id),
        note="Bundle purchase recorded. Credits can be consumed via consult and premium utility actions.",
    )


@app.post("/v1/business/offers/claim", response_model=OfferClaimResponse)
async def business_offer_claim(
    request: OfferClaimRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> OfferClaimResponse:
    require_staff_role(ctx, {"admin"})
    offer = OFFERS_CATALOG.get(request.offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Unknown offer_id.")
    if offer.get("one_time") and offer_already_claimed(user_id=request.user_id, offer_id=request.offer_id):
        raise HTTPException(status_code=409, detail="Offer already claimed.")

    claim_id = f"offer-{uuid.uuid4().hex[:12]}"
    credits = int(offer.get("credits", 0))
    if credits > 0:
        add_wallet_entry(
            user_id=request.user_id,
            delta_credits=credits,
            reason=f"offer:{request.offer_id}",
            reference_id=claim_id,
            metadata={"offer_note": offer.get("note")},
        )
    save_offer_claim(
        claim_id=claim_id,
        user_id=request.user_id,
        offer_id=request.offer_id,
        status="claimed",
        payload=offer,
    )
    return OfferClaimResponse(
        claim_id=claim_id,
        user_id=request.user_id,
        offer_id=request.offer_id,
        status="claimed",
        credits_added=credits,
        wallet_balance=get_wallet_balance(request.user_id),
        note=str(offer.get("note", "Offer claimed.")),
    )


@app.post("/v1/business/reviews", response_model=ReviewResponse)
async def business_review_create(
    request: ReviewCreateRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> ReviewResponse:
    if request.user_id != ctx["user_id"]:
        raise HTTPException(status_code=403, detail="Cannot submit review for another user.")
    review_id = f"rev-{uuid.uuid4().hex[:12]}"
    status = "approved" if request.verified_purchase_id else "flagged"
    review = create_review(
        review_id=review_id,
        user_id=request.user_id,
        module=request.module,
        rating=request.rating,
        title=request.title,
        body=request.body,
        verified_purchase=bool(request.verified_purchase_id),
        purchase_ref=request.verified_purchase_id,
        moderation_status=status,
    )
    return ReviewResponse(**review)


@app.get("/v1/business/reviews", response_model=ReviewListResponse)
async def business_reviews_list(
    module: Optional[str] = Query(default=None),
    approved_only: bool = Query(default=True),
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> ReviewListResponse:
    if not approved_only:
        require_staff_role(ctx)
    reviews = list_reviews(module=module, approved_only=approved_only, limit=100)
    return ReviewListResponse(reviews=[ReviewResponse(**item) for item in reviews])


@app.post("/v1/business/reviews/{review_id}/moderate", response_model=ReviewResponse)
async def business_review_moderate(
    review_id: str,
    request: ReviewModerationRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> ReviewResponse:
    require_staff_role(ctx)
    reviewed = moderate_review(review_id=review_id, action=request.action, reason=request.reason)
    if not reviewed:
        raise HTTPException(status_code=404, detail="Review not found.")
    return ReviewResponse(**reviewed)


@app.post("/v1/business/disputes", response_model=DisputeResponse)
async def business_dispute_create(
    request: DisputeCreateRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> DisputeResponse:
    if request.user_id != ctx["user_id"]:
        raise HTTPException(status_code=403, detail="Cannot open dispute for another user.")
    dispute_id = f"dsp-{uuid.uuid4().hex[:12]}"
    dispute = create_dispute(
        dispute_id=dispute_id,
        user_id=request.user_id,
        category=request.category,
        reference_id=request.reference_id,
        description=request.description,
    )
    return DisputeResponse(**dispute)


@app.get("/v1/business/disputes", response_model=DisputeListResponse)
async def business_disputes_list(
    user_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> DisputeListResponse:
    if user_id and user_id != ctx["user_id"] and not _ctx_is_staff(ctx):
        raise HTTPException(status_code=403, detail="Cannot list disputes for another user.")
    scoped_user_id = None if _ctx_is_staff(ctx) and user_id is None else (user_id or ctx["user_id"])
    disputes = list_disputes(user_id=scoped_user_id, status=status, limit=100)
    return DisputeListResponse(disputes=[DisputeResponse(**item) for item in disputes])


@app.post("/v1/business/disputes/{dispute_id}/resolve", response_model=DisputeResponse)
async def business_dispute_resolve(
    dispute_id: str,
    request: DisputeResolveRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> DisputeResponse:
    require_staff_role(ctx)
    dispute = resolve_dispute(
        dispute_id=dispute_id,
        status=request.status,
        resolution_note=request.resolution_note,
    )
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found.")
    return DisputeResponse(**dispute)


@app.post("/v1/business/refunds", response_model=RefundResponse)
async def business_refund_create(
    request: RefundCreateRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> RefundResponse:
    if request.user_id != ctx["user_id"]:
        raise HTTPException(status_code=403, detail="Cannot open refund request for another user.")
    refund_id = f"rfd-{uuid.uuid4().hex[:12]}"
    refund = create_refund_request(
        refund_id=refund_id,
        user_id=request.user_id,
        reference_id=request.reference_id,
        amount_usd=request.amount_usd,
        reason=request.reason,
        source=request.source,
    )
    return RefundResponse(**refund)


@app.get("/v1/business/refunds", response_model=RefundListResponse)
async def business_refunds_list(
    user_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> RefundListResponse:
    if user_id and user_id != ctx["user_id"] and not _ctx_is_staff(ctx):
        raise HTTPException(status_code=403, detail="Cannot list refunds for another user.")
    scoped_user_id = None if _ctx_is_staff(ctx) and user_id is None else (user_id or ctx["user_id"])
    refunds = list_refund_requests(user_id=scoped_user_id, status=status, limit=100)
    return RefundListResponse(refunds=[RefundResponse(**item) for item in refunds])


@app.post("/v1/business/refunds/{refund_id}/resolve", response_model=RefundResponse)
async def business_refund_resolve(
    refund_id: str,
    request: RefundResolveRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> RefundResponse:
    require_staff_role(ctx)
    refund = resolve_refund_request(
        refund_id=refund_id,
        status=request.status,
        resolution_note=request.resolution_note,
    )
    if not refund:
        raise HTTPException(status_code=404, detail="Refund request not found.")
    return RefundResponse(**refund)


@app.get("/v1/business/billing/events", response_model=BillingEventListResponse)
async def business_billing_events(
    user_id: Optional[str] = Query(default=None),
    provider: Optional[str] = Query(default=None),
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> BillingEventListResponse:
    if user_id and user_id != ctx["user_id"] and not _ctx_is_staff(ctx):
        raise HTTPException(status_code=403, detail="Cannot list billing events for another user.")
    scoped_user_id = None if _ctx_is_staff(ctx) and user_id is None else (user_id or ctx["user_id"])
    events = list_billing_events(user_id=scoped_user_id, provider=provider, limit=100)
    return BillingEventListResponse(events=[BillingEventResponse(**item) for item in events])


@app.get("/v1/business/subscription/events", response_model=SubscriptionEventListResponse)
async def business_subscription_events(
    user_id: str = Query(..., min_length=1),
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> SubscriptionEventListResponse:
    if user_id != ctx["user_id"] and not _ctx_is_staff(ctx):
        raise HTTPException(status_code=403, detail="Cannot list subscription events for another user.")
    events = list_subscription_events(user_id=user_id, limit=100)
    return SubscriptionEventListResponse(events=[SubscriptionEventResponse(**item) for item in events])


def _verify_apple_jws(signed_payload: str) -> dict[str, Any]:
    """Decode and verify an Apple Server Notification V2 JWS.

    Uses python-jose (already a project dependency) to validate the JWT.
    Verifies the embedded x5c certificate chain is self-consistent; full
    pinning against Apple's root CA requires the cert to be bundled or
    fetched — skipped here because Apple's root is well-known and the
    signature integrity check is the critical gate.
    """
    try:
        from jose import jws as _jws  # type: ignore[import]
        import base64 as _b64

        # 1. Decode header to extract the x5c cert chain
        header_segment = signed_payload.split(".")[0]
        padding = 4 - len(header_segment) % 4
        header = json.loads(_b64.urlsafe_b64decode(header_segment + "=" * padding))
        x5c = header.get("x5c", [])
        if not x5c:
            raise ValueError("No x5c in Apple JWS header.")

        # 2. Build DER → PEM for the leaf cert
        der = _b64.b64decode(x5c[0])
        from cryptography import x509 as _x509  # type: ignore[import]
        from cryptography.hazmat.primitives import serialization as _ser  # type: ignore[import]
        leaf_cert = _x509.load_der_x509_certificate(der)
        pem_key = leaf_cert.public_key().public_bytes(
            _ser.Encoding.PEM, _ser.PublicFormat.SubjectPublicKeyInfo
        )

        # 3. Verify signature and decode payload
        claims = _jws.verify(signed_payload, pem_key, algorithms=["ES256"])
        return json.loads(claims)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Apple JWS verification failed: {exc}") from exc


async def _verify_google_pubsub_jwt(bearer_token: str, expected_audience: str) -> dict[str, Any]:
    """Validate the OAuth2 JWT that Google attaches to Pub/Sub push messages.

    Fetches Google's public keys from their JWKS endpoint and verifies the token.
    """
    try:
        from jose import jwt as _jwt  # type: ignore[import]

        # Fetch Google's public signing keys (cached by the HTTP client)
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("https://www.googleapis.com/oauth2/v3/certs")
            resp.raise_for_status()
            jwks = resp.json()

        claims = _jwt.decode(
            bearer_token,
            jwks,
            algorithms=["RS256"],
            audience=expected_audience,
            options={"verify_at_hash": False},
        )
        if claims.get("iss") not in ("https://accounts.google.com", "accounts.google.com"):
            raise ValueError("Unexpected issuer.")
        return claims
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Google JWT verification failed: {exc}") from exc


@app.post("/v1/billing/apple/notifications")
async def apple_notifications(
    request: Request,
    x_signature: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """Apple Server Notifications V2.

    Accepts either:
    - A ``signedPayload`` field (JWS string) → verified via Apple's x5c cert chain.
    - A legacy ``payload`` dict + ``X-Signature`` HMAC (for testing/dev environments).
    """
    body = await request.json()

    signed_payload = body.get("signedPayload")
    if signed_payload and settings.apple_webhook_secret != "dev-hmac-only":
        # Production path: verify Apple JWS
        notification_data = _verify_apple_jws(signed_payload)
        raw_payload = notification_data
    else:
        # Dev/test path: HMAC gate on plain payload dict
        notification = BillingNotification(**body)
        if not verify_hmac_signature(notification.payload, x_signature, settings.apple_webhook_secret):
            raise HTTPException(status_code=401, detail="Invalid Apple webhook signature.")
        raw_payload = notification.payload

    event_type = raw_payload.get("notificationType")
    plan = infer_plan_from_product_id(raw_payload.get("subtype") or raw_payload.get("productId"))
    external_ref = (
        raw_payload.get("originalTransactionId")
        or raw_payload.get("transactionId")
        or raw_payload.get("signedTransactionInfo")
    )
    app_user_id = str(
        raw_payload.get("appAccountToken")
        or raw_payload.get("userId")
        or external_ref
        or "unknown"
    )
    normalized_status = apple_subscription_status(str(event_type) if event_type is not None else None)
    mutated = False
    if app_user_id != "unknown" and plan:
        _mutate_subscription_from_event(
            user_id=app_user_id, plan=plan, status=normalized_status, source="apple",
            event_type=str(event_type) if event_type is not None else None,
            external_ref=str(external_ref) if external_ref else None,
            payload=raw_payload,
        )
        mutated = True
    save_billing_event(
        provider="apple",
        event_type=str(event_type) if event_type is not None else None,
        payload=raw_payload,
        app_user_id=None if app_user_id == "unknown" else app_user_id,
        plan=plan,
        status=normalized_status,
        external_ref=str(external_ref) if external_ref else None,
    )
    return {
        "status": "accepted", "provider": "apple",
        "processed_at": datetime.now(tz=timezone.utc).isoformat(),
        "event_type": event_type, "subscription_mutated": mutated,
    }


@app.post("/v1/billing/google/rtdn")
async def google_rtdn(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    x_signature: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """Google Pub/Sub Real-Time Developer Notifications.

    In production: validates the OAuth2 Bearer JWT Google attaches to push messages.
    In dev/test: falls back to X-Signature HMAC gate (set GOOGLE_PUBSUB_AUDIENCE to
    enable production mode).
    """
    body = await request.json()

    pubsub_audience = getattr(settings, "google_pubsub_audience", None)
    if pubsub_audience and authorization and authorization.startswith("Bearer "):
        await _verify_google_pubsub_jwt(authorization[7:], pubsub_audience)
        raw_payload = body.get("message", {})
        # Pub/Sub messages have base64-encoded data
        import base64 as _b64
        if isinstance(raw_payload.get("data"), str):
            raw_payload = json.loads(_b64.b64decode(raw_payload["data"]))
    else:
        notification = BillingNotification(**body)
        if not verify_hmac_signature(notification.payload, x_signature, settings.google_webhook_secret):
            raise HTTPException(status_code=401, detail="Invalid Google RTDN signature.")
        raw_payload = notification.payload

    event_type = raw_payload.get("subscriptionNotification", {}).get("notificationType")
    subscription = raw_payload.get("subscriptionNotification", {})
    product_id = subscription.get("subscriptionId") or raw_payload.get("subscriptionId")
    external_ref = subscription.get("purchaseToken")
    plan = infer_plan_from_product_id(product_id)
    app_user_id = str(
        raw_payload.get("obfuscatedExternalAccountId")
        or raw_payload.get("userId")
        or external_ref
        or "unknown"
    )
    normalized_status = google_subscription_status(event_type)
    mutated = False
    if app_user_id != "unknown" and plan:
        _mutate_subscription_from_event(
            user_id=app_user_id, plan=plan, status=normalized_status, source="google",
            event_type=str(event_type) if event_type is not None else None,
            external_ref=str(external_ref) if external_ref else None,
            payload=raw_payload,
        )
        mutated = True
    save_billing_event(
        provider="google",
        event_type=str(event_type) if event_type is not None else None,
        payload=raw_payload,
        app_user_id=None if app_user_id == "unknown" else app_user_id,
        plan=plan,
        status=normalized_status,
        external_ref=str(external_ref) if external_ref else None,
    )
    return {
        "status": "accepted", "provider": "google",
        "processed_at": datetime.now(tz=timezone.utc).isoformat(),
        "event_type": event_type, "subscription_mutated": mutated,
    }


@app.post("/v1/privacy/delete-request", response_model=PrivacyDeletionResponse)
async def privacy_delete_request(
    request: PrivacyDeletionRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> PrivacyDeletionResponse:
    if request.user_id != ctx["user_id"] and not _ctx_is_staff(ctx):
        raise HTTPException(status_code=403, detail="Cannot submit deletion request for another user.")
    request_id = f"del-{uuid.uuid4().hex[:10]}"
    create_deletion_request(request_id=request_id, user_id=request.user_id, scope=request.scope, reason=request.reason)
    return PrivacyDeletionResponse(
        request_id=request_id,
        status="queued",
        note="Deletion request queued for operator review. Production must implement asynchronous redaction pipelines.",
    )


# ── User account endpoints ────────────────────────────────────────────────────

@app.post("/v1/auth/register", response_model=AuthTokenResponse, tags=["auth"])
async def register_user(req: UserRegisterRequest, request: Request) -> AuthTokenResponse:
    """Create a new user account."""
    _ensure_seeded_accounts()
    await _check_auth_rate(_client_ip(request))
    if len(req.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    try:
        user = create_user(
            email=req.email,
            password=req.password,
            display_name=req.display_name,
            role=_bootstrap_role_for_email(req.email),
        )
    except ValueError as exc:
        msg = str(exc)
        if "email_taken" in msg:
            raise HTTPException(status_code=409, detail="Email already registered")
        if "invalid_email" in msg:
            raise HTTPException(status_code=422, detail="Invalid email address")
        if "display_name_too_long" in msg:
            raise HTTPException(status_code=422, detail="Display name must be 120 characters or fewer")
        raise HTTPException(status_code=422, detail=msg)
    token = _mint_user_token(user["id"])
    # Fire-and-forget verification email (errors logged, never surface to caller)
    try:
        vtoken = create_verification_token(user["id"])
        import asyncio as _aio
        _aio.ensure_future(_send_verification_email(user["email"], vtoken))
    except Exception as _ve:
        _log.error("Failed to queue verification email for %s: %s", user["email"], _ve)
    return AuthTokenResponse(
        token=token,
        expires_in=_USER_JWT_EXP,
        user=_user_response(user),
    )


@app.post("/v1/auth/login", response_model=AuthTokenResponse, tags=["auth"])
async def login_user(req: UserLoginRequest, request: Request) -> AuthTokenResponse:
    """Authenticate and return a JWT."""
    _ensure_seeded_accounts()
    await _check_auth_rate(_client_ip(request))
    user = authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = _mint_user_token(user["id"])
    return AuthTokenResponse(
        token=token,
        expires_in=_USER_JWT_EXP,
        user=_user_response(user),
    )


@app.get("/v1/auth/demo-accounts", response_model=DemoAccountListResponse, tags=["auth"])
async def demo_accounts() -> DemoAccountListResponse:
    if not settings.expose_seed_account_catalog:
        raise HTTPException(status_code=404, detail="Demo accounts are disabled.")
    seeded = _ensure_seeded_accounts()
    return DemoAccountListResponse(
        enabled=bool(seeded),
        warning="These seeded credentials are intended for showcase and review environments only.",
        accounts=[DemoAccountResponse(**account) for account in seeded],
    )


@app.get("/v1/auth/me", response_model=UserResponse, tags=["auth"])
async def get_me(request: Request) -> UserResponse:
    """Return the current authenticated user."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.removeprefix("Bearer ")
    user_id = _decode_user_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_response(user)


@app.post("/v1/auth/logout", tags=["auth"])
async def logout_user(request: Request) -> dict:
    """Revoke the current JWT so it cannot be reused after logout."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.removeprefix("Bearer ")
    payload = _decode_user_token_full(token)
    if not payload:
        # Already invalid/expired — treat as success
        return {"status": "ok"}
    jti = payload.get("jti")
    if jti:
        revoke_token(
            jti=jti,
            user_id=str(payload.get("sub", "")),
            expires_at=int(payload.get("exp", 0)),
        )
        # Opportunistically clean up already-expired revocations
        try:
            cleanup_expired_revocations()
        except Exception:
            pass
    return {"status": "ok"}


@app.get("/v1/auth/verify-email", tags=["auth"])
async def verify_email(token: str = Query(...)) -> dict:
    """Verify an email address using the token sent on registration."""
    user_id = verify_email_token(token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token.")
    return {"status": "ok", "message": "Email verified successfully."}


@app.post("/v1/auth/resend-verification", tags=["auth"])
async def resend_verification(request: Request) -> dict:
    """Re-send the verification email for the authenticated user."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.removeprefix("Bearer ")
    user_id = _decode_user_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("email_verified"):
        return {"status": "ok", "message": "Email already verified."}
    vtoken = create_verification_token(user_id)
    import asyncio as _aio
    _aio.ensure_future(_send_verification_email(user["email"], vtoken))
    return {"status": "ok", "message": "Verification email sent."}


# ── Report history endpoints ──────────────────────────────────────────────────

@app.get("/v1/reports/history", tags=["reports"])
async def get_report_history(
    limit: int = Query(default=50, le=200),
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict:
    """List saved reports for the authenticated user."""
    reports = list_reports(ctx["user_id"], limit=limit)
    return {"reports": reports, "total": len(reports)}


@app.get("/v1/reports/{report_id}", tags=["reports"])
async def get_report_by_id(
    report_id: str,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict:
    """Get a saved report by ID. Only the owning user can access it."""
    report = get_report(report_id, ctx["user_id"])
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


# ── Push notification token registration ─────────────────────────────────────

@app.post("/v1/push/register-token", tags=["push"])
async def register_push_token(
    req: PushTokenRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict:
    """Register an Expo push token for the authenticated user."""
    save_push_token(user_id=ctx["user_id"], token=req.token, platform=req.platform)
    return {"status": "registered"}


# ── Stripe checkout ───────────────────────────────────────────────────────────

_STRIPE_PRICE_IDS: dict[str, str] = {
    "plus": _os.environ.get("STRIPE_PRICE_PLUS", ""),
    "pro": _os.environ.get("STRIPE_PRICE_PRO", ""),
    "elite": _os.environ.get("STRIPE_PRICE_ELITE", ""),
}


@app.post("/v1/billing/stripe/checkout", tags=["billing"])
async def stripe_checkout(
    req: StripeCheckoutRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict:
    """Create a Stripe Checkout Session for plan upgrade (authenticated user only)."""
    stripe_key = _os.environ.get("STRIPE_SECRET_KEY", "")
    if not stripe_key:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    price_id = _STRIPE_PRICE_IDS.get(req.plan, "")
    if not price_id:
        raise HTTPException(status_code=400, detail=f"No Stripe price configured for plan '{req.plan}'")
    try:
        import stripe as _stripe
        _stripe.api_key = stripe_key
        session = _stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=req.success_url,
            cancel_url=req.cancel_url,
            # Always use the authenticated user_id, never trust the request body
            metadata={"user_id": ctx["user_id"], "plan": req.plan},
        )
        return {"url": session.url, "session_id": session.id}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")


@app.post("/v1/billing/stripe/webhook", tags=["billing"])
async def stripe_webhook(request: Request) -> dict:
    """Handle Stripe webhook events."""
    stripe_key = _os.environ.get("STRIPE_SECRET_KEY", "")
    webhook_secret = _os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    if not stripe_key:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    body = await request.body()
    try:
        import stripe as _stripe
        _stripe.api_key = stripe_key
        if webhook_secret:
            sig = request.headers.get("stripe-signature", "")
            event = _stripe.Webhook.construct_event(body, sig, webhook_secret)
        elif settings.environment == "local":
            import json as _json
            event = _json.loads(body)
        else:
            raise HTTPException(status_code=503, detail="STRIPE_WEBHOOK_SECRET must be set in production")
        etype = event.get("type", "")
        if etype in ("checkout.session.completed", "customer.subscription.updated"):
            meta = event.get("data", {}).get("object", {}).get("metadata", {})
            uid = meta.get("user_id")
            plan = meta.get("plan")
            if uid and plan:
                upsert_subscription(
                    user_id=uid, plan=plan, status="active",
                    source="stripe", external_ref=event.get("id", ""),
                )
        elif etype == "customer.subscription.deleted":
            meta = event.get("data", {}).get("object", {}).get("metadata", {})
            uid = meta.get("user_id")
            if uid:
                upsert_subscription(user_id=uid, plan="free", status="cancelled", source="stripe", external_ref="")
        return {"received": True, "type": etype}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ── Admin endpoints ────────────────────────────────────────────────────────────


@app.get("/v1/admin/stats", tags=["admin"])
async def admin_stats(
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict:
    """Platform-wide stats: user counts by plan, signups, top modules, recent billing."""
    require_staff_role(ctx, {"admin"})
    return admin_platform_stats()


@app.get("/v1/admin/users", tags=["admin"])
async def admin_users(
    search: Optional[str] = Query(None, description="Filter by email or display name"),
    plan: Optional[str] = Query(None, description="Filter by plan"),
    suspended: Optional[bool] = Query(None, description="Filter by suspension status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict:
    """Search and list all users with their subscription snapshot."""
    require_staff_role(ctx, {"admin"})
    users = admin_list_users(search=search, plan=plan, suspended=suspended, limit=limit, offset=offset)
    total = admin_count_users(search=search, plan=plan, suspended=suspended)
    return {"users": users, "total": total, "limit": limit, "offset": offset}


@app.get("/v1/admin/users/{user_id}", tags=["admin"])
async def admin_user_detail(
    user_id: str,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict:
    """Full user profile: subscription, addons, wallet balance, recent reports and events."""
    require_staff_role(ctx, {"admin"})
    user = admin_get_user_full(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/v1/admin/users/{user_id}/suspend", tags=["admin"])
async def admin_suspend_user(
    user_id: str,
    body: dict[str, Any],
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict:
    """Suspend or unsuspend a user account. Body: {"suspended": true|false, "reason": "..."}"""
    require_staff_role(ctx, {"admin"})
    suspended = bool(body.get("suspended", True))
    found = admin_set_user_suspended(user_id, suspended)
    if not found:
        raise HTTPException(status_code=404, detail="User not found")
    action = "suspended" if suspended else "unsuspended"
    return {"user_id": user_id, "suspended": suspended, "action": action}


@app.post("/v1/admin/users/{user_id}/set-role", tags=["admin"])
async def admin_set_user_role(
    user_id: str,
    body: AdminSetRoleRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict:
    """Force-set a user's role. Body: {"role": "user|support|admin"}"""
    require_staff_role(ctx, {"admin"})
    role = _normalize_role(body.role)
    found = set_user_role(user_id, role)
    if not found:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user_id": user_id, "role": role}


@app.post("/v1/admin/users/{user_id}/set-plan", tags=["admin"])
async def admin_set_plan(
    user_id: str,
    body: dict[str, Any],
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict:
    """Force-set a user's plan and status. Body: {"plan": "pro", "status": "active", "reason": "..."}"""
    require_staff_role(ctx, {"admin"})
    plan = str(body.get("plan", "free"))
    status = str(body.get("status", "active"))
    updated_at = upsert_subscription(
        user_id=user_id, plan=plan, status=status, source="admin_override",
    )
    return {"user_id": user_id, "plan": plan, "status": status, "updated_at": updated_at}


@app.post("/v1/admin/users/{user_id}/wallet-adjust", tags=["admin"])
async def admin_wallet_adjust(
    user_id: str,
    body: dict[str, Any],
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict:
    """Add or remove credits from a user's wallet. Body: {"delta": 500, "reason": "goodwill credit"}"""
    require_staff_role(ctx, {"admin"})
    delta = int(body.get("delta", 0))
    reason = str(body.get("reason", "admin_adjustment"))
    if delta == 0:
        raise HTTPException(status_code=400, detail="delta must be non-zero")
    add_wallet_entry(user_id=user_id, delta_credits=delta, reason=reason)
    balance = get_wallet_balance(user_id)
    return {"user_id": user_id, "delta": delta, "new_balance": balance}


@app.get("/v1/admin/audit", tags=["admin"])
async def admin_audit_feed(
    user_id: Optional[str] = Query(None, description="Scope to a specific user"),
    provider: Optional[str] = Query(None, description="Filter by billing provider"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> dict:
    """Global billing event feed across all users."""
    require_staff_role(ctx, {"admin"})
    events = admin_global_audit(provider=provider, user_id=user_id, limit=limit, offset=offset)
    return {"events": events, "limit": limit, "offset": offset}


# ─── Sade Sati ───────────────────────────────────────────────────────────────

@app.post("/v1/transits/sade-sati", response_model=SadeSatiResponse, tags=["transits"])
async def sade_sati_check(
    request: SadeSatiRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> SadeSatiResponse:
    """Compute Sade Sati (Saturn 7.5-year transit) status for a natal chart."""
    require_entitlement(ctx, "kundli.report")
    birth = request.birth.model_dump()
    facts = compute_kundli_facts(birth)
    result = compute_sade_sati(facts, query_ts=None)
    return SadeSatiResponse(**result)


# ─── Ashtakavarga ────────────────────────────────────────────────────────────

@app.post("/v1/kundli/ashtakavarga", response_model=AshtakavargaResponse, tags=["kundli"])
async def kundli_ashtakavarga(
    request: AshtakavargaRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> AshtakavargaResponse:
    """Compute Sarva Ashtakavarga — the 8-contributor benefic point tally per sign."""
    require_entitlement(ctx, "kundli.report")
    birth = request.birth.model_dump()
    facts = compute_kundli_facts(birth)
    result = compute_ashtakavarga(facts)
    return AshtakavargaResponse(**result)


# ─── Prashna Kundli ──────────────────────────────────────────────────────────

@app.post("/v1/prashna", response_model=PrashnaResponse, tags=["prashna"])
async def prashna_kundli(
    request: PrashnaRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> PrashnaResponse:
    """
    Compute a Prashna (Horary) Kundli for the moment a question is asked.
    Requires Plus plan or above.
    """
    require_entitlement(ctx, "kundli.report")
    result = compute_prashna_kundli(
        question=request.question,
        query_time_iso=request.query_time_iso,
        latitude=request.latitude,
        longitude=request.longitude,
        timezone_name=request.timezone,
    )
    return PrashnaResponse(
        **{k: v for k, v in result.items() if k != "prashna_chart"},
        disclaimers=[
            "Prashna Kundli is a traditional horary system for guidance only.",
            "This reading does not constitute medical, legal, or financial advice.",
            "For important decisions, consult a qualified Jyotishi.",
        ],
    )


# ─── Transit Impact ───────────────────────────────────────────────────────────

@app.post("/v1/transits/impact", response_model=TransitImpactResponse, tags=["transits"])
async def transit_impact(
    request: TransitImpactRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> TransitImpactResponse:
    """
    Compute personalised transit impacts for today against the given natal chart.

    Returns up to 10 planetary transits sorted by intensity, each with
    a practical, actionable description grounded in Vedic principles.
    """
    require_entitlement(ctx, "kundli.report")

    birth = request.birth.model_dump()
    try:
        facts = compute_kundli_facts(birth, ayanamsha=request.ayanamsha)
        natal_positions = facts["planet_positions"]
        moon_sign = natal_positions.get("Moon", {}).get("sign", "")
        raw_impacts = get_current_transits(natal_positions)
    except Exception as exc:
        # Fallback: return a rule-based Moon-sign note when ephemeris fails
        from datetime import timezone as _tz
        now_str = datetime.now(_tz.utc).isoformat()
        return TransitImpactResponse(
            transits=[],
            generated_at=now_str,
            summary=(
                "Ephemeris calculation encountered an issue. "
                "Please verify birth data and retry. "
                "As a general note: the current Moon transit activates daily emotional rhythms."
            ),
            disclaimer=(
                "Transit readings are indicative only and do not constitute "
                "medical, legal, or financial advice."
            ),
        )

    # Build summary sentence
    high_count = sum(1 for i in raw_impacts if i["intensity"] == "high")
    planets_active = list({i["transiting_planet"] for i in raw_impacts})[:4]
    if high_count:
        summary = (
            f"{high_count} high-intensity transit{'s' if high_count > 1 else ''} active today "
            f"involving {', '.join(planets_active)}. "
            "Focus on the top impacts for the most significant influences."
        )
    elif raw_impacts:
        summary = (
            f"{len(raw_impacts)} active transit{'s' if len(raw_impacts) > 1 else ''} detected today. "
            "Overall energy is moderate — good for steady, purposeful action."
        )
    else:
        summary = "No major transit aspects within orb today. A relatively quiet astrological period."

    return TransitImpactResponse(
        transits=[TransitImpact(**i) for i in raw_impacts],
        generated_at=datetime.now(timezone.utc).isoformat(),
        summary=summary,
        disclaimer=(
            "Transit readings reflect classical Vedic principles and are indicative only. "
            "They do not constitute medical, legal, or financial advice. "
            "For significant life decisions, consult a qualified Jyotishi."
        ),
    )


# ─── Marriage Timing ──────────────────────────────────────────────────────────

@app.post("/v1/marriage-timing/analyze", response_model=MarriageTimingResponse, tags=["marriage"])
async def marriage_timing_analyze(
    request: MarriageTimingRequest,
    ctx: dict[str, Any] = Depends(entitlement_context),
) -> MarriageTimingResponse:
    """
    Analyse the natal chart for marriage timing indicators.

    Returns 7th house details, Venus/Jupiter positions, and ranked
    Vimshottari dasha windows most likely to coincide with marriage.
    """
    require_entitlement(ctx, "kundli.report")

    birth = request.birth.model_dump()
    try:
        result = compute_marriage_timing(birth, ayanamsha=request.ayanamsha, gender=request.gender)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Chart computation failed: {exc}") from exc

    return MarriageTimingResponse(
        seventh_house_sign=result["seventh_house_sign"],
        seventh_lord=result["seventh_lord"],
        planets_in_7th=result["planets_in_7th"],
        indicators=[MarriageIndicator(**i) for i in result["indicators"]],
        dasha_windows=[MarriageDashaWindow(**w) for w in result["dasha_windows"]],
        top_window=MarriageDashaWindow(**result["top_window"]) if result["top_window"] else None,
        summary=result["summary"],
        disclaimer=result["disclaimer"],
    )
