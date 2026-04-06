from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

PLAN_ENTITLEMENTS: dict[str, set[str]] = {
    "free": {"chat.basic", "ritual.guide", "ayurveda.guide"},
    "plus": {
        "chat.basic",
        "kundli.report",
        "kundli.talk",
        "rashifal.feed",
        "panchang.feed",
        "muhurta.pick",
        "tarot.read",
        "numerology.report",
        "mantra.plan",
        "ritual.guide",
        "ayurveda.guide",
    },
    "pro": {
        "chat.basic",
        "kundli.report",
        "kundli.talk",
        "rashifal.feed",
        "panchang.feed",
        "muhurta.pick",
        "kundli.video",
        "matchmaking.studio",
        "tarot.read",
        "numerology.report",
        "mantra.plan",
        "ritual.guide",
        "ayurveda.guide",
    },
    "elite": {
        "chat.basic",
        "kundli.report",
        "kundli.talk",
        "rashifal.feed",
        "panchang.feed",
        "muhurta.pick",
        "kundli.video",
        "matchmaking.studio",
        "tarot.read",
        "numerology.report",
        "mantra.plan",
        "ritual.guide",
        "ayurveda.guide",
        "vaastu.studio",
        "gem.consultancy",
        "consult.video",
    },
}

ADDON_ENTITLEMENTS: dict[str, set[str]] = {
    "vaastu_studio_addon": {"vaastu.studio"},
    "gem_consultancy_addon": {"gem.consultancy"},
    "matchmaking_addon": {"matchmaking.studio"},
    "kundli_video_addon": {"kundli.video"},
    "consult_video_addon": {"consult.video"},
}

BUNDLE_CATALOG: dict[str, dict[str, Any]] = {
    "consult_minutes_60": {
        "name": "Consult Bundle 60",
        "price_usd": 29.0,
        "credits": 600,
        "perks": ["60 consult minutes equivalent credits", "priority scheduling window"],
    },
    "consult_minutes_180": {
        "name": "Consult Bundle 180",
        "price_usd": 79.0,
        "credits": 1800,
        "perks": ["180 consult minutes equivalent credits", "priority scheduling and recap export"],
    },
    "reports_combo": {
        "name": "Reports Combo",
        "price_usd": 39.0,
        "credits": 350,
        "perks": ["1 Kundli video slot", "1 Vaastu walkthrough slot", "report regeneration credits"],
    },
}

OFFERS_CATALOG: dict[str, dict[str, Any]] = {
    "first_session_offer": {
        "name": "First Session Offer",
        "price_usd": 0.0,
        "credits": 120,
        "one_time": True,
        "note": "One-time onboarding credits for first consult trial.",
    }
}

