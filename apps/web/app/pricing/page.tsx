"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Surface } from "@cortex/ui";
import { postJson } from "../../lib/api";
import { getStoredUser } from "../../lib/auth";
import { useToast } from "../../lib/toast";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    color: "#64748b",
    bg: "rgba(100,116,139,0.07)",
    border: "#e2e8f0",
    tagline: "A calm starting point",
    cta: "Get started free",
    ctaHref: "/register",
    popular: false,
    features: [
      "Guided spiritual chat",
      "Ritual & Ayurveda guides",
      "Daily horoscope preview",
      "Basic birth chart data",
      "5 report reads/month",
    ],
    locked: [
      "Full Kundli reports",
      "Vaastu analysis",
      "Matchmaking studio",
      "Live consult sessions",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: 9,
    period: "per month",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.07)",
    border: "#bfdbfe",
    tagline: "Build a genuine practice",
    cta: "Start Plus",
    popular: false,
    stripeProductId: "plus",
    features: [
      "Everything in Free",
      "Full Kundli reports & AI narrative",
      "Talk to Kundli (Q&A on your chart)",
      "Daily Panchang & Muhurta timing",
      "Tarot card spreads",
      "Numerology profile",
      "Mantra recommendations",
      "Personalized Rashifal",
      "50 reports/month",
    ],
    locked: ["Vaastu Studio", "Matchmaking Studio", "Live video consult"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    period: "per month",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.07)",
    border: "#ddd6fe",
    tagline: "Deeper analysis, richer pathways",
    cta: "Start Pro",
    popular: true,
    stripeProductId: "pro",
    features: [
      "Everything in Plus",
      "Kundli compatibility matching",
      "Ashtakoot guna score & narrative",
      "Kundli video walkthroughs",
      "Birth time rectification",
      "Unlimited reports",
      "Priority AI responses",
    ],
    locked: ["Vaastu Studio", "Gem Consultancy", "Live video consult"],
  },
  {
    id: "elite",
    name: "Elite",
    price: 39,
    period: "per month",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.07)",
    border: "#fde68a",
    tagline: "The complete Jyotish experience",
    cta: "Start Elite",
    popular: false,
    stripeProductId: "elite",
    features: [
      "Everything in Pro",
      "Vaastu Shastra analysis",
      "Vaastu video walkthroughs",
      "Gem consultancy & due diligence",
      "Live video consult sessions",
      "Session summaries & action plans",
      "Wallet credits included monthly",
      "Dedicated support channel",
      "Unlimited everything",
    ],
    locked: [],
  },
];

const ADDONS = [
  { id: "vaastu_studio_addon", name: "Vaastu Studio", price: 12, desc: "Add Vaastu analysis to any plan" },
  { id: "gem_consultancy_addon", name: "Gem Consultancy", price: 8, desc: "Gemstone guidance & due diligence" },
  { id: "matchmaking_addon", name: "Matchmaking Studio", price: 10, desc: "Compatibility analysis on any plan" },
  { id: "kundli_video_addon", name: "Kundli Video", price: 8, desc: "Narrated chart walkthroughs" },
  { id: "consult_video_addon", name: "Consult Video", price: 10, desc: "Video sessions on non-Elite plans" },
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes. Cancel from your Account page with one click. You keep access until the end of your billing period." },
  { q: "Is my birth data private?", a: "Absolutely. Your data stays in your account only. We never sell or share personal information. Full GDPR-compliant deletion available anytime." },
  { q: "What is the Free tier?", a: "Free gives you guided spiritual chat, ritual guidance, and a preview of daily readings — no credit card needed, ever." },
  { q: "Can I switch plans?", a: "Yes, upgrade or downgrade anytime. Proration is handled automatically at the next billing cycle." },
  { q: "Do add-ons stack with plans?", a: "Yes. Add individual features like Vaastu Studio or Gem Consultancy to any plan — no need to upgrade to Elite for just one feature." },
  { q: "Is there a trial period?", a: "New accounts get a one-time welcome credits offer (120 credits) which can be used for a first consult trial. Use the claim on your Account page." },
];

const TESTIMONIALS = [
  { name: "Priya S.", plan: "Elite", city: "Bengaluru", text: "The Kundli analysis is unlike anything I've seen. It feels like sitting with a learned Jyotishi — calm, grounded, specific." },
  { name: "Rahul M.", plan: "Pro", city: "Mumbai", text: "I used the matchmaking for my daughter's proposals. The ashtakoot narrative alone saved us weeks of back-and-forth." },
  { name: "Anita K.", plan: "Plus", city: "Delhi", text: "Panchang and muhurta are now part of my morning routine. BabaJi makes it feel accessible, not overwhelming." },
  { name: "Sanjay R.", plan: "Elite", city: "Hyderabad", text: "Vaastu analysis for my new office was spot-on. The checklist with room-by-room remedies was exactly what I needed." },
];

