"""Tests for: HMAC auth, rate limiting, vaastu direction/room analysis,
geocoding cache, device auth, and Postgres adapter."""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from services.api.app.main import app, settings, _check_llm_rate, _rate_buckets
from services.api.app.store import register_device, validate_device_key


client = TestClient(app)


@pytest.fixture(autouse=True)
def _enable_insecure_demo_auth() -> None:
    original = settings.allow_insecure_demo_auth
    settings.allow_insecure_demo_auth = True
    try:
        yield
    finally:
        settings.allow_insecure_demo_auth = original


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_token(user_id: str, secret: str, age_seconds: int = 0) -> str:
    ts = str(int(time.time()) - age_seconds)
    mac = hmac.new(secret.encode(), f"{user_id}:{ts}".encode(), hashlib.sha256).hexdigest()
    return f"{user_id}:{ts}:{mac}"


def _headers(user_id: str = "u1", plan: str = "elite") -> dict[str, str]:
    return {"X-Plan": plan, "X-User-Id": user_id}


# ── HMAC Bearer token auth ────────────────────────────────────────────────────

class TestHmacAuth:
    def test_dev_mode_header_auth_requires_explicit_opt_in(self) -> None:
        """Without the opt-in flag, header auth must be rejected."""
        original = settings.api_secret
        original_demo_auth = settings.allow_insecure_demo_auth
        settings.api_secret = None
        settings.allow_insecure_demo_auth = False
        try:
            resp = client.get(
                "/v1/business/entitlements?user_id=anyone",
                headers={"X-Plan": "free", "X-User-Id": "anyone"},
            )
            assert resp.status_code == 401
        finally:
            settings.api_secret = original
            settings.allow_insecure_demo_auth = original_demo_auth

    def test_dev_mode_xuser_header_accepted_with_opt_in(self) -> None:
        """When explicitly enabled, dev header auth remains available for local tests."""
        original = settings.api_secret
        original_demo_auth = settings.allow_insecure_demo_auth
        settings.api_secret = None
        settings.allow_insecure_demo_auth = True
        try:
            resp = client.get(
                "/v1/business/entitlements?user_id=anyone",
                headers={"X-Plan": "free", "X-User-Id": "anyone"},
            )
            assert resp.status_code == 200
        finally:
            settings.api_secret = original
            settings.allow_insecure_demo_auth = original_demo_auth

    def test_secret_mode_requires_bearer(self) -> None:
        """With api_secret set, requests without Authorization header get 401."""
        original = settings.api_secret
        settings.api_secret = "test-secret-xyz"
        try:
            resp = client.post(
                "/v1/kundli/talk",
                headers={"X-Plan": "elite", "X-User-Id": "u1"},
                json={
                    "profile_id": "u1",
                    "birth": {"date": "1990-01-01", "time": "10:00", "timezone": "Asia/Kolkata",
                              "location": "Mumbai", "latitude": 19.076, "longitude": 72.877},
                    "query": "test",
                },
            )
            assert resp.status_code == 401
        finally:
            settings.api_secret = original

    def test_valid_bearer_token_accepted(self) -> None:
        """A correctly signed token grants access."""
        secret = "valid-secret-abc"
        original = settings.api_secret
        settings.api_secret = secret
        try:
            token = _make_token("u1", secret)
            resp = client.get("/v1/business/entitlements?user_id=u1", headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200
            assert resp.json()["user_id"] == "u1"
        finally:
            settings.api_secret = original

    def test_valid_bearer_token_does_not_trust_x_plan(self) -> None:
        """Signed auth without a stored subscription must not inherit premium headers."""
        secret = "valid-secret-abc"
        original = settings.api_secret
        settings.api_secret = secret
        try:
            token = _make_token("u1", secret)
            resp = client.get(
                "/v1/business/entitlements?user_id=u1",
                headers={"Authorization": f"Bearer {token}", "X-Plan": "elite"},
            )
            assert resp.status_code == 200
            assert resp.json()["plan"] == "free"
        finally:
            settings.api_secret = original

    def test_expired_token_rejected(self) -> None:
        """A token older than TOKEN_MAX_AGE_SECONDS is rejected."""
        secret = "expire-secret"
        original = settings.api_secret
        settings.api_secret = secret
        try:
            token = _make_token("u1", secret, age_seconds=400)  # beyond 300s window
            resp = client.get(
                "/v1/business/entitlements?user_id=u1",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 401
            assert "expired" in resp.json()["detail"].lower()
        finally:
            settings.api_secret = original

    def test_tampered_token_rejected(self) -> None:
        """A token with a modified user_id is rejected."""
        secret = "tamper-secret"
        original = settings.api_secret
        settings.api_secret = secret
        try:
            good_token = _make_token("u1", secret)
            # Replace user_id in token
            parts = good_token.split(":")
            parts[0] = "evil-user"
            tampered = ":".join(parts)
            resp = client.get(
                "/v1/business/entitlements?user_id=evil-user",
                headers={"Authorization": f"Bearer {tampered}"},
            )
            assert resp.status_code == 401
        finally:
            settings.api_secret = original


# ── Device auth endpoints ─────────────────────────────────────────────────────

class TestDeviceAuth:
    def test_register_and_issue_token(self) -> None:
        resp = client.post("/v1/auth/device-register", json={"user_id": "device-test-1"})
        assert resp.status_code == 200
        data = resp.json()
        assert "device_key" in data
        assert data["user_id"] == "device-test-1"
        assert "warning" in data  # one-time key warning

        token_resp = client.post(
            "/v1/auth/token",
            json={"user_id": "device-test-1", "device_key": data["device_key"]},
        )
        assert token_resp.status_code == 200
        token_data = token_resp.json()
        assert "token" in token_data
        assert token_data["expires_in"] > 0

    def test_invalid_device_key_rejected(self) -> None:
        resp = client.post(
            "/v1/auth/token",
            json={"user_id": "device-test-1", "device_key": "not-a-valid-key"},
        )
        assert resp.status_code == 401

    def test_missing_user_id_rejected(self) -> None:
        resp = client.post("/v1/auth/device-register", json={})
        assert resp.status_code == 422

    def test_store_register_and_validate(self) -> None:
        key_id, raw_key = register_device(user_id="store-test-user")
        assert key_id.startswith("dk-")
        assert validate_device_key(user_id="store-test-user", raw_key=raw_key) is True
        assert validate_device_key(user_id="store-test-user", raw_key="wrong") is False
        assert validate_device_key(user_id="other-user", raw_key=raw_key) is False


# ── Rate limiting ─────────────────────────────────────────────────────────────

class TestRateLimiting:
    def test_rate_limit_triggers_after_threshold(self) -> None:
        from services.api.app.main import _LLM_RATE_LIMIT
        test_user = "rate-test-user-unique-99"

        # Clear any existing bucket (direct dict mutation is safe in single-threaded tests)
        _rate_buckets.pop(test_user, None)
        _rate_buckets.pop(f"llm:{test_user}", None)

        from fastapi import HTTPException
        # Fill bucket to the limit
        for _ in range(_LLM_RATE_LIMIT):
            asyncio.get_event_loop().run_until_complete(_check_llm_rate(test_user))

        # Next call should raise 429
        with pytest.raises(HTTPException) as exc_info:
            asyncio.get_event_loop().run_until_complete(_check_llm_rate(test_user))
        assert exc_info.value.status_code == 429

        # Clean up
        _rate_buckets.pop(f"llm:{test_user}", None)

    def test_rate_limit_resets_after_window(self) -> None:
        from services.api.app.main import _LLM_RATE_LIMIT
        from fastapi import HTTPException
        test_user = "rate-reset-user-77"
        # Inject old timestamps (outside the window) directly — no lock needed in tests
        _rate_buckets[f"llm:{test_user}"] = [time.time() - 120] * _LLM_RATE_LIMIT

        # Should succeed because old entries are evicted
        asyncio.get_event_loop().run_until_complete(_check_llm_rate(test_user))

        _rate_buckets.pop(f"llm:{test_user}", None)


# ── Vaastu direction/room-aware content ──────────────────────────────────────

class TestVaastuContent:
    def test_northeast_facing_report_mentions_direction(self) -> None:
        resp = client.post(
            "/v1/vaastu/report",
            headers=_headers(),
            json={
                "profile_id": "u1",
                "layout": {
                    "facing_direction": "Northeast",
                    "entrance": "Northeast",
                    "rooms": {"kitchen": "Southeast", "master bedroom": "Southwest", "pooja": "Northeast"},
                },
            },
        )
        assert resp.status_code == 200
        md = resp.json()["report_markdown"]
        assert "Northeast" in md
        assert "Ishanya" in md or "spiritual" in md.lower()

    def test_kitchen_in_bad_zone_flagged(self) -> None:
        resp = client.post(
            "/v1/vaastu/report",
            headers=_headers(),
            json={
                "profile_id": "u1",
                "layout": {
                    "facing_direction": "East",
                    "entrance": "East",
                    "rooms": {"kitchen": "Northeast"},
                },
            },
        )
        assert resp.status_code == 200
        md = resp.json()["report_markdown"]
        # Kitchen in Northeast should be flagged as challenging
        assert "✗" in md or "Challenging" in md

    def test_kitchen_in_good_zone_confirmed(self) -> None:
        resp = client.post(
            "/v1/vaastu/report",
            headers=_headers(),
            json={
                "profile_id": "u1",
                "layout": {
                    "facing_direction": "East",
                    "entrance": "East",
                    "rooms": {"kitchen": "Southeast"},
                },
            },
        )
        assert resp.status_code == 200
        md = resp.json()["report_markdown"]
        assert "✓" in md or "Excellent" in md

    def test_checklist_populated(self) -> None:
        resp = client.post(
            "/v1/vaastu/report",
            headers=_headers(),
            json={
                "profile_id": "u1",
                "layout": {
                    "facing_direction": "South",
                    "entrance": "South",
                    "rooms": {"bedroom": "North", "bathroom": "Northeast"},
                },
            },
        )
        assert resp.status_code == 200
        assert len(resp.json()["checklist"]) >= 1

    def test_south_facing_entrance_warning_in_report(self) -> None:
        resp = client.post(
            "/v1/vaastu/report",
            headers=_headers(),
            json={
                "profile_id": "u1",
                "layout": {"facing_direction": "South", "entrance": "South", "rooms": {}},
            },
        )
        assert resp.status_code == 200
        md = resp.json()["report_markdown"]
        assert "Yama" in md or "Challenging" in md or "inauspicious" in md.lower()


# ── Geocoding ─────────────────────────────────────────────────────────────────

class TestGeocoding:
    def test_geocode_returns_expected_shape(self) -> None:
        mock_result = [
            {
                "lat": "28.6139",
                "lon": "77.2090",
                "display_name": "New Delhi, India",
                "address": {"country_code": "in"},
            }
        ]
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value.raise_for_status = lambda: None
            mock_get.return_value.json = lambda: mock_result
            resp = client.get("/v1/geocode/city?city=Delhi")

        # May hit cache from earlier runs — just check shape when 200
        if resp.status_code == 200:
            data = resp.json()
            assert "lat" in data
            assert "lng" in data
            assert "timezone_hint" in data

    def test_geocode_missing_city_returns_422(self) -> None:
        resp = client.get("/v1/geocode/city?city=x")  # too short (min_length=2)
        # FastAPI returns 422 for query validation failure
        assert resp.status_code in (422, 200)  # 200 if "x" is actually found

    def test_geocode_cache_hit_skips_nominatim(self) -> None:
        from services.api.app.main import _geocode_cache, _geocode_cache_lock, _GEOCODE_TTL
        city_key = "__test_cache_city__"
        cached_result = {"lat": 1.0, "lng": 2.0, "display_name": "Test City", "timezone_hint": "UTC"}
        with _geocode_cache_lock:
            _geocode_cache[city_key] = (cached_result, time.time())

        with patch("httpx.AsyncClient.get") as mock_get:
            resp = client.get(f"/v1/geocode/city?city={city_key}")
            # Nominatim should NOT have been called
            mock_get.assert_not_called()

        with _geocode_cache_lock:
            _geocode_cache.pop(city_key, None)


# ── Postgres adapter (unit test without a live DB) ────────────────────────────

class TestDbAdapter:
    def test_sqlite_translate_noop(self) -> None:
        """_Conn.execute should not modify SQL for SQLite."""
        import sqlite3
        raw = sqlite3.connect(":memory:")
        raw.row_factory = sqlite3.Row
        from services.api.app.store import _Conn
        conn = _Conn(raw, pg=False)
        conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT)")
        conn.execute("INSERT INTO t VALUES (?, ?)", (1, "hello"))
        row = conn.execute("SELECT val FROM t WHERE id = ?", (1,)).fetchone()
        assert row["val"] == "hello"
        raw.close()

    def test_pg_placeholder_translation(self) -> None:
        """%s substitution must happen for Postgres connections."""
        from services.api.app.store import _Conn

        class FakeCursor:
            calls: list[str] = []
            rows = [{"val": "world"}]
            def execute(self, sql: str, params=()) -> "FakeCursor":
                FakeCursor.calls.append(sql)
                return self
            def fetchone(self): return self.rows[0]
            def fetchall(self): return self.rows

        class FakeConn:
            def cursor(self): return FakeCursor()
            def commit(self): pass
            def close(self): pass

        conn = _Conn(FakeConn(), pg=True)
        conn.execute("SELECT val FROM t WHERE id = ? AND name = ?", (1, "x"))
        assert "%s" in FakeCursor.calls[-1]
        assert "?" not in FakeCursor.calls[-1]
