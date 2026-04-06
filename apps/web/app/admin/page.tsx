"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Surface } from "@cortex/ui";
import { getJson, postJson } from "../../lib/api";
import { getStoredUser, getUserToken, syncStoredUser, type User } from "../../lib/auth";

// ── Types ──────────────────────────────────────────────────────────────────────

type PlanStat = { plan: string; count: number };
type ModuleStat = { kind: string; count: number };
type BillingEvent = {
  feed: string; event_id: string; provider: string; event_type: string | null;
  user_id: string | null; plan: string | null; status: string | null;
  external_ref: string | null; created_at: string;
};
type PlatformStats = {
  total_users: number; new_signups_7d: number; active_paid_subscriptions: number;
  users_by_plan: PlanStat[]; top_modules: ModuleStat[]; recent_billing_events: BillingEvent[];
};
type UserRow = {
  id: string; email: string; display_name: string; role: string;
  email_verified: number; created_at: string;
  plan: string; sub_status: string; sub_source: string; suspended: number;
};
type UserListResponse = { users: UserRow[]; total: number };
type SubEvent = { event_type: string | null; old_plan: string | null; new_plan: string | null; old_status: string | null; new_status: string | null; provider: string; created_at: string };
type ReportRow = { report_id: string; kind: string; profile_id: string; created_at: string };
type UserFull = {
  id: string; email: string; display_name: string; role: string; email_verified: number;
  created_at: string; suspended: number; wallet_balance: number;
  subscription: { plan: string; status: string; source: string; updated_at: string } | null;
  addons: string[]; recent_reports: ReportRow[]; recent_subscription_events: SubEvent[];
  recent_billing_events: BillingEvent[];
};
type AuditFeed = { events: BillingEvent[] };

// ── Helpers ────────────────────────────────────────────────────────────────────

async function adminGet<T>(path: string): Promise<T> {
  return getJson<T>(path, {});
}
async function adminPost<T>(path: string, body: unknown): Promise<T> {
  return postJson<T>(path, body, {});
}