export default function PricingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<{ plan?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  async function handleUpgrade(planId: string) {
    if (!user) {
      router.push(`/register?redirect=/pricing&plan=${planId}`);
      return;
    }
    if (planId === "free") {
      router.push("/business");
      return;
    }
    setLoading(planId);
    try {
      const res = await postJson<{ url: string }>("/v1/billing/stripe/checkout", {
        plan: planId,
        success_url: `${window.location.origin}/billing/success?plan=${planId}`,
        cancel_url: `${window.location.origin}/pricing`,
      });
      window.location.href = res.url;
    } catch {
      toast("Could not open checkout. Please try again or contact support.", "error");
    } finally {
      setLoading(null);
    }
  }

  const discountedPrice = (price: number) =>
    annual ? Math.round(price * 12 * 0.8) : price;

  return (
    <main>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div className="section-eyebrow">Subscription Plans</div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, margin: "12px 0 16px", color: "#0a1628", letterSpacing: "-0.03em" }}>
          Ancient wisdom, priced for your journey
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#475569", maxWidth: 560, margin: "0 auto 28px" }}>
          Start free. Upgrade when you&apos;re ready. Every plan is grounded in classical Jyotish, powered by AI.
        </p>

        {/* Annual toggle */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#f1f5f9", borderRadius: 999, padding: "6px 8px" }}>
          <button
            type="button"
            onClick={() => setAnnual(false)}
            style={{
              padding: "6px 18px", borderRadius: 999, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
              background: !annual ? "#fff" : "transparent",
              color: !annual ? "#0f172a" : "#64748b",
              boxShadow: !annual ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            style={{
              padding: "6px 18px", borderRadius: 999, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
              background: annual ? "#fff" : "transparent",
              color: annual ? "#0f172a" : "#64748b",
              boxShadow: annual ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}
          >
            Annual
            <span style={{ marginLeft: 6, background: "#22c55e", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 60 }}>
        {PLANS.map((plan) => {
          const isCurrent = user?.plan === plan.id;
          const isLoading = loading === plan.id;
          const price = discountedPrice(plan.price);

          return (
            <div
              key={plan.id}
              style={{
                border: `2px solid ${plan.popular ? plan.color : plan.border}`,
                borderRadius: 20,
                background: plan.popular ? `linear-gradient(135deg, ${plan.bg}, #fff)` : "#fff",
                padding: "28px 24px",
                position: "relative",
                boxShadow: plan.popular ? "0 8px 32px rgba(139,92,246,0.15)" : "0 2px 8px rgba(0,0,0,0.05)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              className="plan-card"
            >
              {plan.popular && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: plan.color, color: "#fff", fontSize: 11, fontWeight: 800,
                  padding: "4px 16px", borderRadius: 999, letterSpacing: 1, textTransform: "uppercase",
                }}>
                  Most Popular
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: plan.bg, border: `1.5px solid ${plan.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {plan.id === "free" ? "🌱" : plan.id === "plus" ? "🌙" : plan.id === "pro" ? "⭐" : "🪐"}
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>{plan.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{plan.tagline}</div>
                </div>
              </div>

              <div style={{ margin: "20px 0 24px" }}>
                {plan.price === 0 ? (
                  <span style={{ fontSize: "2.4rem", fontWeight: 900, color: "#0f172a" }}>Free</span>
                ) : (
                  <>
                    <span style={{ fontSize: "0.9rem", color: "#64748b", verticalAlign: "super" }}>$</span>
                    <span style={{ fontSize: "2.4rem", fontWeight: 900, color: plan.color }}>{annual ? Math.round(price / 12) : price}</span>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      {annual ? "/mo · billed annually" : "/month"}
                    </span>
                    {annual && (
                      <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 600, marginTop: 2 }}>
                        Save ${plan.price * 12 - price}/year
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                type="button"
                disabled={isCurrent || isLoading}
                onClick={() => void handleUpgrade(plan.id)}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 12, border: "none", cursor: isCurrent ? "default" : "pointer",
                  fontWeight: 700, fontSize: 15, marginBottom: 24, transition: "all 0.2s",
                  background: isCurrent ? "#e2e8f0" : plan.popular ? plan.color : "#0f172a",
                  color: isCurrent ? "#94a3b8" : "#fff",
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? "Opening checkout…" : isCurrent ? "Current plan" : plan.cta}
              </button>

              <div style={{ fontSize: 13, color: "#334155" }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: "#22c55e", fontWeight: 700, marginTop: 1, flexShrink: 0 }}>✓</span>
                    {f}
                  </div>
                ))}
                {plan.locked.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, opacity: 0.4 }}>
                    <span style={{ fontWeight: 700, marginTop: 1, flexShrink: 0 }}>✕</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add-ons Section */}
      <Surface style={{ marginBottom: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 28 }}>🔧</span>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>
              À la carte Add-ons
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
              Add individual features to any plan — no need to upgrade for one module.
            </p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {ADDONS.map((addon) => (
            <div
              key={addon.id}
              style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px", background: "#f8fafc" }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>{addon.name}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>{addon.desc}</div>
              <div style={{ fontWeight: 800, color: "#0a9396", fontSize: 16 }}>${addon.price}<span style={{ fontWeight: 400, fontSize: 12, color: "#94a3b8" }}>/mo</span></div>
            </div>
          ))}
        </div>
        <p style={{ margin: "16px 0 0", fontSize: 13, color: "#94a3b8" }}>
          Add-ons are activated from your{" "}
          <Link href="/business" style={{ color: "#0a9396", fontWeight: 600 }}>Account page</Link>{" "}
          after subscription.
        </p>
      </Surface>

      {/* Testimonials */}
      <div style={{ marginBottom: 60 }}>
        <h2 style={{ textAlign: "center", fontWeight: 800, fontSize: "1.6rem", color: "#0f172a", marginBottom: 8 }}>
          Trusted by seekers across India
        </h2>
        <p style={{ textAlign: "center", color: "#64748b", marginBottom: 32 }}>
          Real accounts from BabaJi members at every tier.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {TESTIMONIALS.map((t) => (
            <Surface key={t.name} style={{ position: "relative" }}>
              <div style={{ fontSize: 28, marginBottom: 12, color: "#0a9396", opacity: 0.4, fontFamily: "Georgia, serif" }}>&ldquo;</div>
              <p style={{ fontSize: 15, color: "#334155", lineHeight: 1.7, margin: "0 0 16px" }}>{t.text}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{t.city}</div>
                </div>
                <span style={{
                  background: t.plan === "Elite" ? "#fde68a" : t.plan === "Pro" ? "#ddd6fe" : "#bfdbfe",
                  color: t.plan === "Elite" ? "#92400e" : t.plan === "Pro" ? "#5b21b6" : "#1e40af",
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                }}>
                  {t.plan}
                </span>
              </div>
            </Surface>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <Surface style={{ marginBottom: 48 }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.4rem", color: "#0f172a", marginBottom: 24 }}>
          Frequently asked questions
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 6 }}>{faq.q}</div>
              <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>{faq.a}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/faq" style={{ color: "#0a9396", fontWeight: 600, fontSize: 14 }}>
            View all FAQs →
          </Link>
        </div>
      </Surface>

      {/* CTA Strip */}
      <div style={{
        background: "linear-gradient(135deg, #005f73 0%, #0a9396 50%, #c75a04 100%)",
        borderRadius: 24, padding: "40px 32px", textAlign: "center", color: "#fff",
      }}>
        <h2 style={{ margin: "0 0 12px", fontSize: "1.8rem", fontWeight: 900 }}>Start your journey today</h2>
        <p style={{ margin: "0 0 24px", opacity: 0.9, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          No credit card needed for Free. Upgrade anytime. Ancient wisdom, your pace.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/register"
            style={{
              background: "#fff", color: "#005f73", fontWeight: 800, padding: "13px 28px",
              borderRadius: 999, textDecoration: "none", fontSize: 15,
            }}
          >
            Create free account
          </Link>
          <Link
            href="/kundli"
            style={{
              background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, padding: "13px 28px",
              borderRadius: 999, textDecoration: "none", fontSize: 15,
              border: "2px solid rgba(255,255,255,0.4)",
            }}
          >
            Try Kundli first
          </Link>
        </div>
      </div>

      <style>{`
        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 36px rgba(0,0,0,0.12) !important;
        }
        .section-eyebrow {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #0a9396;
          margin-bottom: 8px;
        }
      `}</style>
    </main>
  );
}
