"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Surface } from "@cortex/ui";
import { getStoredUser, clearAuth, syncStoredUser, type User } from "../../lib/auth";

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "#94a3b8" },
  plus: { label: "Plus", color: "#3b82f6" },
  pro: { label: "Pro", color: "#8b5cf6" },
  elite: { label: "Elite", color: "#f59e0b" },
};

const PLAN_SUMMARIES: Record<string, string> = {
  free: "A calm starting point for first readings and account basics.",
  plus: "More room to return often and build continuity across sessions.",
  pro: "A stronger day-to-day experience for people using multiple pathways.",
  elite: "The fullest experience for people who want BabaJi woven into their routine.",
};

const ROLE_LABELS: Record<string, { label: string; tone: string; note: string }> = {
  user: { label: "Member", tone: "#64748b", note: "Your account is set up for personal use." },
  support: { label: "Support", tone: "#0f766e", note: "You can help resolve customer workflows and support issues." },
  admin: { label: "Admin", tone: "#b45309", note: "You have operational access to administrative tools." },
};

const NEXT_STEPS: Record<string, { title: string; body: string; href: string; cta: string }> = {
  free: {
    title: "Generate your first saved reading",
    body: "Start with a Kundli to create a stronger personal baseline, then come back to compare future questions against it.",
    href: "/kundli",
    cta: "Start with Kundli",
  },
  plus: {
    title: "Turn one answer into a routine",
    body: "Use Panchang or Insights between deeper reports so the product feels like an ongoing companion, not a one-time tool.",
    href: "/insights",
    cta: "Open Insights",
  },
  pro: {
    title: "Connect more than one pathway",
    body: "Pair your chart work with Vaastu or consult workflows to make your account feel coherent across different life questions.",
    href: "/vaastu",
    cta: "Explore Vaastu",
  },
  elite: {
    title: "Use the account as your private control room",
    body: "Review saved history, keep your verification status current, and use the richer pathways as a connected practice over time.",
    href: "/history",
    cta: "Review History",
  },
};

const MODULES = [
  { href: "/kundli", label: "Kundli", description: "Birth chart & AI narrative" },
  { href: "/vaastu", label: "Vaastu", description: "Home energy analysis" },
  { href: "/panchang", label: "Panchang", description: "Daily muhurta & tithi" },
  { href: "/matchmaking", label: "Matchmaking", description: "Compatibility analysis" },
  { href: "/consult", label: "Consult", description: "Live session" },
  { href: "/insights", label: "Insights", description: "Tarot, gems, numerology" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);
    void syncStoredUser().then((fresh) => {
      if (fresh) {
        setUser(fresh);
      }
    }).catch(() => {});
  }, [router]);

  function handleSignOut() {
    clearAuth();
    router.push("/");
  }

  if (!user) return null;

  const plan = PLAN_LABELS[user.plan] ?? PLAN_LABELS.free;
  const role = ROLE_LABELS[user.role ?? "user"] ?? ROLE_LABELS.user;
  const nextStep = NEXT_STEPS[user.plan] ?? NEXT_STEPS.free;

  return (
    <main>
      <div className="grid two" style={{ gap: 18 }}>
        <Surface style={{ gridColumn: "1 / -1" }}>
          <div className="profile-hero">
            <div className="profile-hero-main">
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: 24,
                    fontWeight: 700,
                    boxShadow: "0 16px 32px rgba(239, 68, 68, 0.18)",
                  }}
                >
                  {(user.display_name || user.email)[0].toUpperCase()}
                </div>
                <div>
                  <div className="profile-kicker">Your private space</div>
                  <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em" }}>{user.display_name || "Your account"}</div>
                  <div style={{ fontSize: 14, color: "#64748b", marginTop: 2 }}>{user.email}</div>
                </div>
              </div>

              <div className="profile-chip-row">
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "5px 12px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: plan.color,
                    color: "white",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {plan.label}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "5px 12px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: `${role.tone}18`,
                    color: role.tone,
                  }}
                >
                  {role.label}
                </span>
                {user.email_verified === true && (
                  <span className="profile-status-pill ok">Verified email</span>
                )}
                {user.email_verified === false && (
                  <span className="profile-status-pill warn">Verify your email</span>
                )}
              </div>

              <p className="profile-summary-copy">
                {PLAN_SUMMARIES[user.plan] ?? PLAN_SUMMARIES.free} Your account should feel like a quiet home for
                your readings, not just a login record.
              </p>

              <div className="button-row">
                <Link href="/history" className="button secondary" style={{ textAlign: "center" }}>
                  Open Report History
                </Link>
                <Link href="/business" className="button secondary" style={{ textAlign: "center" }}>
                  Manage Plan
                </Link>
                <button className="button secondary" type="button" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            </div>

            <div className="profile-side-card">
              <div className="profile-side-label">Account state</div>
              <div className="profile-side-title">{plan.label} membership</div>
              <p className="profile-side-copy">{role.note}</p>
              <div className="profile-side-meta">
                <div>
                  <span className="profile-side-meta-label">Email</span>
                  <strong>{user.email_verified ? "Verified" : "Needs verification"}</strong>
                </div>
                <div>
                  <span className="profile-side-meta-label">Best next move</span>
                  <strong>{nextStep.title}</strong>
                </div>
              </div>
            </div>
          </div>
        </Surface>

        <Surface title="Suggested Next Step">
          <div className="profile-journey-card">
            <div>
              <div className="profile-kicker">Based on your current plan</div>
              <h3 style={{ margin: "4px 0 8px", fontSize: 19, letterSpacing: "-0.03em" }}>{nextStep.title}</h3>
              <p className="small-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
                {nextStep.body}
              </p>
            </div>
            <Link href={nextStep.href} className="button" style={{ alignSelf: "flex-start" }}>
              {nextStep.cta}
            </Link>
          </div>
        </Surface>

        <Surface title="Membership">
          <p className="small-muted" style={{ marginTop: 0, marginBottom: 14 }}>
            Your plan should be easy to understand at a glance, with a clear path to manage it when needed.
          </p>
          {(["free", "plus", "pro", "elite"] as const).map((p) => {
            const info = PLAN_LABELS[p];
            const isCurrent = user.plan === p;
            return (
              <div
                key={p}
                className="membership-row"
                style={{
                  borderColor: isCurrent ? `${info.color}66` : "#e2e8f0",
                  background: isCurrent ? `${info.color}12` : "rgba(255,255,255,0.72)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: info.color, marginBottom: 4 }}>{info.label}</div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>
                    {PLAN_SUMMARIES[p]}
                  </div>
                </div>
                {isCurrent ? (
                  <span className="profile-status-pill ok">Current</span>
                ) : (
                  <Link
                    href="/business"
                    className="button"
                    style={{ fontSize: 12, padding: "7px 14px", background: info.color, border: "none", boxShadow: "none" }}
                  >
                    View Options
                  </Link>
                )}
              </div>
            );
          })}
        </Surface>

        <Surface title="Continue Exploring" style={{ gridColumn: "1 / -1" }}>
          <div className="grid two" style={{ gap: 12 }}>
            {MODULES.map((m) => (
              <Link key={m.href} href={m.href} className="profile-quick-link">
                <div style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.55 }}>{m.description}</div>
              </Link>
            ))}
          </div>
        </Surface>
      </div>
    </main>
  );
}
