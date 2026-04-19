from __future__ import annotations

import contextlib
import json
import os
import sqlite3
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent.parent / "cortex_api.sqlite3"

# ── DB write lock ──────────────────────────────────────────────────────────────
# SQLite needs a global write lock to serialise concurrent writes.
# Postgres has its own connection-level locking, so we use a no-op context.

# ── Database abstraction (SQLite default; Postgres when DATABASE_URL is set) ──

_DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
_IS_POSTGRES = _DATABASE_URL.startswith(("postgresql://", "postgres://"))

# Assign the write lock now that _IS_POSTGRES is known.
_LOCK: threading.Lock | contextlib.AbstractContextManager = (
    contextlib.nullcontext() if _IS_POSTGRES else threading.Lock()
)

_PG_DDL_SUBS = [
    ("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY"),
    ("INTEGER PRIMARY KEY", "INTEGER PRIMARY KEY"),  # keep plain PKs unchanged
]


class _Conn:
    """Thin wrapper normalising sqlite3 and psycopg2 connection APIs.

    - Translates ``?`` parameter placeholders to ``%s`` for Postgres.
    - Wraps ``executescript`` (SQLite-only) so Postgres executes each
      statement individually.
    - Row objects from both drivers support ``row["column"]`` access
      (sqlite3.Row and psycopg2 RealDictRow are both dict-like).
    """

    __slots__ = ("_raw", "_pg")

    def __init__(self, raw: Any, pg: bool = False) -> None:
        self._raw = raw
        self._pg = pg

    # ── core ───────────────────────────────────────────────────────────────

    def execute(self, sql: str, params: tuple = ()) -> Any:
        if self._pg:
            sql = sql.replace("?", "%s")
            cur = self._raw.cursor()
            cur.execute(sql, params)
            return cur
        return self._raw.execute(sql, params)

    def executescript(self, sql: str) -> None:
        """Execute a multi-statement DDL block."""
        if self._pg:
            ddl = sql
            for old, new in _PG_DDL_SUBS:
                ddl = ddl.replace(old, new)
            cur = self._raw.cursor()
            for stmt in ddl.split(";"):
                stmt = stmt.strip()
                if stmt:
                    try:
                        cur.execute(stmt)
                    except Exception:
                        pass  # IF NOT EXISTS makes most failures benign
        else:
            self._raw.executescript(sql)

    def commit(self) -> None:
        self._raw.commit()

    def close(self) -> None:
        self._raw.close()

    # ── schema helpers ─────────────────────────────────────────────────────

    def table_columns(self, table_name: str) -> set[str]:
        if self._pg:
            cur = self._raw.cursor()
            cur.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name = %s",
                (table_name,),
            )
            return {row[0] for row in cur.fetchall()}
        rows = self._raw.execute(f"PRAGMA table_info({table_name})").fetchall()
        return {str(row["name"]) for row in rows}

    def ensure_column(self, table_name: str, column_name: str, ddl_type: str) -> None:
        if column_name not in self.table_columns(table_name):
            if self._pg:
                cur = self._raw.cursor()
                cur.execute(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column_name} {ddl_type}")
            else:
                self._raw.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl_type}")


def _connect() -> _Conn:
    if _IS_POSTGRES:
        import psycopg2  # type: ignore[import]
        from psycopg2.extras import RealDictCursor  # type: ignore[import]
        raw = psycopg2.connect(_DATABASE_URL, cursor_factory=RealDictCursor)
        return _Conn(raw, pg=True)
    raw = sqlite3.connect(DB_PATH)
    raw.row_factory = sqlite3.Row
    return _Conn(raw, pg=False)


def _table_columns(conn: _Conn, table_name: str) -> set[str]:
    return conn.table_columns(table_name)


def _ensure_column(conn: _Conn, table_name: str, column_name: str, ddl_type: str) -> None:
    conn.ensure_column(table_name, column_name, ddl_type)


_CURRENT_SCHEMA_VERSION = 6


def _record_migration(conn: "_Conn", version: int) -> None:
    """Record a migration version if it hasn't been applied yet."""
    row = conn.execute(
        "SELECT version FROM schema_migrations WHERE version = ?", (version,)
    ).fetchone()
    if not row:
        conn.execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
            (version, datetime.now(timezone.utc).isoformat()),
        )


