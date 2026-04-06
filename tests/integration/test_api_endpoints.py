import hashlib
import hmac
import json
import pytest
from fastapi.testclient import TestClient
from uuid import uuid4

from services.api.app.main import app, settings


client = TestClient(app)


@pytest.fixture(autouse=True)
def _enable_insecure_demo_auth() -> None:
    original = settings.allow_insecure_demo_auth
    settings.allow_insecure_demo_auth = True
    try:
        yield
    finally:
        settings.allow_insecure_demo_auth = original


def _hmac_signature(payload: dict[str, object], secret: str) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hmac.new(secret.encode("utf-8"), canonical, hashlib.sha256).hexdigest()


def _register_admin_user() -> tuple[str, str]:
    original_admin_emails = settings.admin_emails
    admin_email = f"admin-{uuid4().hex[:8]}@example.com"
    settings.admin_emails = admin_email
    response = client.post(
        "/v1/auth/register",
        json={"email": admin_email, "password": "StrongPass123", "display_name": "Admin Reviewer"},
    )
    assert response.status_code == 200
    return response.json()["user"]["id"], original_admin_emails


def test_vaastu_report_endpoint() -> None:
    response = client.post(
        "/v1/vaastu/report",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={
            "profile_id": "u1",
            "layout": {
                "facing_direction": "East",
                "rooms": {"kitchen": "Southeast"},
                "entrance": "North",
            },
            "include_video": False,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "Vaastu Report" in data["report_markdown"]


def test_video_vaastu_endpoint() -> None:
    response = client.post(
        "/v1/video/vaastu",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={"profile_id": "u1", "topic": "vaastu", "payload": {"room": "living"}},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "queued"


def test_insight_endpoints() -> None:
    tarot = client.post(
        "/v1/tarot/read",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={"profile_id": "u1", "spread": "three-card", "intention": "career focus"},
    )
    assert tarot.status_code == 200
    assert "cards" in tarot.json()

    numerology = client.post(
        "/v1/numerology/report",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={"profile_id": "u1", "full_name": "Aditi Sharma", "birth_date": "1994-02-10"},
    )
    assert numerology.status_code == 200
    assert numerology.json()["life_path_number"] >= 1

    mantra = client.post(
        "/v1/mantra/plan",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={"profile_id": "u1", "focus_area": "focus", "minutes_per_day": 15, "days_per_week": 5},
    )
    assert mantra.status_code == 200
    assert "suggested_mantra" in mantra.json()


def test_matchmaking_panchang_and_muhurta_endpoints() -> None:
    panchang = client.post(
        "/v1/panchang/daily",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={
            "profile_id": "u1",
            "date": "2026-02-27",
            "timezone": "Asia/Kolkata",
            "location": "Mumbai",
        },
    )
    assert panchang.status_code == 200
    assert "tithi" in panchang.json()

    muhurta = client.post(
        "/v1/muhurta/pick",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={
            "profile_id": "u1",
            "intent": "marriage",
            "date_from": "2026-03-01",
            "date_to": "2026-03-31",
            "timezone": "Asia/Kolkata",
            "constraints": ["weekend preferred"],
        },
    )
    assert muhurta.status_code == 200
    assert len(muhurta.json()["windows"]) >= 1

    match = client.post(
        "/v1/matchmaking/compare",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={
            "seeker": {
                "profile_id": "a",
                "name": "Anaya",
                "birth": {
                    "date": "1992-04-11",
                    "time": "09:10",
                    "timezone": "Asia/Kolkata",
                    "location": "Delhi",
                    "latitude": 28.6139,
                    "longitude": 77.209,
                },
            },
            "partner": {
                "profile_id": "b",
                "name": "Rohan",
                "birth": {
                    "date": "1991-08-24",
                    "time": "18:30",
                    "timezone": "Asia/Kolkata",
                    "location": "Pune",
                    "latitude": 18.5204,
                    "longitude": 73.8567,
                },
            },
            "rubric": "guna-milan-core",
        },
    )
    assert match.status_code == 200
    assert 0 <= match.json()["compatibility_score"] <= 100


def test_kundli_talk_and_consult_summary_and_privacy() -> None:
    talk = client.post(
        "/v1/kundli/talk",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={
            "profile_id": "u1",
            "birth": {
                "date": "1990-01-01",
                "time": "10:00",
                "timezone": "Asia/Kolkata",
                "location": "Mumbai",
                "latitude": 19.0760,
                "longitude": 72.8777,
            },
            "query": "How should I handle career transitions this year?",
        },
    )
    assert talk.status_code == 200
    assert "answer" in talk.json()

    consult = client.post(
        "/v1/consult/realtime/session",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={
            "profile_id": "u1",
            "mode": "video",
            "consent_recording": True,
            "consent_transcription": True,
            "consent_memory": True,
        },
    )
    assert consult.status_code == 200
    session_id = consult.json()["session_id"]

    summary = client.post(
        "/v1/consult/summary",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={
            "session_id": session_id,
            "profile_id": "u1",
            "transcript_excerpt": "Discussed career alignment and communication patterns.",
            "requested_focus": "career",
        },
    )
    assert summary.status_code == 200
    assert "action_plan" in summary.json()

    deletion = client.post(
        "/v1/privacy/delete-request",
        headers={"X-Plan": "elite", "X-User-Id": "u1"},
        json={"user_id": "u1", "scope": "consults", "reason": "cleanup"},
    )
    assert deletion.status_code == 200
    assert deletion.json()["status"] == "queued"


def test_product_analytics_event_endpoint() -> None:
    response = client.post(
        "/v1/analytics/events",
        headers={"X-Plan": "free", "X-User-Id": "ux-user-1"},
        json={
            "name": "page_view",
            "page": "/kundli",
            "session_id": "sess-test-1",
            "source": "web",
            "metadata": {"entry": "hero"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "accepted"
    assert data["event_id"].startswith("evt_")


def test_demo_account_catalog_exposes_seeded_access() -> None:
    original = settings.expose_seed_account_catalog
    settings.expose_seed_account_catalog = True
    try:
        response = client.get("/v1/auth/demo-accounts")
        assert response.status_code == 200
        accounts = response.json()["accounts"]
        assert any(a["email"] == "admin@babaji.app" and a["role"] == "admin" and a["plan"] == "elite" for a in accounts)
        assert any(a["email"] == "support@babaji.app" and a["role"] == "support" for a in accounts)
    finally:
        settings.expose_seed_account_catalog = original


def test_business_workflows() -> None:
    user_id = f"biz-user-{uuid4().hex[:8]}"
    admin_user_id, original_admin_emails = _register_admin_user()

    try:
        catalog = client.get("/v1/business/catalog")
        assert catalog.status_code == 200
        assert len(catalog.json()["plans"]) >= 4

        unauthorized_sub = client.post(
            "/v1/business/subscription/change",
            headers={"X-Plan": "free", "X-User-Id": user_id},
            json={"user_id": user_id, "plan": "plus", "source": "web"},
        )
        assert unauthorized_sub.status_code == 403

        sub = client.post(
            "/v1/business/subscription/change",
            headers={"X-Plan": "free", "X-User-Id": admin_user_id},
            json={"user_id": user_id, "plan": "plus", "source": "web"},
        )
        assert sub.status_code == 200
        assert sub.json()["plan"] == "plus"

        addon = client.post(
            "/v1/business/addons/purchase",
            headers={"X-Plan": "plus", "X-User-Id": admin_user_id},
            json={"user_id": user_id, "addon_id": "vaastu_studio_addon", "source": "web"},
        )
        assert addon.status_code == 200
        assert addon.json()["status"] == "active"

        addon_revoke = client.post(
            "/v1/business/addons/revoke",
            headers={"X-Plan": "plus", "X-User-Id": admin_user_id},
            json={"user_id": user_id, "addon_id": "vaastu_studio_addon", "source": "admin", "reason": "qa revoke"},
        )
        assert addon_revoke.status_code == 200
        assert addon_revoke.json()["status"] == "inactive"

        addon_reactivate = client.post(
            "/v1/business/addons/purchase",
            headers={"X-Plan": "plus", "X-User-Id": admin_user_id},
            json={"user_id": user_id, "addon_id": "vaastu_studio_addon", "source": "web"},
        )
        assert addon_reactivate.status_code == 200
        assert addon_reactivate.json()["status"] == "active"

        topup = client.post(
            "/v1/business/wallet/topup",
            headers={"X-Plan": "plus", "X-User-Id": admin_user_id},
            json={"user_id": user_id, "credits": 500, "amount_usd": 10.0, "source": "web"},
        )
        assert topup.status_code == 200
        assert topup.json()["balance_credits"] >= 500

        bundle = client.post(
            "/v1/business/bundles/purchase",
            headers={"X-Plan": "plus", "X-User-Id": admin_user_id},
            json={"user_id": user_id, "bundle_id": "consult_minutes_60", "source": "web"},
        )
        assert bundle.status_code == 200
        assert bundle.json()["credits_added"] > 0

        offer = client.post(
            "/v1/business/offers/claim",
            headers={"X-Plan": "plus", "X-User-Id": admin_user_id},
            json={"user_id": user_id, "offer_id": "first_session_offer"},
        )
        assert offer.status_code == 200
        assert offer.json()["status"] == "claimed"

        review = client.post(
            "/v1/business/reviews",
            headers={"X-Plan": "plus", "X-User-Id": user_id},
            json={
                "user_id": user_id,
                "module": "vaastu",
                "rating": 5,
                "title": "Useful report",
                "body": "The checklist and cautions were practical and easy to apply in my home.",
                "verified_purchase_id": "order-123",
            },
        )
        assert review.status_code == 200
        review_id = review.json()["review_id"]

        moderated = client.post(
            f"/v1/business/reviews/{review_id}/moderate",
            headers={"X-Plan": "free", "X-User-Id": admin_user_id},
            json={"moderator_id": "mod-1", "action": "approved", "reason": "verified and compliant"},
        )
        assert moderated.status_code == 200
        assert moderated.json()["moderation_status"] == "approved"

        reviews = client.get("/v1/business/reviews?module=vaastu&approved_only=true")
        assert reviews.status_code == 200
        assert len(reviews.json()["reviews"]) >= 1

        dispute = client.post(
            "/v1/business/disputes",
            headers={"X-Plan": "plus", "X-User-Id": user_id},
            json={
                "user_id": user_id,
                "category": "billing",
                "reference_id": "order-123",
                "description": "Charge mismatch between checkout page and final invoice.",
            },
        )
        assert dispute.status_code == 200
        dispute_id = dispute.json()["dispute_id"]

        resolved = client.post(
            f"/v1/business/disputes/{dispute_id}/resolve",
            headers={"X-Plan": "free", "X-User-Id": admin_user_id},
            json={"agent_id": "agent-1", "status": "resolved", "resolution_note": "Refund credited to wallet and receipt emailed."},
        )
        assert resolved.status_code == 200
        assert resolved.json()["status"] == "resolved"

        own_disputes = client.get(
            "/v1/business/disputes",
            headers={"X-Plan": "plus", "X-User-Id": user_id},
        )
        assert own_disputes.status_code == 200
        assert all(item["user_id"] == user_id for item in own_disputes.json()["disputes"])

        refund = client.post(
            "/v1/business/refunds",
            headers={"X-Plan": "plus", "X-User-Id": user_id},
            json={
                "user_id": user_id,
                "reference_id": "order-123",
                "amount_usd": 9.99,
                "reason": "Duplicate charge after checkout retry",
                "source": "web",
            },
        )
        assert refund.status_code == 200
        refund_id = refund.json()["refund_id"]

        refund_resolve = client.post(
            f"/v1/business/refunds/{refund_id}/resolve",
            headers={"X-Plan": "free", "X-User-Id": admin_user_id},
            json={"agent_id": "agent-2", "status": "approved", "resolution_note": "Refund approved and queued for processing."},
        )
        assert refund_resolve.status_code == 200
        assert refund_resolve.json()["status"] == "approved"

        refunds = client.get(
            f"/v1/business/refunds?user_id={user_id}",
            headers={"X-Plan": "plus", "X-User-Id": user_id},
        )
        assert refunds.status_code == 200
        assert len(refunds.json()["refunds"]) >= 1

        sub_events = client.get(
            f"/v1/business/subscription/events?user_id={user_id}",
            headers={"X-Plan": "plus", "X-User-Id": user_id},
        )
        assert sub_events.status_code == 200
        assert len(sub_events.json()["events"]) >= 1

        subscription_revoke = client.post(
            "/v1/business/subscription/revoke",
            headers={"X-Plan": "plus", "X-User-Id": admin_user_id},
            json={"user_id": user_id, "source": "admin", "reason": "qa revoke"},
        )
        assert subscription_revoke.status_code == 200
        assert subscription_revoke.json()["status"] == "inactive"
    finally:
        settings.admin_emails = original_admin_emails


def test_admin_can_set_role_and_suspend_user() -> None:
    admin_user_id, original_admin_emails = _register_admin_user()
    user = client.post(
        "/v1/auth/register",
        json={"email": f"managed-{uuid4().hex[:8]}@example.com", "password": "StrongPass123", "display_name": "Managed User"},
    )
    assert user.status_code == 200
    user_id = user.json()["user"]["id"]

    try:
        promote = client.post(
            f"/v1/admin/users/{user_id}/set-role",
            headers={"X-Plan": "elite", "X-User-Id": admin_user_id},
            json={"role": "support"},
        )
        assert promote.status_code == 200
        assert promote.json()["role"] == "support"

        suspend = client.post(
            f"/v1/admin/users/{user_id}/suspend",
            headers={"X-Plan": "elite", "X-User-Id": admin_user_id},
            json={"suspended": True},
        )
        assert suspend.status_code == 200

        blocked = client.get(
            f"/v1/business/entitlements?user_id={user_id}",
            headers={"X-Plan": "free", "X-User-Id": user_id},
        )
        assert blocked.status_code == 403
        assert "suspended" in blocked.json()["detail"].lower()
    finally:
        settings.admin_emails = original_admin_emails


def test_sensitive_business_endpoints_require_staff_or_self_scope() -> None:
    user_id = f"sec-user-{uuid4().hex[:8]}"
    other_user_id = f"sec-other-{uuid4().hex[:8]}"

    review = client.post(
        "/v1/business/reviews",
        headers={"X-Plan": "plus", "X-User-Id": user_id},
        json={
            "user_id": user_id,
            "module": "vaastu",
            "rating": 5,
            "title": "Helpful review",
            "body": "This review is long enough to satisfy validation rules.",
            "verified_purchase_id": "order-456",
        },
    )
    assert review.status_code == 200
    review_id = review.json()["review_id"]

    cross_user_moderation = client.post(
        f"/v1/business/reviews/{review_id}/moderate",
        headers={"X-Plan": "free", "X-User-Id": other_user_id},
        json={"moderator_id": "fake-mod", "action": "rejected", "reason": "unauthorized"},
    )
    assert cross_user_moderation.status_code == 403

    spoofed_deletion = client.post(
        "/v1/privacy/delete-request",
        headers={"X-Plan": "free", "X-User-Id": user_id},
        json={"user_id": other_user_id, "scope": "all", "reason": "spoofed"},
    )
    assert spoofed_deletion.status_code == 403

    anonymous_disputes = client.get(
        "/v1/business/disputes",
        headers={"X-Plan": "free", "X-User-Id": user_id},
    )
    assert anonymous_disputes.status_code == 200
    assert all(item["user_id"] == user_id for item in anonymous_disputes.json()["disputes"])


def test_cors_preflight_for_web_submit_flows() -> None:
    response = client.options(
        "/v1/kundli/report",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-plan,x-user-id",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_billing_signature_gate_and_entitlement_mutation() -> None:
    original_secret = settings.apple_webhook_secret
    settings.apple_webhook_secret = "unit-test-secret"
    user_id = f"billing-user-{uuid4().hex[:8]}"

    try:
        payload = {
            "notificationType": "DID_RENEW",
            "productId": "elite.monthly",
            "appAccountToken": user_id,
        }
        invalid = client.post(
            "/v1/billing/apple/notifications",
            json={"provider": "apple", "payload": payload},
        )
        assert invalid.status_code == 401

        valid = client.post(
            "/v1/billing/apple/notifications",
            headers={"X-Signature": _hmac_signature(payload, settings.apple_webhook_secret)},
            json={"provider": "apple", "payload": payload},
        )
        assert valid.status_code == 200
        assert valid.json()["subscription_mutated"] is True

        entitlements = client.get(
            f"/v1/business/entitlements?user_id={user_id}",
            headers={"X-Plan": "free", "X-User-Id": user_id},
        )
        assert entitlements.status_code == 200
        assert entitlements.json()["plan"] == "elite"

        grace_payload = {
            "notificationType": "DID_ENTER_BILLING_RETRY",
            "productId": "elite.monthly",
            "appAccountToken": user_id,
        }
        grace = client.post(
            "/v1/billing/apple/notifications",
            headers={"X-Signature": _hmac_signature(grace_payload, settings.apple_webhook_secret)},
            json={"provider": "apple", "payload": grace_payload},
        )
        assert grace.status_code == 200

        grace_entitlements = client.get(
            f"/v1/business/entitlements?user_id={user_id}",
            headers={"X-Plan": "free", "X-User-Id": user_id},
        )
        assert grace_entitlements.status_code == 200
        assert grace_entitlements.json()["status"] == "grace"
        assert "kundli.report" in grace_entitlements.json()["entitlements"]

        billing_events = client.get(
            f"/v1/business/billing/events?user_id={user_id}",
            headers={"X-Plan": "free", "X-User-Id": user_id},
        )
        assert billing_events.status_code == 200
        assert len(billing_events.json()["events"]) >= 1
    finally:
        settings.apple_webhook_secret = original_secret


def test_revoked_subscription_loses_entitlements() -> None:
    """After revocation, plan must fall to 'free' even when X-Plan: elite header is sent."""
    user_id = f"revoke-user-{uuid4().hex[:8]}"
    admin_user_id, original_admin_emails = _register_admin_user()

    try:
        # Activate a plus subscription
        client.post(
            "/v1/business/subscription/change",
            headers={"X-User-Id": admin_user_id},
            json={"user_id": user_id, "plan": "plus", "source": "web"},
        )

        # Verify plus entitlements are active
        before = client.get(
            f"/v1/business/entitlements?user_id={user_id}",
            headers={"X-Plan": "free", "X-User-Id": user_id},
        )
        assert before.status_code == 200
        assert before.json()["plan"] == "plus"
        assert "kundli.report" in before.json()["entitlements"]

        # Revoke the subscription
        client.post(
            "/v1/business/subscription/revoke",
            headers={"X-User-Id": admin_user_id},
            json={"user_id": user_id, "source": "admin", "reason": "test revoke"},
        )

        # Sending X-Plan: elite must NOT restore entitlements when DB record exists but is inactive
        after = client.get(
            f"/v1/business/entitlements?user_id={user_id}",
            headers={"X-Plan": "elite", "X-User-Id": user_id},
        )
        assert after.status_code == 200
        assert after.json()["plan"] == "free"
        assert "kundli.report" not in after.json()["entitlements"]
    finally:
        settings.admin_emails = original_admin_emails


def test_cross_user_access_denied() -> None:
    """User A must not be able to read or mutate User B's wallet, disputes, or refunds."""
    user_a = f"user-a-{uuid4().hex[:8]}"
    user_b = f"user-b-{uuid4().hex[:8]}"
    admin_user_id, original_admin_emails = _register_admin_user()

    try:
        # Give user_b a wallet balance
        client.post(
            "/v1/business/wallet/topup",
            headers={"X-User-Id": admin_user_id},
            json={"user_id": user_b, "credits": 100, "amount_usd": 2.0, "source": "web"},
        )

        # User A tries to read User B's wallet — must be denied
        wallet_read = client.get(
            f"/v1/business/wallet?user_id={user_b}",
            headers={"X-User-Id": user_a},
        )
        assert wallet_read.status_code == 403

        # User A tries to debit User B's wallet — must be denied
        debit = client.post(
            "/v1/business/wallet/debit",
            headers={"X-User-Id": user_a},
            json={"user_id": user_b, "credits": 10, "reason": "cross-user attack"},
        )
        assert debit.status_code == 403

        # User B opens a dispute
        dispute = client.post(
            "/v1/business/disputes",
            headers={"X-User-Id": user_b},
            json={"user_id": user_b, "category": "billing", "reference_id": "ref-1", "description": "Charge mismatch on invoice."},
        )
        assert dispute.status_code == 200

        # User A tries to open a dispute on behalf of User B — must be denied
        cross_dispute = client.post(
            "/v1/business/disputes",
            headers={"X-User-Id": user_a},
            json={"user_id": user_b, "category": "billing", "reference_id": "ref-2", "description": "User A opening dispute for User B."},
        )
        assert cross_dispute.status_code == 403

        # User A tries to read User B's refunds — must be denied
        refunds = client.get(
            f"/v1/business/refunds?user_id={user_b}",
            headers={"X-User-Id": user_a},
        )
        assert refunds.status_code == 403
    finally:
        settings.admin_emails = original_admin_emails


def test_free_plan_feature_gating() -> None:
    """Free plan users must receive 403 when accessing entitlement-protected modules."""
    user_id = f"free-user-{uuid4().hex[:8]}"

    # No subscription in DB — header free — should be blocked from paid features
    kundli = client.post(
        "/v1/kundli/report",
        headers={"X-Plan": "free", "X-User-Id": user_id},
        json={
            "profile_id": user_id,
            "birth": {
                "date": "1995-06-15",
                "time": "12:00",
                "timezone": "Asia/Kolkata",
                "location": "Delhi",
                "latitude": 28.6139,
                "longitude": 77.209,
            },
            "question": "test",
        },
    )
    assert kundli.status_code == 403

    vaastu = client.post(
        "/v1/vaastu/report",
        headers={"X-Plan": "free", "X-User-Id": user_id},
        json={
            "profile_id": user_id,
            "layout": {"facing_direction": "East", "rooms": {"kitchen": "SE"}, "entrance": "North"},
        },
    )
    assert vaastu.status_code == 403

    matchmaking = client.post(
        "/v1/matchmaking/compare",
        headers={"X-Plan": "free", "X-User-Id": user_id},
        json={
            "seeker": {
                "profile_id": "a", "name": "A",
                "birth": {"date": "1990-01-01", "time": "10:00", "timezone": "Asia/Kolkata", "location": "Delhi", "latitude": 28.6, "longitude": 77.2},
            },
            "partner": {
                "profile_id": "b", "name": "B",
                "birth": {"date": "1990-01-01", "time": "10:00", "timezone": "Asia/Kolkata", "location": "Delhi", "latitude": 28.6, "longitude": 77.2},
            },
        },
    )
    assert matchmaking.status_code == 403

    # Free plan CAN access ritual and ayurveda (no entitlement gate)
    ritual = client.post(
        "/v1/ritual/guide",
        headers={"X-Plan": "free", "X-User-Id": user_id},
        json={"query": "Suggest a safe morning routine."},
    )
    assert ritual.status_code == 200