const PLAN_COLORS: Record<string, string> = {
  free: "#94a3b8", plus: "#3b82f6", pro: "#8b5cf6", elite: "#f59e0b",
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span style={{
      background: PLAN_COLORS[plan] ?? "#94a3b8", color: "#fff",
      borderRadius: 4, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700,
    }}>{plan}</span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", minWidth: 160 }}>
      <div style={{ fontSize: "0.75rem", color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#005f73" }}>{value}</div>
      {sub ? <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>{sub}</div> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #f8fafc" }}>
      <span style={{ color: "#94a3b8" }}>{label}</span>
      <span style={{ color: "#334155", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Field({ label, input, help }: { label: string; input: ReactNode; help?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      {input}
      {help ? <span className="help">{help}</span> : null}
    </div>
  );
}

function EventTable({ events, onUser }: { events: BillingEvent[]; onUser: (uid: string) => void }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
      <thead>
        <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
          {["Provider", "Event", "Plan", "Status", "User", "Ref", "When"].map((h) => (
            <th key={h} style={{ padding: "7px 10px", textAlign: "left", color: "#64748b", fontSize: "0.75rem", letterSpacing: 0.5 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {events.map((e) => (
          <tr key={e.event_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={{ padding: "6px 10px" }}><span className="badge muted">{e.provider}</span></td>
            <td style={{ padding: "6px 10px", color: "#334155" }}>{e.event_type ?? "—"}</td>
            <td style={{ padding: "6px 10px" }}>{e.plan ? <PlanBadge plan={e.plan} /> : "—"}</td>
            <td style={{ padding: "6px 10px", color: e.status === "active" ? "#16a34a" : "#94a3b8" }}>{e.status ?? "—"}</td>
            <td style={{ padding: "6px 10px" }}>
              {e.user_id
                ? <button type="button" onClick={() => onUser(e.user_id!)} style={{ background: "none", border: "none", cursor: "pointer", color: "#005f73", fontSize: "0.78rem", padding: 0, textDecoration: "underline" }}>{e.user_id.slice(0, 12)}…</button>
                : "—"}
            </td>
            <td style={{ padding: "6px 10px", color: "#94a3b8", fontSize: "0.75rem" }}>{(e.external_ref ?? "").slice(0, 16) || "—"}</td>
            <td style={{ padding: "6px 10px", color: "#94a3b8" }}>{e.created_at.slice(0, 16)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type TabId = "stats" | "users" | "detail" | "audit" | "upload";

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<TabId>("stats");

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [userList, setUserList] = useState<UserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);

  const [detailId, setDetailId] = useState("");
  const [userDetail, setUserDetail] = useState<UserFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [walletDelta, setWalletDelta] = useState("100");
  const [walletReason, setWalletReason] = useState("goodwill credit");
  const [forcePlan, setForcePlan] = useState("pro");
  const [forceRole, setForceRole] = useState("user");
  const [actionMsg, setActionMsg] = useState("");

  const [auditEvents, setAuditEvents] = useState<BillingEvent[]>([]);
  const [auditUser, setAuditUser] = useState("");
  const [auditProvider, setAuditProvider] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    collection: "core-scriptures", language: "Sanskrit+English",
    ocr_engine: "tesseract", tier_gate: "plus", notes: "",
  });
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    setUser(getStoredUser());
    void syncStoredUser().then((fresh) => {
      if (fresh) setUser(fresh);
    }).catch(() => {});
  }, []);
  useEffect(() => { if (tab === "stats" && !stats) loadStats(); }, [tab]);

  async function loadStats() {
    setStatsLoading(true); setError("");
    try { setStats(await adminGet<PlatformStats>("/v1/admin/stats")); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setStatsLoading(false); }
  }

  async function searchUsers() {
    setUsersLoading(true); setError("");
    try {
      const p = new URLSearchParams({ limit: "50", offset: "0" });
      if (userSearch) p.set("search", userSearch);
      if (planFilter) p.set("plan", planFilter);
      const data = await adminGet<UserListResponse>(`/v1/admin/users?${p}`);
      setUserList(data.users); setUserTotal(data.total);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setUsersLoading(false); }
  }

  async function loadDetail(id?: string) {
    const uid = id ?? detailId;
    if (!uid) return;
    setDetailId(uid); setDetailLoading(true); setError(""); setActionMsg("");
    try {
      const detail = await adminGet<UserFull>(`/v1/admin/users/${uid}`);
      setUserDetail(detail);
      setForceRole(detail.role);
      setTab("detail");
    }
    catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setDetailLoading(false); }
  }

  async function toggleSuspend() {
    if (!userDetail) return; setActionMsg("");
    try {
      const res = await adminPost<{ action: string }>(`/v1/admin/users/${userDetail.id}/suspend`, { suspended: !userDetail.suspended });
      setActionMsg(`User ${res.action}.`); await loadDetail(userDetail.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  async function setUserPlan() {
    if (!userDetail) return; setActionMsg("");
    try {
      await adminPost(`/v1/admin/users/${userDetail.id}/set-plan`, { plan: forcePlan, status: "active" });
      setActionMsg(`Plan set to ${forcePlan}.`); await loadDetail(userDetail.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  async function setUserRole() {
    if (!userDetail) return; setActionMsg("");
    try {
      await adminPost(`/v1/admin/users/${userDetail.id}/set-role`, { role: forceRole });
      setActionMsg(`Role set to ${forceRole}.`); await loadDetail(userDetail.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  async function adjustWallet() {
    if (!userDetail) return; setActionMsg("");
    try {
      const res = await adminPost<{ new_balance: number }>(`/v1/admin/users/${userDetail.id}/wallet-adjust`, { delta: Number(walletDelta), reason: walletReason });
      setActionMsg(`Wallet adjusted. New balance: ${res.new_balance} credits.`); await loadDetail(userDetail.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  async function loadAudit() {
    setAuditLoading(true); setError("");
    try {
      const p = new URLSearchParams({ limit: "100" });
      if (auditUser) p.set("user_id", auditUser);
      if (auditProvider) p.set("provider", auditProvider);
      const data = await adminGet<AuditFeed>(`/v1/admin/audit?${p}`);
      setAuditEvents(data.events);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setAuditLoading(false); }
  }

  async function runUpload() {
    setUploadStatus(""); setError("");
    if (!uploadFiles?.length) { setError("Select at least one file."); return; }
    const token = getUserToken();
    if (!token) { setError("Sign in as admin."); return; }
    const results: string[] = [];
    for (const file of Array.from(uploadFiles)) {
      const fd = new FormData();
      fd.append("file", file);
      Object.entries(uploadForm).forEach(([k, v]) => fd.append(k, v));
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
        const j = await res.json();
        results.push(`${file.name}: ${j.status ?? JSON.stringify(j)}`);
      } catch { results.push(`${file.name}: failed`); }
    }
    setUploadStatus(results.join("\n"));
  }

  if (!user) return (
    <main><Surface title="Admin Access Required">
      <p className="small-muted">Sign in with an administrator account.</p>
      <Link href="/login" className="button" style={{ display: "inline-flex", marginTop: 10 }}>Sign In</Link>
    </Surface></main>
  );
  if (user.role !== "admin") return (
    <main><Surface title="Admin Access Required">
      <p className="small-muted">This console is reserved for admin operators.</p>
    </Surface></main>
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: "stats",  label: "Dashboard" },
    { id: "users",  label: "Users" },
    { id: "detail", label: "User Detail" },
    { id: "audit",  label: "Audit Feed" },
    { id: "upload", label: "KB Upload" },
  ];

  return (
    <main>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #e2e8f0" }}>
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{
            padding: "8px 18px", border: "none", background: "none", cursor: "pointer",
            fontWeight: tab === t.id ? 700 : 400,
            color: tab === t.id ? "#005f73" : "#64748b",
            borderBottom: tab === t.id ? "2px solid #005f73" : "2px solid transparent",
            marginBottom: -2, fontSize: "0.9rem",
          }}>{t.label}</button>
        ))}
      </div>

      {error ? <p className="error" style={{ marginBottom: 16 }}>{error}</p> : null}

      {/* ── Dashboard ──────────────────────────────────────────────────────── */}
      {tab === "stats" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: "#005f73" }}>Platform Dashboard</h2>
            <button className="button secondary" type="button" onClick={loadStats}>Refresh</button>
          </div>
          {statsLoading ? <p className="small-muted">Loading…</p> : stats ? (
            <>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
                <StatCard label="Total Users" value={stats.total_users} />
                <StatCard label="New (7 days)" value={stats.new_signups_7d} />
                <StatCard label="Paid Subscriptions" value={stats.active_paid_subscriptions} />
              </div>
              <div className="grid two" style={{ gap: 16, marginBottom: 24 }}>
                <Surface title="Users by Plan">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {stats.users_by_plan.map((p) => (
                      <div key={p.plan} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <PlanBadge plan={p.plan} />
                        <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 8, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, (p.count / Math.max(stats.total_users, 1)) * 100)}%`, height: "100%", background: PLAN_COLORS[p.plan] ?? "#94a3b8" }} />
                        </div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", minWidth: 28, textAlign: "right" }}>{p.count}</span>
                      </div>
                    ))}
                  </div>
                </Surface>
                <Surface title="Top Modules">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {stats.top_modules.map((m) => (
                      <div key={m.kind} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ color: "#334155" }}>{m.kind}</span>
                        <span style={{ fontWeight: 700, color: "#005f73" }}>{m.count}</span>
                      </div>
                    ))}
                  </div>
                </Surface>
              </div>
              <Surface title="Recent Billing Events">
                <EventTable events={stats.recent_billing_events} onUser={loadDetail} />
              </Surface>
            </>
          ) : <p className="small-muted">Click Refresh to load stats.</p>}
        </div>
      )}

      {/* ── Users ──────────────────────────────────────────────────────────── */}
      {tab === "users" && (
        <Surface title="User Search">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
            <div className="field" style={{ flex: 2, minWidth: 200, margin: 0 }}>
              <label>Email or name</label>
              <input className="input" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUsers()} placeholder="search…" />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 120, margin: 0 }}>
              <label>Plan</label>
              <select className="select" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
                <option value="">All</option>
                {["free","plus","pro","elite"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button className="button" type="button" onClick={searchUsers}>Search</button>
          </div>
          {usersLoading ? <p className="small-muted">Searching…</p> : userList.length > 0 ? (
            <>
              <p className="small-muted">{userTotal} result{userTotal !== 1 ? "s" : ""}</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                <thead><tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {["Email","Name","Plan","Status","Role","Joined",""].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontSize: "0.75rem" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {userList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9", background: u.suspended ? "#fff5f5" : "transparent" }}>
                      <td style={{ padding: "8px 10px", color: "#334155" }}>{u.email}</td>
                      <td style={{ padding: "8px 10px", color: "#334155" }}>{u.display_name || "—"}</td>
                      <td style={{ padding: "8px 10px" }}><PlanBadge plan={u.plan} /></td>
                      <td style={{ padding: "8px 10px", color: u.sub_status === "active" ? "#16a34a" : "#94a3b8" }}>{u.sub_status}</td>
                      <td style={{ padding: "8px 10px", color: "#64748b" }}>{u.role}</td>
                      <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{u.created_at.slice(0, 10)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <button className="button secondary" type="button" style={{ padding: "3px 10px", fontSize: "0.78rem" }}
                          onClick={() => loadDetail(u.id)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </Surface>
      )}

      {/* ── User Detail ─────────────────────────────────────────────────────── */}
      {tab === "detail" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-end" }}>
            <div className="field" style={{ flex: 1, maxWidth: 320, margin: 0 }}>
              <label style={{ fontSize: "0.8rem", color: "#64748b" }}>User ID</label>
              <input className="input" value={detailId} onChange={(e) => setDetailId(e.target.value)}
                placeholder="user id" onKeyDown={(e) => e.key === "Enter" && loadDetail()} />
            </div>
            <button className="button" type="button" onClick={() => loadDetail()} disabled={detailLoading}>
              {detailLoading ? "Loading…" : "Load"}
            </button>
          </div>
          {actionMsg ? <p style={{ color: "#16a34a", marginBottom: 12, fontWeight: 600 }}>{actionMsg}</p> : null}

          {userDetail && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Surface title="Profile">
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#005f73" }}>{userDetail.display_name || userDetail.email}</div>
                    <div style={{ color: "#64748b", fontSize: "0.85rem" }}>{userDetail.email}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <PlanBadge plan={userDetail.subscription?.plan ?? "free"} />
                      <span className={`badge ${userDetail.suspended ? "error" : "ok"}`}>{userDetail.suspended ? "SUSPENDED" : "Active"}</span>
                      <span className="badge muted">{userDetail.role}</span>
                      {userDetail.email_verified ? <span className="badge ok">Verified</span> : <span className="badge muted">Unverified</span>}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#005f73" }}>{userDetail.wallet_balance}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>credits</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#94a3b8" }}>
                  ID: {userDetail.id} · Joined: {userDetail.created_at.slice(0, 10)}
                </div>
                {userDetail.addons.length > 0 && (
                  <div className="badge-row" style={{ marginTop: 8 }}>
                    {userDetail.addons.map((a) => <span key={a} className="badge">{a}</span>)}
                  </div>
                )}
              </Surface>

              <div className="grid two" style={{ gap: 16 }}>
                <Surface title="Suspend / Restore">
                  <p className="small-muted" style={{ marginBottom: 12 }}>Suspending blocks all API access for this user.</p>
                  <button type="button" className="button" onClick={toggleSuspend}
                    style={{ background: userDetail.suspended ? "#16a34a" : "#dc2626", borderColor: userDetail.suspended ? "#16a34a" : "#dc2626" }}>
                    {userDetail.suspended ? "Restore Account" : "Suspend Account"}
                  </button>
                </Surface>

                <Surface title="Force Plan">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select className="select" value={forcePlan} onChange={(e) => setForcePlan(e.target.value)}>
                      {["free","plus","pro","elite"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button className="button" type="button" onClick={setUserPlan}>Set</button>
                  </div>
                </Surface>

                <Surface title="Access Level">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select className="select" value={forceRole} onChange={(e) => setForceRole(e.target.value)}>
                      {["user","support","admin"].map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                    <button className="button" type="button" onClick={setUserRole}>Set</button>
                  </div>
                </Surface>

                <Surface title="Wallet Adjustment">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input className="input" type="number" value={walletDelta} onChange={(e) => setWalletDelta(e.target.value)} placeholder="credits (+/-)" />
                    <input className="input" value={walletReason} onChange={(e) => setWalletReason(e.target.value)} placeholder="reason" />
                    <button className="button" type="button" onClick={adjustWallet}>Apply</button>
                  </div>
                </Surface>

                <Surface title="Subscription">
                  {userDetail.subscription ? (
                    <div style={{ fontSize: "0.84rem", display: "flex", flexDirection: "column", gap: 4 }}>
                      <Row label="Plan" value={<PlanBadge plan={userDetail.subscription.plan} />} />
                      <Row label="Status" value={userDetail.subscription.status} />
                      <Row label="Source" value={userDetail.subscription.source} />
                      <Row label="Updated" value={userDetail.subscription.updated_at.slice(0, 16)} />
                    </div>
                  ) : <p className="small-muted">No subscription record.</p>}
                </Surface>
              </div>

              {userDetail.recent_reports.length > 0 && (
                <Surface title="Recent Reports">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                    <thead><tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      {["Module","Profile","When"].map((h) => <th key={h} style={{ padding: "6px 8px", textAlign: "left", color: "#64748b", fontSize: "0.75rem" }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {userDetail.recent_reports.map((r) => (
                        <tr key={r.report_id} style={{ borderBottom: "1px solid #f8fafc" }}>
                          <td style={{ padding: "6px 8px" }}><span className="badge muted">{r.kind}</span></td>
                          <td style={{ padding: "6px 8px", color: "#334155" }}>{r.profile_id}</td>
                          <td style={{ padding: "6px 8px", color: "#94a3b8" }}>{r.created_at.slice(0, 16)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Surface>
              )}

              {userDetail.recent_subscription_events.length > 0 && (
                <Surface title="Subscription History">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead><tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      {["Event","Plan change","Status change","Provider","When"].map((h) => (
                        <th key={h} style={{ padding: "6px 8px", textAlign: "left", color: "#64748b", fontSize: "0.75rem" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {userDetail.recent_subscription_events.map((e, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                          <td style={{ padding: "6px 8px", color: "#334155" }}>{e.event_type ?? "—"}</td>
                          <td style={{ padding: "6px 8px", color: "#64748b" }}>{e.old_plan ?? "—"} → {e.new_plan ?? "—"}</td>
                          <td style={{ padding: "6px 8px", color: "#64748b" }}>{e.old_status ?? "—"} → {e.new_status ?? "—"}</td>
                          <td style={{ padding: "6px 8px", color: "#94a3b8" }}>{e.provider}</td>
                          <td style={{ padding: "6px 8px", color: "#94a3b8" }}>{e.created_at.slice(0, 16)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Surface>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Audit Feed ──────────────────────────────────────────────────────── */}
      {tab === "audit" && (
        <Surface title="Global Billing Audit Feed">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
            <div className="field" style={{ flex: 1, minWidth: 180, margin: 0 }}>
              <label>User ID (optional)</label>
              <input className="input" value={auditUser} onChange={(e) => setAuditUser(e.target.value)} placeholder="filter by user" />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 120, margin: 0 }}>
              <label>Provider</label>
              <select className="select" value={auditProvider} onChange={(e) => setAuditProvider(e.target.value)}>
                <option value="">All</option>
                <option value="stripe">stripe</option>
                <option value="apple">apple</option>
                <option value="google">google</option>
              </select>
            </div>
            <button className="button" type="button" onClick={loadAudit} disabled={auditLoading}>
              {auditLoading ? "Loading…" : "Load Feed"}
            </button>
          </div>
          {auditEvents.length > 0
            ? <EventTable events={auditEvents} onUser={loadDetail} />
            : <p className="small-muted">Click Load Feed to pull billing events.</p>}
        </Surface>
      )}

      {/* ── KB Upload ───────────────────────────────────────────────────────── */}
      {tab === "upload" && (
        <Surface title="Corpus Upload Studio">
          <p className="small-muted">Upload private corpus files to seed retrieval, citations, and premium depth.</p>
          <div className="form">
            <div className="form-grid">
              <Field label="Collection" input={<input className="input" value={uploadForm.collection} onChange={(e) => setUploadForm((p) => ({ ...p, collection: e.target.value }))} />} />
              <Field label="Language Set" input={<input className="input" value={uploadForm.language} onChange={(e) => setUploadForm((p) => ({ ...p, language: e.target.value }))} />} />
              <Field label="OCR Engine" input={
                <select className="select" value={uploadForm.ocr_engine} onChange={(e) => setUploadForm((p) => ({ ...p, ocr_engine: e.target.value }))}>
                  <option value="tesseract">Tesseract</option>
                  <option value="paddleocr">PaddleOCR</option>
                </select>
              } />
              <Field label="Tier Gate" input={
                <select className="select" value={uploadForm.tier_gate} onChange={(e) => setUploadForm((p) => ({ ...p, tier_gate: e.target.value }))}>
                  {["free","plus","pro","elite"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              } />
            </div>
            <Field label="Notes" input={<textarea className="textarea" value={uploadForm.notes} onChange={(e) => setUploadForm((p) => ({ ...p, notes: e.target.value }))} />} />
            <Field label="Files" input={
              <input className="input" type="file" multiple accept=".pdf,.epub,.txt,.html,.docx,.png,.jpg,.jpeg"
                onChange={(e) => setUploadFiles(e.target.files)} />
            } help="Each file is sent to the KB service for OCR and embedding." />
            <button className="button" type="button" onClick={runUpload}>Upload and Index</button>
          </div>
          {uploadStatus ? <pre className="result" style={{ marginTop: 12 }}>{uploadStatus}</pre> : null}
        </Surface>
      )}
    </main>
  );
}