def init_db() -> None:
    with _LOCK:
        conn = _connect()
        try:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS consult_sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    profile_id TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    consents_json TEXT NOT NULL,
                    retention_policy TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS consult_summaries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    summary_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS generated_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    report_id TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    profile_id TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS billing_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider TEXT NOT NULL,
                    event_type TEXT,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS product_events (
                    event_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    plan TEXT NOT NULL,
                    name TEXT NOT NULL,
                    page TEXT NOT NULL,
                    session_id TEXT,
                    source TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS privacy_deletion_requests (
                    request_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    reason TEXT,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS user_subscriptions (
                    user_id TEXT PRIMARY KEY,
                    plan TEXT NOT NULL,
                    status TEXT NOT NULL,
                    source TEXT NOT NULL,
                    external_ref TEXT,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS user_addons (
                    user_id TEXT NOT NULL,
                    addon_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    source TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (user_id, addon_id)
                );

                CREATE TABLE IF NOT EXISTS wallet_ledger (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    delta_credits INTEGER NOT NULL,
                    reason TEXT NOT NULL,
                    reference_id TEXT,
                    metadata_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS bundle_purchases (
                    purchase_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    bundle_id TEXT NOT NULL,
                    credits_added INTEGER NOT NULL,
                    source TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS offer_claims (
                    claim_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    offer_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE UNIQUE INDEX IF NOT EXISTS ux_offer_claim_user_offer ON offer_claims(user_id, offer_id);

                CREATE TABLE IF NOT EXISTS reviews (
                    review_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    module TEXT NOT NULL,
                    rating INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    body TEXT NOT NULL,
                    verified_purchase INTEGER NOT NULL,
                    purchase_ref TEXT,
                    moderation_status TEXT NOT NULL,
                    moderation_reason TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS disputes (
                    dispute_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    category TEXT NOT NULL,
                    reference_id TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL,
                    resolution_note TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS subscription_events (
                    event_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    event_type TEXT,
                    old_plan TEXT,
                    new_plan TEXT,
                    old_status TEXT,
                    new_status TEXT,
                    external_ref TEXT,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS refund_requests (
                    refund_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    reference_id TEXT NOT NULL,
                    amount_usd REAL,
                    reason TEXT NOT NULL,
                    status TEXT NOT NULL,
                    resolution_note TEXT,
                    source TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    display_name TEXT NOT NULL DEFAULT '',
                    plan TEXT NOT NULL DEFAULT 'free',
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS saved_reports (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    report_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS push_tokens (
                    user_id TEXT NOT NULL,
                    token TEXT NOT NULL,
                    platform TEXT NOT NULL DEFAULT 'expo',
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (user_id, token)
                );
                CREATE TABLE IF NOT EXISTS revoked_tokens (
                    jti TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    revoked_at TEXT NOT NULL,
                    expires_at INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS ix_revoked_tokens_expires ON revoked_tokens(expires_at);
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INTEGER PRIMARY KEY,
                    applied_at TEXT NOT NULL
                );
                """
            )
            _record_migration(conn, 1)  # base schema

            # Migration 2: email verification columns on users
            conn.ensure_column("users", "email_verified", "INTEGER NOT NULL DEFAULT 0")
            conn.ensure_column("users", "verification_token", "TEXT")
            conn.ensure_column("users", "verification_token_expires_at", "INTEGER")
            _record_migration(conn, 2)

            # Migration 3: RBAC role on users
            conn.ensure_column("users", "role", "TEXT NOT NULL DEFAULT 'user'")
            _record_migration(conn, 3)

            _record_migration(conn, 4)

            # Migration 5: operator suspension flag on users
            conn.ensure_column("users", "suspended", "INTEGER NOT NULL DEFAULT 0")
            _record_migration(conn, 5)

            # Migration 6: rich user profile fields
            conn.ensure_column("users", "full_name", "TEXT DEFAULT ''")
            conn.ensure_column("users", "birth_profile_json", "TEXT DEFAULT '{}'")
            _record_migration(conn, 6)

            conn.ensure_column("billing_events", "app_user_id", "TEXT")
            conn.ensure_column("billing_events", "plan", "TEXT")
            conn.ensure_column("billing_events", "status", "TEXT")
            conn.ensure_column("billing_events", "external_ref", "TEXT")

            # Device auth keys — used by /v1/auth/token
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS device_keys (
                    key_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    hashed_key TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    last_used_at TEXT
                );
                CREATE INDEX IF NOT EXISTS ix_device_keys_user ON device_keys(user_id);
                """
            )
            conn.commit()
        finally:
            conn.close()


def now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def save_consult_session(
    *,
    session_id: str,
    user_id: str,
    profile_id: str,
    mode: str,
    consents: dict[str, Any],
    retention_policy: str,
) -> None:
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO consult_sessions(session_id, user_id, profile_id, mode, consents_json, retention_policy, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (session_id, user_id, profile_id, mode, json.dumps(consents), retention_policy, now_iso()),
            )
            conn.commit()
        finally:
            conn.close()


def save_consult_summary(*, session_id: str, summary: dict[str, Any]) -> None:
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO consult_summaries(session_id, summary_json, created_at)
                VALUES (?, ?, ?)
                """,
                (session_id, json.dumps(summary), now_iso()),
            )
            conn.commit()
        finally:
            conn.close()


def save_generated_report(*, report_id: str, kind: str, user_id: str, profile_id: str, payload: dict[str, Any]) -> None:
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO generated_reports(report_id, kind, user_id, profile_id, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (report_id, kind, user_id, profile_id, json.dumps(payload), now_iso()),
            )
            conn.commit()
        finally:
            conn.close()


def save_billing_event(
    *,
    provider: str,
    event_type: str | None,
    payload: dict[str, Any],
    app_user_id: str | None = None,
    plan: str | None = None,
    status: str | None = None,
    external_ref: str | None = None,
) -> None:
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO billing_events(provider, event_type, payload_json, created_at, app_user_id, plan, status, external_ref)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    provider,
                    event_type,
                    json.dumps(payload),
                    now_iso(),
                    app_user_id,
                    plan,
                    status,
                    external_ref,
                ),
            )
            conn.commit()
        finally:
            conn.close()


def record_product_event(
    *,
    event_id: str,
    user_id: str,
    role: str,
    plan: str,
    name: str,
    page: str,
    session_id: str | None,
    source: str,
    severity: str,
    metadata: dict[str, Any] | None = None,
) -> str:
    created_at = now_iso()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO product_events(
                    event_id, user_id, role, plan, name, page, session_id, source, severity, metadata_json, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_id,
                    user_id,
                    role,
                    plan,
                    name,
                    page,
                    session_id,
                    source,
                    severity,
                    json.dumps(metadata or {}),
                    created_at,
                ),
            )
            conn.commit()
            return created_at
        finally:
            conn.close()


def create_deletion_request(*, request_id: str, user_id: str, scope: str, reason: str | None) -> None:
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO privacy_deletion_requests(request_id, user_id, scope, reason, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (request_id, user_id, scope, reason, "queued", now_iso()),
            )
            conn.commit()
        finally:
            conn.close()


def consult_session_exists(session_id: str) -> bool:
    with _LOCK:
        conn = _connect()
        try:
            row = conn.execute("SELECT 1 FROM consult_sessions WHERE session_id = ? LIMIT 1", (session_id,)).fetchone()
            return row is not None
        finally:
            conn.close()


def upsert_subscription(*, user_id: str, plan: str, status: str, source: str, external_ref: str | None = None) -> str:
    plan = _normalize_user_plan(plan)
    updated_at = now_iso()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO user_subscriptions(user_id, plan, status, source, external_ref, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    plan=excluded.plan,
                    status=excluded.status,
                    source=excluded.source,
                    external_ref=excluded.external_ref,
                    updated_at=excluded.updated_at
                """,
                (user_id, plan, status, source, external_ref, updated_at),
            )
            conn.execute(
                "UPDATE users SET plan = ? WHERE id = ?",
                (plan if status.lower() == "active" else "free", user_id),
            )
            conn.commit()
            return updated_at
        finally:
            conn.close()


def get_subscription(user_id: str) -> dict[str, Any] | None:
    with _LOCK:
        conn = _connect()
        try:
            row = conn.execute(
                """
                SELECT user_id, plan, status, source, external_ref, updated_at
                FROM user_subscriptions
                WHERE user_id = ?
                LIMIT 1
                """,
                (user_id,),
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()


def record_subscription_event(
    *,
    event_id: str,
    user_id: str,
    provider: str,
    event_type: str | None,
    old_plan: str | None,
    new_plan: str | None,
    old_status: str | None,
    new_status: str | None,
    external_ref: str | None,
    payload: dict[str, Any],
) -> None:
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO subscription_events(
                    event_id, user_id, provider, event_type, old_plan, new_plan, old_status, new_status, external_ref, payload_json, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_id,
                    user_id,
                    provider,
                    event_type,
                    old_plan,
                    new_plan,
                    old_status,
                    new_status,
                    external_ref,
                    json.dumps(payload),
                    now_iso(),
                ),
            )
            conn.commit()
        finally:
            conn.close()


def list_subscription_events(*, user_id: str, limit: int = 100) -> list[dict[str, Any]]:
    with _LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT event_id, user_id, provider, event_type, old_plan, new_plan, old_status, new_status, external_ref, created_at
                FROM subscription_events
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (user_id, limit),
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()


def set_addon_status(*, user_id: str, addon_id: str, status: str, source: str) -> str:
    updated_at = now_iso()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO user_addons(user_id, addon_id, status, source, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id, addon_id) DO UPDATE SET
                    status=excluded.status,
                    source=excluded.source,
                    updated_at=excluded.updated_at
                """,
                (user_id, addon_id, status, source, updated_at),
            )
            conn.commit()
            return updated_at
        finally:
            conn.close()


def list_active_addons(user_id: str) -> list[str]:
    with _LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT addon_id
                FROM user_addons
                WHERE user_id = ? AND status = 'active'
                ORDER BY addon_id ASC
                """,
                (user_id,),
            ).fetchall()
            return [str(row["addon_id"]) for row in rows]
        finally:
            conn.close()


def add_wallet_entry(
    *,
    user_id: str,
    delta_credits: int,
    reason: str,
    reference_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> int:
    with _LOCK:
        conn = _connect()
        try:
            cursor = conn.execute(
                """
                INSERT INTO wallet_ledger(user_id, delta_credits, reason, reference_id, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_id, delta_credits, reason, reference_id, json.dumps(metadata or {}), now_iso()),
            )
            conn.commit()
            return int(cursor.lastrowid)
        finally:
            conn.close()


def get_wallet_balance(user_id: str) -> int:
    with _LOCK:
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT COALESCE(SUM(delta_credits), 0) AS balance FROM wallet_ledger WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            return int(row["balance"]) if row else 0
        finally:
            conn.close()


def list_wallet_entries(user_id: str, *, limit: int = 25) -> list[dict[str, Any]]:
    with _LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT id, delta_credits, reason, reference_id, created_at
                FROM wallet_ledger
                WHERE user_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (user_id, limit),
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()


def save_bundle_purchase(
    *,
    purchase_id: str,
    user_id: str,
    bundle_id: str,
    credits_added: int,
    source: str,
    payload: dict[str, Any],
) -> None:
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO bundle_purchases(purchase_id, user_id, bundle_id, credits_added, source, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (purchase_id, user_id, bundle_id, credits_added, source, json.dumps(payload), now_iso()),
            )
            conn.commit()
        finally:
            conn.close()


def offer_already_claimed(*, user_id: str, offer_id: str) -> bool:
    with _LOCK:
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT 1 FROM offer_claims WHERE user_id = ? AND offer_id = ? LIMIT 1",
                (user_id, offer_id),
            ).fetchone()
            return row is not None
        finally:
            conn.close()


def save_offer_claim(*, claim_id: str, user_id: str, offer_id: str, status: str, payload: dict[str, Any]) -> None:
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO offer_claims(claim_id, user_id, offer_id, status, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (claim_id, user_id, offer_id, status, json.dumps(payload), now_iso()),
            )
            conn.commit()
        finally:
            conn.close()


def create_review(
    *,
    review_id: str,
    user_id: str,
    module: str,
    rating: int,
    title: str,
    body: str,
    verified_purchase: bool,
    purchase_ref: str | None,
    moderation_status: str,
) -> dict[str, Any]:
    ts = now_iso()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO reviews(
                    review_id, user_id, module, rating, title, body, verified_purchase, purchase_ref,
                    moderation_status, moderation_reason, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
                """,
                (
                    review_id,
                    user_id,
                    module,
                    rating,
                    title,
                    body,
                    int(verified_purchase),
                    purchase_ref,
                    moderation_status,
                    ts,
                    ts,
                ),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM reviews WHERE review_id = ? LIMIT 1", (review_id,)).fetchone()
            return _map_review_row(row)
        finally:
            conn.close()


def moderate_review(*, review_id: str, action: str, reason: str | None) -> dict[str, Any] | None:
    ts = now_iso()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                UPDATE reviews
                SET moderation_status = ?, moderation_reason = ?, updated_at = ?
                WHERE review_id = ?
                """,
                (action, reason, ts, review_id),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM reviews WHERE review_id = ? LIMIT 1", (review_id,)).fetchone()
            return _map_review_row(row) if row else None
        finally:
            conn.close()


def list_reviews(*, module: str | None = None, approved_only: bool = False, limit: int = 50) -> list[dict[str, Any]]:
    with _LOCK:
        conn = _connect()
        try:
            query = """
                SELECT * FROM reviews
                WHERE (? IS NULL OR module = ?)
                AND (? = 0 OR moderation_status = 'approved')
                ORDER BY created_at DESC
                LIMIT ?
            """
            rows = conn.execute(query, (module, module, int(approved_only), limit)).fetchall()
            return [_map_review_row(row) for row in rows]
        finally:
            conn.close()


def _map_review_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "review_id": str(row["review_id"]),
        "user_id": str(row["user_id"]),
        "module": str(row["module"]),
        "rating": int(row["rating"]),
        "title": str(row["title"]),
        "body": str(row["body"]),
        "verified_purchase": bool(row["verified_purchase"]),
        "moderation_status": str(row["moderation_status"]),
        "moderation_reason": row["moderation_reason"],
        "created_at": str(row["created_at"]),
        "updated_at": str(row["updated_at"]),
    }


def create_dispute(
    *,
    dispute_id: str,
    user_id: str,
    category: str,
    reference_id: str,
    description: str,
) -> dict[str, Any]:
    ts = now_iso()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO disputes(
                    dispute_id, user_id, category, reference_id, description, status, resolution_note, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, 'open', NULL, ?, ?)
                """,
                (dispute_id, user_id, category, reference_id, description, ts, ts),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM disputes WHERE dispute_id = ? LIMIT 1", (dispute_id,)).fetchone()
            return _map_dispute_row(row)
        finally:
            conn.close()


def resolve_dispute(*, dispute_id: str, status: str, resolution_note: str) -> dict[str, Any] | None:
    ts = now_iso()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                UPDATE disputes
                SET status = ?, resolution_note = ?, updated_at = ?
                WHERE dispute_id = ?
                """,
                (status, resolution_note, ts, dispute_id),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM disputes WHERE dispute_id = ? LIMIT 1", (dispute_id,)).fetchone()
            return _map_dispute_row(row) if row else None
        finally:
            conn.close()


def list_disputes(*, user_id: str | None = None, status: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
    with _LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT * FROM disputes
                WHERE (? IS NULL OR user_id = ?)
                AND (? IS NULL OR status = ?)
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (user_id, user_id, status, status, limit),
            ).fetchall()
            return [_map_dispute_row(row) for row in rows]
        finally:
            conn.close()


def _map_dispute_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "dispute_id": str(row["dispute_id"]),
        "user_id": str(row["user_id"]),
        "category": str(row["category"]),
        "reference_id": str(row["reference_id"]),
        "description": str(row["description"]),
        "status": str(row["status"]),
        "resolution_note": row["resolution_note"],
        "created_at": str(row["created_at"]),
        "updated_at": str(row["updated_at"]),
    }


def create_refund_request(
    *,
    refund_id: str,
    user_id: str,
    reference_id: str,
    amount_usd: float | None,
    reason: str,
    source: str,
) -> dict[str, Any]:
    ts = now_iso()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO refund_requests(
                    refund_id, user_id, reference_id, amount_usd, reason, status, resolution_note, source, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, 'requested', NULL, ?, ?, ?)
                """,
                (refund_id, user_id, reference_id, amount_usd, reason, source, ts, ts),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM refund_requests WHERE refund_id = ? LIMIT 1", (refund_id,)).fetchone()
            return _map_refund_row(row)
        finally:
            conn.close()


def resolve_refund_request(*, refund_id: str, status: str, resolution_note: str) -> dict[str, Any] | None:
    ts = now_iso()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                UPDATE refund_requests
                SET status = ?, resolution_note = ?, updated_at = ?
                WHERE refund_id = ?
                """,
                (status, resolution_note, ts, refund_id),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM refund_requests WHERE refund_id = ? LIMIT 1", (refund_id,)).fetchone()
            return _map_refund_row(row) if row else None
        finally:
            conn.close()


def list_refund_requests(*, user_id: str | None = None, status: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
    with _LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT * FROM refund_requests
                WHERE (? IS NULL OR user_id = ?)
                AND (? IS NULL OR status = ?)
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (user_id, user_id, status, status, limit),
            ).fetchall()
            return [_map_refund_row(row) for row in rows]
        finally:
            conn.close()


def _map_refund_row(row: Any) -> dict[str, Any]:
    return {
        "refund_id": str(row["refund_id"]),
        "user_id": str(row["user_id"]),
        "reference_id": str(row["reference_id"]),
        "amount_usd": float(row["amount_usd"]) if row["amount_usd"] is not None else None,
        "reason": str(row["reason"]),
        "status": str(row["status"]),
        "resolution_note": row["resolution_note"],
        "source": str(row["source"]),
        "created_at": str(row["created_at"]),
        "updated_at": str(row["updated_at"]),
    }


def list_billing_events(*, user_id: str | None = None, provider: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
    with _LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT id, provider, event_type, app_user_id, plan, status, external_ref, created_at
                FROM billing_events
                WHERE (? IS NULL OR app_user_id = ?)
                AND (? IS NULL OR provider = ?)
                ORDER BY id DESC
                LIMIT ?
                """,
                (user_id, user_id, provider, provider, limit),
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()


# ── Device auth ───────────────────────────────────────────────────────────────

import hashlib as _hashlib
import secrets as _secrets


def _hash_device_key(raw_key: str) -> str:
    return _hashlib.sha256(raw_key.encode()).hexdigest()


def register_device(*, user_id: str) -> tuple[str, str]:
    """Mint a new device key for user_id. Returns (key_id, raw_key).
    The raw_key is shown once and never stored — only its SHA-256 hash is kept.
    """
    key_id = f"dk-{_secrets.token_hex(8)}"
    raw_key = _secrets.token_urlsafe(32)
    hashed = _hash_device_key(raw_key)
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                "INSERT INTO device_keys(key_id, user_id, hashed_key, created_at) VALUES (?, ?, ?, ?)",
                (key_id, user_id, hashed, now_iso()),
            )
            conn.commit()
        finally:
            conn.close()
    return key_id, raw_key


def validate_device_key(*, user_id: str, raw_key: str) -> bool:
    """Return True if raw_key matches a stored key for user_id, and update last_used_at."""
    hashed = _hash_device_key(raw_key)
    with _LOCK:
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT key_id FROM device_keys WHERE user_id = ? AND hashed_key = ?",
                (user_id, hashed),
            ).fetchone()
            if not row:
                return False
            conn.execute(
                "UPDATE device_keys SET last_used_at = ? WHERE key_id = ?",
                (now_iso(), str(row["key_id"])),
            )
            conn.commit()
            return True
        finally:
            conn.close()


# ── User accounts ─────────────────────────────────────────────────────────────

try:
    import bcrypt as _bcrypt
    _BCRYPT_OK = True
except ImportError:
    _BCRYPT_OK = False


_ALLOWED_USER_ROLES = {"user", "support", "admin"}
_ALLOWED_USER_PLANS = {"free", "plus", "pro", "elite"}


def _normalize_user_role(value: str) -> str:
    role = value.strip().lower() if value else "user"
    return role if role in _ALLOWED_USER_ROLES else "user"


def _normalize_user_plan(value: str) -> str:
    plan = value.strip().lower() if value else "free"
    return plan if plan in _ALLOWED_USER_PLANS else "free"


def _hash_password(raw: str) -> str:
    if _BCRYPT_OK:
        return _bcrypt.hashpw(raw.encode(), _bcrypt.gensalt()).decode()
    # fallback: sha256 with random salt (dev-only)
    salt = _secrets.token_hex(16)
    return f"sha256:{salt}:{_hashlib.sha256((salt + raw).encode()).hexdigest()}"


def _check_password(raw: str, hashed: str) -> bool:
    if hashed.startswith("sha256:"):
        _, salt, digest = hashed.split(":", 2)
        return _hashlib.sha256((salt + raw).encode()).hexdigest() == digest
    if _BCRYPT_OK:
        try:
            return _bcrypt.checkpw(raw.encode(), hashed.encode())
        except Exception:
            return False
    return False


_EMAIL_RE = __import__("re").compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def create_user(*, email: str, password: str, display_name: str = "", role: str = "user") -> dict:
    """Create a new user. Raises ValueError if email already exists or is invalid."""
    email = email.lower().strip()
    if not _EMAIL_RE.match(email):
        raise ValueError("invalid_email")
    if len(display_name) > 120:
        raise ValueError("display_name_too_long")
    import uuid as _uuid
    user_id = f"u-{_uuid.uuid4().hex[:16]}"
    hashed = _hash_password(password)
    role = _normalize_user_role(role)
    now = datetime.now(timezone.utc).isoformat()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                "INSERT INTO users (id, email, password_hash, display_name, plan, created_at, role, email_verified, suspended) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (user_id, email, hashed, display_name, "free", now, role, 0, 0),
            )
            conn.commit()
            return {
                "id": user_id, "email": email, "display_name": display_name,
                "plan": "free", "created_at": now, "email_verified": False, "role": role, "suspended": False,
            }
        except Exception as exc:
            if "UNIQUE" in str(exc) or "unique" in str(exc) or "duplicate" in str(exc).lower():
                raise ValueError("email_taken")
            raise
        finally:
            conn.close()


def get_user_by_email(email: str) -> dict | None:
    with _LOCK:
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT id, email, password_hash, display_name, plan, created_at, email_verified, role, COALESCE(suspended, 0) AS suspended "
                "FROM users WHERE email = ?",
                (email.lower().strip(),),
            ).fetchone()
            if not row:
                return None
            r = dict(row)
            r["email_verified"] = bool(r.get("email_verified", 0))
            r["suspended"] = bool(r.get("suspended", 0))
            return r
        finally:
            conn.close()


def get_user_by_id(user_id: str) -> dict | None:
    with _LOCK:
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT id, email, display_name, plan, created_at, email_verified, role, COALESCE(suspended, 0) AS suspended FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
            if not row:
                return None
            r = dict(row)
            r["email_verified"] = bool(r.get("email_verified", 0))
            r["suspended"] = bool(r.get("suspended", 0))
            return r
        finally:
            conn.close()


def authenticate_user(email: str, password: str) -> dict | None:
    """Returns user dict (without password_hash) on success, None on failure."""
    user = get_user_by_email(email)
    if not user:
        return None
    if not _check_password(password, user["password_hash"]):
        return None
    return {k: v for k, v in user.items() if k != "password_hash"}


def update_user_plan(user_id: str, plan: str) -> None:
    plan = _normalize_user_plan(plan)
    with _LOCK:
        conn = _connect()
        try:
            conn.execute("UPDATE users SET plan = ? WHERE id = ?", (plan, user_id))
            conn.commit()
        finally:
            conn.close()


def set_user_role(user_id: str, role: str) -> bool:
    role = _normalize_user_role(role)
    with _LOCK:
        conn = _connect()
        try:
            cur = conn.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
            conn.commit()
            return (cur.rowcount if hasattr(cur, "rowcount") else 1) > 0
        finally:
            conn.close()


def upsert_user_account(
    *,
    email: str,
    password: str,
    display_name: str = "",
    full_name: str = "",
    birth_profile: dict[str, Any] | None = None,
    role: str = "user",
    plan: str = "free",
    subscription_status: str = "active",
    email_verified: bool = True,
    suspended: bool = False,
    source: str = "seed",
    external_ref: str | None = None,
) -> dict[str, Any]:
    email = email.lower().strip()
    if not _EMAIL_RE.match(email):
        raise ValueError("invalid_email")
    if len(display_name) > 120:
        raise ValueError("display_name_too_long")

    role = _normalize_user_role(role)
    plan = _normalize_user_plan(plan)
    existing = get_user_by_email(email)
    hashed = _hash_password(password)
    now = datetime.now(timezone.utc).isoformat()
    birth_json = json.dumps(birth_profile or {})

    with _LOCK:
        conn = _connect()
        try:
            if existing:
                user_id = str(existing["id"])
                conn.execute(
                    """
                    UPDATE users
                    SET password_hash = ?, display_name = ?, full_name = ?, birth_profile_json = ?,
                        role = ?, plan = ?, email_verified = ?, suspended = ?
                    WHERE id = ?
                    """,
                    (
                        hashed,
                        display_name,
                        full_name,
                        birth_json,
                        role,
                        plan,
                        1 if email_verified else 0,
                        1 if suspended else 0,
                        user_id,
                    ),
                )
            else:
                import uuid as _uuid

                user_id = f"u-{_uuid.uuid4().hex[:16]}"
                conn.execute(
                    """
                    INSERT INTO users(
                        id, email, password_hash, display_name, full_name, birth_profile_json,
                        plan, created_at, role, email_verified, suspended
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user_id,
                        email,
                        hashed,
                        display_name,
                        full_name,
                        birth_json,
                        plan,
                        now,
                        role,
                        1 if email_verified else 0,
                        1 if suspended else 0,
                    ),
                )
            conn.commit()
        finally:
            conn.close()

    upsert_subscription(
        user_id=user_id,
        plan=plan,
        status=subscription_status,
        source=source,
        external_ref=external_ref,
    )
    user = get_user_by_id(user_id)
    if not user:
        raise ValueError("user_upsert_failed")
    return user


def save_report(*, user_id: str, report_type: str, title: str, content: dict) -> str:
    import uuid as _uuid
    report_id = f"rpt-{_uuid.uuid4().hex[:16]}"
    now = datetime.now(timezone.utc).isoformat()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                "INSERT INTO saved_reports (id, user_id, report_type, title, content_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (report_id, user_id, report_type, title, json.dumps(content), now),
            )
            conn.commit()
            return report_id
        finally:
            conn.close()


def list_reports(user_id: str, limit: int = 50) -> list[dict]:
    with _LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                "SELECT id, user_id, report_type, title, created_at FROM saved_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                (user_id, limit),
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()


def get_report(report_id: str, user_id: str) -> dict | None:
    with _LOCK:
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT id, user_id, report_type, title, content_json, created_at FROM saved_reports WHERE id = ? AND user_id = ?",
                (report_id, user_id),
            ).fetchone()
            if not row:
                return None
            r = dict(row)
            r["content"] = json.loads(r.pop("content_json"))
            return r
        finally:
            conn.close()


def save_push_token(*, user_id: str, token: str, platform: str = "expo") -> None:
    now = datetime.now(timezone.utc).isoformat()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO push_tokens (user_id, token, platform, created_at) VALUES (?, ?, ?, ?)",
                (user_id, token, platform, now),
            )
            conn.commit()
        finally:
            conn.close()


def get_push_tokens(user_id: str) -> list[str]:
    with _LOCK:
        conn = _connect()
        try:
            rows = conn.execute("SELECT token FROM push_tokens WHERE user_id = ?", (user_id,)).fetchall()
            return [r["token"] for r in rows]
        finally:
            conn.close()


# ── Email verification ─────────────────────────────────────────────────────────

_VERIFICATION_TOKEN_TTL = 86_400  # 24 hours


def create_verification_token(user_id: str) -> str:
    """Generate a 24-hour email verification token, store it, return the raw token."""
    token = _secrets.token_urlsafe(32)
    expires_at = int(time.time()) + _VERIFICATION_TOKEN_TTL
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                "UPDATE users SET verification_token = ?, verification_token_expires_at = ? WHERE id = ?",
                (token, expires_at, user_id),
            )
            conn.commit()
        finally:
            conn.close()
    return token


def verify_email_token(token: str) -> str | None:
    """Validate token and mark email verified. Returns user_id on success, None on failure."""
    now = int(time.time())
    with _LOCK:
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT id FROM users WHERE verification_token = ? AND verification_token_expires_at > ?",
                (token, now),
            ).fetchone()
            if not row:
                return None
            user_id = str(row["id"])
            conn.execute(
                "UPDATE users SET email_verified = 1, verification_token = NULL, "
                "verification_token_expires_at = NULL WHERE id = ?",
                (user_id,),
            )
            conn.commit()
            return user_id
        finally:
            conn.close()


# ── JWT token revocation ───────────────────────────────────────────────────────

def revoke_token(jti: str, user_id: str, expires_at: int) -> None:
    """Store a revoked JWT jti so it cannot be reused before expiry."""
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                "INSERT OR IGNORE INTO revoked_tokens (jti, user_id, revoked_at, expires_at) VALUES (?, ?, ?, ?)",
                (jti, user_id, datetime.now(timezone.utc).isoformat(), expires_at),
            )
            conn.commit()
        finally:
            conn.close()


def is_token_revoked(jti: str) -> bool:
    """Return True if the jti has been explicitly revoked."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT 1 FROM revoked_tokens WHERE jti = ?", (jti,)
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def cleanup_expired_revocations() -> None:
    """Delete revocation records whose tokens have already expired — call periodically."""
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                "DELETE FROM revoked_tokens WHERE expires_at < ?", (int(time.time()),)
            )
            conn.commit()
        finally:
            conn.close()


# ── Admin queries ──────────────────────────────────────────────────────────────

def admin_list_users(
    *,
    search: str | None = None,
    plan: str | None = None,
    suspended: bool | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Return users with their subscription snapshot, optionally filtered."""
    with _LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT
                    u.id, u.email, u.display_name, u.role, u.email_verified,
                    u.created_at,
                    COALESCE(s.plan, 'free')   AS plan,
                    COALESCE(s.status, 'none') AS sub_status,
                    COALESCE(s.source, '')     AS sub_source,
                    COALESCE(s.updated_at, '') AS sub_updated_at,
                    COALESCE(u.suspended, 0)   AS suspended
                FROM users u
                LEFT JOIN user_subscriptions s ON s.user_id = u.id
                WHERE (? IS NULL OR u.email LIKE ? OR u.display_name LIKE ?)
                  AND (? IS NULL OR COALESCE(s.plan, 'free') = ?)
                  AND (? IS NULL OR COALESCE(u.suspended, 0) = ?)
                ORDER BY u.created_at DESC
                LIMIT ? OFFSET ?
                """,
                (
                    search, f"%{search}%" if search else None, f"%{search}%" if search else None,
                    plan, plan,
                    (1 if suspended else 0) if suspended is not None else None,
                    (1 if suspended else 0) if suspended is not None else None,
                    limit, offset,
                ),
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()


def admin_count_users(*, search: str | None = None, plan: str | None = None, suspended: bool | None = None) -> int:
    with _LOCK:
        conn = _connect()
        try:
            row = conn.execute(
                """
                SELECT COUNT(*) AS n
                FROM users u
                LEFT JOIN user_subscriptions s ON s.user_id = u.id
                WHERE (? IS NULL OR u.email LIKE ? OR u.display_name LIKE ?)
                  AND (? IS NULL OR COALESCE(s.plan, 'free') = ?)
                  AND (? IS NULL OR COALESCE(u.suspended, 0) = ?)
                """,
                (
                    search, f"%{search}%" if search else None, f"%{search}%" if search else None,
                    plan, plan,
                    (1 if suspended else 0) if suspended is not None else None,
                    (1 if suspended else 0) if suspended is not None else None,
                ),
            ).fetchone()
            return int(row["n"]) if row else 0
        finally:
            conn.close()


def admin_get_user_full(user_id: str) -> dict[str, Any] | None:
    """Return user record + subscription + wallet balance + recent events."""
    with _LOCK:
        conn = _connect()
        try:
            user_row = conn.execute(
                "SELECT id, email, display_name, role, email_verified, created_at, COALESCE(suspended, 0) AS suspended FROM users WHERE id = ? LIMIT 1",
                (user_id,),
            ).fetchone()
            if not user_row:
                return None
            user = dict(user_row)

            sub = conn.execute(
                "SELECT plan, status, source, external_ref, updated_at FROM user_subscriptions WHERE user_id = ? LIMIT 1",
                (user_id,),
            ).fetchone()
            user["subscription"] = dict(sub) if sub else None

            addons = conn.execute(
                "SELECT addon_id, status FROM user_addons WHERE user_id = ? AND status = 'active'",
                (user_id,),
            ).fetchall()
            user["addons"] = [str(r["addon_id"]) for r in addons]

            bal = conn.execute(
                "SELECT COALESCE(SUM(delta_credits), 0) AS bal FROM wallet_ledger WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            user["wallet_balance"] = int(bal["bal"]) if bal else 0

            recent_reports = conn.execute(
                "SELECT report_id, kind, profile_id, created_at FROM generated_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
                (user_id,),
            ).fetchall()
            user["recent_reports"] = [dict(r) for r in recent_reports]

            recent_subs = conn.execute(
                "SELECT event_type, old_plan, new_plan, old_status, new_status, provider, created_at FROM subscription_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
                (user_id,),
            ).fetchall()
            user["recent_subscription_events"] = [dict(r) for r in recent_subs]

            recent_billing = conn.execute(
                """
                SELECT
                    'billing' AS feed,
                    CAST(id AS TEXT) AS event_id,
                    provider,
                    event_type,
                    app_user_id AS user_id,
                    plan,
                    status,
                    external_ref,
                    created_at
                FROM billing_events
                WHERE app_user_id = ?
                ORDER BY id DESC
                LIMIT 10
                """,
                (user_id,),
            ).fetchall()
            user["recent_billing_events"] = [dict(r) for r in recent_billing]

            return user
        finally:
            conn.close()


def admin_set_user_suspended(user_id: str, suspended: bool) -> bool:
    """Set the suspended flag on a user. Returns False if user not found."""
    with _LOCK:
        conn = _connect()
        try:
            conn.ensure_column("users", "suspended", "INTEGER NOT NULL DEFAULT 0")
            cur = conn.execute(
                "UPDATE users SET suspended = ? WHERE id = ?",
                (1 if suspended else 0, user_id),
            )
            conn.commit()
            return (cur.rowcount if hasattr(cur, "rowcount") else 1) > 0
        finally:
            conn.close()


def admin_platform_stats() -> dict[str, Any]:
    """Aggregate stats: user counts by plan, new signups, billing volume."""
    with _LOCK:
        conn = _connect()
        try:
            total = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()

            by_plan = conn.execute(
                """
                SELECT COALESCE(s.plan, 'free') AS plan, COUNT(*) AS n
                FROM users u
                LEFT JOIN user_subscriptions s ON s.user_id = u.id
                GROUP BY COALESCE(s.plan, 'free')
                ORDER BY n DESC
                """
            ).fetchall()

            recent_signups = conn.execute(
                """
                SELECT COUNT(*) AS n FROM users
                WHERE created_at >= datetime('now', '-7 days')
                """
            ).fetchone()

            active_subs = conn.execute(
                "SELECT COUNT(*) AS n FROM user_subscriptions WHERE status = 'active' AND plan != 'free'"
            ).fetchone()

            top_modules = conn.execute(
                """
                SELECT kind, COUNT(*) AS n
                FROM generated_reports
                GROUP BY kind
                ORDER BY n DESC
                LIMIT 6
                """
            ).fetchall()

            recent_billing = conn.execute(
                """
                SELECT
                    'billing' AS feed,
                    CAST(id AS TEXT) AS event_id,
                    provider,
                    event_type,
                    app_user_id AS user_id,
                    plan,
                    status,
                    external_ref,
                    created_at
                FROM billing_events
                ORDER BY id DESC
                LIMIT 20
                """
            ).fetchall()

            return {
                "total_users": int(total["n"]) if total else 0,
                "users_by_plan": [{"plan": r["plan"], "count": r["n"]} for r in by_plan],
                "new_signups_7d": int(recent_signups["n"]) if recent_signups else 0,
                "active_paid_subscriptions": int(active_subs["n"]) if active_subs else 0,
                "top_modules": [{"kind": r["kind"], "count": r["n"]} for r in top_modules],
                "recent_billing_events": [dict(r) for r in recent_billing],
            }
        finally:
            conn.close()


def admin_global_audit(
    *,
    provider: str | None = None,
    user_id: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Global billing + subscription event feed across all users."""
    with _LOCK:
        conn = _connect()
        try:
            billing = conn.execute(
                """
                SELECT 'billing' AS feed, CAST(id AS TEXT) AS event_id,
                       provider, event_type, app_user_id AS user_id,
                       plan, status, external_ref, created_at
                FROM billing_events
                WHERE (? IS NULL OR app_user_id = ?)
                  AND (? IS NULL OR provider = ?)
                ORDER BY id DESC
                LIMIT ? OFFSET ?
                """,
                (user_id, user_id, provider, provider, limit, offset),
            ).fetchall()
            return [dict(r) for r in billing]
        finally:
            conn.close()
