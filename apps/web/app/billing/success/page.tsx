"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Surface } from "@cortex/ui";
import { syncStoredUser } from "../../../lib/auth";

const PLAN_LABELS: Record<string, string> = {
  plus: "Plus",
  pro: "Pro",
  elite: "Elite",
};

const PLAN_PERKS: Record<string, string[]> = {
  plus: ["Kundli reports & Talk to Kundli", "Panchang & Muhurta", "Tarot, Numerology & Mantra"],
  pro: ["Everything in Plus", "Matchmaking Studio", "Kundli Video generation"],
  elite: ["Everything in Pro", "Vaastu Studio", "Gem Consultancy", "Live Consult Video"],
};

export default function BillingSuccessPage() {
  const params = useSearchParams();
  const plan = params.get("plan") ?? "plus";
  const label = PLAN_LABELS[plan] ?? plan;
  const perks = PLAN_PERKS[plan] ?? [];
  const [dots, setDots] = useState(".");

  // Animated ellipsis while entitlements propagate
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function refreshPlan() {
      try {
        const user = await syncStoredUser();
        if (cancelled || !user) return;
        if (user.plan === plan || attempts >= 5) return;
      } catch {
        if (attempts >= 5 || cancelled) return;
      }
      attempts += 1;
      if (!cancelled && attempts <= 5) {
        setTimeout(refreshPlan, 1500);
      }
    }

    void refreshPlan();
    return () => { cancelled = true; };
  }, [plan]);

  return (
    <main style={{ maxWidth: 540, margin: "80px auto", padding: "0 16px" }}>
      <Surface title="Welcome to BabaJi">
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🙏</div>
          <h2 style={{ margin: "0 0 8px", color: "#005f73" }}>
            {label} Plan Activated
          </h2>
          <p style={{ color: "#64748b", margin: "0 0 24px", lineHeight: 1.6 }}>
            Your subscription is confirmed. Your new features will be ready
            momentarily{dots}
          </p>

          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: 10,
              padding: "16px 20px",
              textAlign: "left",
              marginBottom: 24,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8, color: "#166534" }}>
              What&apos;s included:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {perks.map((p) => (
                <li key={p} style={{ color: "#166534", fontSize: "0.9rem", lineHeight: 1.8 }}>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/kundli">
              <button className="button" type="button">
                Open Kundli
              </button>
            </Link>
            <Link href="/">
              <button className="button secondary" type="button">
                Go to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </Surface>
    </main>
  );
}