PRICING_CATALOG: dict[str, list[dict[str, Any]]] = {
    "plans": [
        {
            "id": "free",
            "name": "Free",
            "kind": "plan",
            "price_usd": 0.0,
            "description": "Entry tier with core safety-guided chat and educational modules.",
            "entitlement_keys": sorted(PLAN_ENTITLEMENTS["free"]),
        },
        {
            "id": "plus",
            "name": "Plus",
            "kind": "plan",
            "price_usd": 9.0,
            "description": "Adds kundli report/talk, tarot, numerology, mantra, panchang, and muhurta feed.",
            "entitlement_keys": sorted(PLAN_ENTITLEMENTS["plus"]),
        },
        {
            "id": "pro",
            "name": "Pro",
            "kind": "plan",
            "price_usd": 19.0,
            "description": "Adds kundli video and matchmaking studio for deeper analysis flows.",
            "entitlement_keys": sorted(PLAN_ENTITLEMENTS["pro"]),
        },
        {
            "id": "elite",
            "name": "Elite",
            "kind": "plan",
            "price_usd": 39.0,
            "description": "Full suite including vaastu studio, gem consultancy, and consult video.",
            "entitlement_keys": sorted(PLAN_ENTITLEMENTS["elite"]),
        },
    ],
    "addons": [
        {
            "id": "vaastu_studio_addon",
            "name": "Vaastu Studio Add-on",
            "kind": "addon",
            "price_usd": 12.0,
            "description": "Unlocks vaastu report and video walkthrough generation.",
            "entitlement_keys": sorted(ADDON_ENTITLEMENTS["vaastu_studio_addon"]),
        },
        {
            "id": "gem_consultancy_addon",
            "name": "Gem Consultancy Add-on",
            "kind": "addon",
            "price_usd": 8.0,
            "description": "Unlocks educational gemstone consultancy and due diligence toolkit.",
            "entitlement_keys": sorted(ADDON_ENTITLEMENTS["gem_consultancy_addon"]),
        },
        {
            "id": "consult_video_addon",
            "name": "Consult Video Add-on",
            "kind": "addon",
            "price_usd": 10.0,
            "description": "Enables video consult mode on non-elite plans.",
            "entitlement_keys": sorted(ADDON_ENTITLEMENTS["consult_video_addon"]),
        },
        {
            "id": "matchmaking_addon",
            "name": "Matchmaking Studio Add-on",
            "kind": "addon",
            "price_usd": 10.0,
            "description": "Unlocks matchmaking studio compatibility analysis on non-pro/elite plans.",
            "entitlement_keys": sorted(ADDON_ENTITLEMENTS["matchmaking_addon"]),
        },
        {
            "id": "kundli_video_addon",
            "name": "Kundli Video Add-on",
            "kind": "addon",
            "price_usd": 8.0,
            "description": "Unlocks narrated kundli video job queue on non-pro/elite plans.",
            "entitlement_keys": sorted(ADDON_ENTITLEMENTS["kundli_video_addon"]),
        },
    ],
    "bundles": [
        {
            "id": bundle_id,
            "name": definition["name"],
            "kind": "bundle",
            "price_usd": definition["price_usd"],
            "description": ", ".join(definition["perks"]),
            "entitlement_keys": [],
        }
        for bundle_id, definition in BUNDLE_CATALOG.items()
    ],
    "offers": [
        {
            "id": offer_id,
            "name": definition["name"],
            "kind": "offer",
            "price_usd": definition["price_usd"],
            "description": definition["note"],
            "entitlement_keys": [],
        }
        for offer_id, definition in OFFERS_CATALOG.items()
    ],
}

BILLING_PLAN_BY_PRODUCT_FRAGMENT: dict[str, str] = {
    "elite": "elite",
    "pro": "pro",
    "plus": "plus",
    "free": "free",
}

ACTIVE_SUBSCRIPTION_STATUSES = {"active", "grace", "trialing"}
INACTIVE_SUBSCRIPTION_STATUSES = {"inactive", "revoked", "refunded", "expired", "canceled"}


def entitlements_for(plan: str, addons: list[str]) -> set[str]:
    resolved = set(PLAN_ENTITLEMENTS.get(plan, PLAN_ENTITLEMENTS["free"]))
    for addon_id in addons:
        resolved.update(ADDON_ENTITLEMENTS.get(addon_id, set()))
    return resolved


def infer_plan_from_product_id(product_id: str | None) -> str | None:
    if not product_id:
        return None
    lowered = product_id.lower()
    for fragment, plan in BILLING_PLAN_BY_PRODUCT_FRAGMENT.items():
        if fragment in lowered:
            return plan
    return None


def verify_hmac_signature(payload: dict[str, Any], signature: str | None, secret: str | None) -> bool:
    if not secret:
        # No webhook secret configured — bypass only in local/test environments.
        # Set APPLE_WEBHOOK_SECRET / GOOGLE_WEBHOOK_SECRET env vars before production deployment.
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "verify_hmac_signature: no secret configured; accepting webhook without verification."
        )
        return True
    if not signature:
        return False
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    digest = hmac.new(secret.encode("utf-8"), canonical, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature)


def apple_subscription_status(event_type: str | None) -> str:
    if not event_type:
        return "active"
    normalized = str(event_type).strip().upper()
    inactive = {
        "EXPIRED",
        "DID_FAIL_TO_RENEW",
        "REFUND",
        "REVOKE",
        "DID_REVOKE",
    }
    grace = {"DID_ENTER_BILLING_RETRY", "DID_GRACE_PERIOD_EXPIRE"}
    if normalized in inactive:
        return "inactive"
    if normalized in grace:
        return "grace"
    return "active"


def google_subscription_status(notification_type: str | int | None) -> str:
    if notification_type is None:
        return "active"
    code = str(notification_type)
    inactive_codes = {"12", "13", "20"}  # canceled, expired, revoked
    grace_codes = {"5", "6"}  # on-hold, in-grace-period
    if code in inactive_codes:
        return "inactive"
    if code in grace_codes:
        return "grace"
    return "active"
