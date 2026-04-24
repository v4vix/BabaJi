"use client";

import { useState, useEffect } from "react";
import { apiLogin, saveAuth } from "../lib/auth";

type DemoAccount = {
  email: string;
  password: string;
  display_name: string;
  plan: string;
  role: string;
  note: string;
};

const PLAN_COLOR: Record<string, { bg: string; color: string }> = {
  free:  { bg: "#f1f5f9", color: "#64748b" },
  plus:  { bg: "#dbeafe", color: "#1d4ed8" },
  pro:   { bg: "#ede9fe", color: "#6d28d9" },
  elite: { bg: "#fef3c7", color: "#92400e" },
};

export default function DemoSwitcher() {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/v1/auth/demo-accounts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { accounts?: DemoAccount[] } | null) => {
        if (data?.accounts?.length) setAccounts(data.accounts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function loginAs(account: DemoAccount) {
    setLoading(account.email);
    setError("");
    try {
      const result = await apiLogin(account.email, account.password);
      saveAuth(result);
      setOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(null);
    }
  }

  if (!accounts.length) return null;

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 998 }}
        />
      )}

      <div
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 999,
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
        }}
      >
        {open && (
          <div
            style={{
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
              boxShadow: "0 8px 32px rgba(0,0,0,0.14)", padding: "14px 16px",
              width: 270,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
              Beta — Switch Demo User
            </div>

            {error ? (
              <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8, padding: "6px 10px", background: "#fff5f5", borderRadius: 6 }}>
                {error}
              </div>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {accounts.map((account) => {
                const badge = PLAN_COLOR[account.plan] ?? PLAN_COLOR.free;
                const isBusy = loading === account.email;
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => loginAs(account)}
                    disabled={loading !== null}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      background: isBusy ? "#f8fafc" : "#fff",
                      cursor: loading !== null ? "not-allowed" : "pointer",
                      textAlign: "left", width: "100%",
                      opacity: loading !== null && !isBusy ? 0.5 : 1,
                      transition: "background 0.12s",
                    }}
                  >
                    <span
                      style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 800, fontSize: 13,
                      }}
                    >
                      {account.display_name[0]}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {isBusy ? "Signing in…" : account.display_name}
                      </div>
                      <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 2 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, background: badge.bg, color: badge.color, padding: "1px 6px", borderRadius: 4 }}>
                          {account.plan.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{account.role}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9", fontSize: 11, color: "#94a3b8" }}>
              Beta-only panel — removed before launch
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => { setOpen((o) => !o); setError(""); }}
          title="Switch demo user (beta)"
          style={{
            background: open ? "#1a1a2e" : "rgba(26,26,46,0.85)",
            color: "#fff", border: "none", borderRadius: 20,
            padding: "7px 16px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.04em",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            backdropFilter: "blur(8px)",
            transition: "background 0.15s",
          }}
        >
          {open ? "✕ Close" : "👤 Demo"}
        </button>
      </div>
    </>
  );
}
