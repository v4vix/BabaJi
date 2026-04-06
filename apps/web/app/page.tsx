"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Surface } from "@cortex/ui";

const MODULES = [
  {
    href: "/kundli",
    emoji: "🔮",
    title: "Kundli",
    tagline: "Your birth chart, decoded",
    description: "AI-powered Vedic birth chart with planetary positions, dasha periods, yoga identification, and a personalized narrative.",
    cta: "Generate Kundli",
    accent: "#0a9396",
    bg: "rgba(10,147,150,0.07)",
  },
  {
    href: "/vaastu",
    emoji: "🏠",
    title: "Vaastu Shastra",
    tagline: "Harmonize your space",
    description: "Room-by-room directional analysis. Get a practical checklist, safety notes, and easy remedies based on 8-direction principles.",
    cta: "Analyse Space",
    accent: "#ca6702",
    bg: "rgba(202,103,2,0.07)",
  },
  {
    href: "/matchmaking",
    emoji: "💫",
    title: "Kundli Matching",
    tagline: "Compatibility, deeply understood",
    description: "Ashtakoot analysis with guna score, strengths, watchpoints, and AI narrative on long-term compatibility.",
    cta: "Match Kundlis",
    accent: "#db2777",
    bg: "rgba(219,39,119,0.07)",
  },
  {
    href: "/panchang",
    emoji: "📅",
    title: "Panchang & Muhurta",
    tagline: "Auspicious timing",
    description: "Daily tithi, nakshatra, yoga, and karana. Intent-based muhurta windows with clear why/why-not reasoning.",
    cta: "Open Panchang",
    accent: "#6366f1",
    bg: "rgba(99,102,241,0.07)",
  },
  {
    href: "/consult",
    emoji: "💬",
    title: "Live Consult",
    tagline: "Talk to a Jyotishi",
    description: "Consent-verified chat, voice, or video sessions. Session summaries auto-generated with configurable retention.",
    cta: "Book Session",
    accent: "#059669",
    bg: "rgba(5,150,105,0.07)",
  },
  {
    href: "/insights",
    emoji: "✨",
    title: "Insights",
    tagline: "Tarot · Numerology · Gems · Mantra",
    description: "Daily rashifal, tarot, numerology profile, personalized mantra recommendations, and gem due-diligence guidance.",
    cta: "Explore Insights",
    accent: "#7c3aed",
    bg: "rgba(124,58,237,0.07)",
  },
];

const FEATURES = [
  { icon: "🛡️", title: "Safety-first", body: "Every report includes mandatory disclaimers. Structural or medical decisions are always referred to licensed professionals." },
  { icon: "📚", title: "Citations-first", body: "Guidance is grounded in classical Vedic texts. Every claim links back to its source." },
  { icon: "⚡", title: "Three-tier AI", body: "Claude AI delivers narrative quality. Falls back to local LLM, then deterministic computation — always works offline." },
  { icon: "🔒", title: "Private by design", body: "Your birth data stays local unless you opt in. Full GDPR-compliant deletion on request." },
];

const RITUAL_STEPS = [
  {
    step: "01",
    title: "Choose one doorway",
    body: "Start with the path that matches your moment: Kundli for self-understanding, Vaastu for home energy, Panchang for timing, or Insights for lighter reflection.",
  },
  {
    step: "02",
    title: "Receive grounded clarity",
    body: "Each answer is designed to feel calm, readable, and specific enough to act on without overwhelming you.",
  },
  {
    step: "03",
    title: "Keep what matters",
    body: "Save the readings worth returning to and let one question become a longer personal practice over time.",
  },
];

const TRUST_SIGNALS = ["Private by default", "Classical grounding", "Readable next steps"];

const STARTER_PATHS = [
  {
    id: "self",
    label: "I want self-understanding",
    title: "Start with Kundli",
    body: "Use your birth chart when you want a durable baseline for identity, timing, and recurring personal patterns.",
    href: "/kundli",
    cta: "Start with Kundli",
    accent: "#0a9396",
    tag: "Birth chart foundation",
    details: [
      "Best when the question feels big or personal.",
      "Creates a stronger long-term reference point for future readings.",
    ],
  },
  {
    id: "space",
    label: "I want to improve my space",
    title: "Start with Vaastu",
    body: "Use Vaastu when your question lives in the home: restlessness, blocked focus, or room-by-room friction.",
    href: "/vaastu",
    cta: "Open Vaastu",
    accent: "#ca6702",
    tag: "Home energy",
    details: [
      "Gives a practical checklist instead of abstract theory.",
      "Helpful when you want tangible changes without major renovation.",
    ],
  },
  {
    id: "timing",
    label: "I need timing clarity",
    title: "Start with Panchang",
    body: "Use Panchang and Muhurta when the real question is not what to do, but when to move.",
    href: "/panchang",
    cta: "Check Timing",
    accent: "#6366f1",
    tag: "Timing and rhythm",
    details: [
      "Great for launches, conversations, travel, and family decisions.",
      "Keeps the answer focused on windows and tradeoffs.",
    ],
  },
  {
    id: "light",
    label: "I want lighter daily guidance",
    title: "Start with Insights",
    body: "Use Insights when you want a softer entry point: tarot, numerology, mantra, rashifal, or gem guidance.",
    href: "/insights",
    cta: "Explore Insights",
    accent: "#7c3aed",
    tag: "Daily reflection",
    details: [
      "Ideal for repeat visits and lower-pressure questions.",
      "A good bridge between curiosity and a fuller practice.",
    ],
  },
];

const STATS = [
  { label: "Kundlis generated", value: "2,40,000+", icon: "🔮" },
  { label: "Vaastu assessments", value: "38,000+", icon: "🏠" },
  { label: "Live consults", value: "12,000+", icon: "💬" },
  { label: "Cities served", value: "480+", icon: "🌏" },
];

const TESTIMONIALS = [
  { name: "Priya Sharma", plan: "Elite", city: "Bengaluru", rashi: "Vrishchika", text: "The Kundli analysis is unlike anything I've seen. It feels like sitting with a learned Jyotishi — calm, grounded, specific." },
  { name: "Rahul Mehta", plan: "Pro", city: "Mumbai", rashi: "Mithuna", text: "I used the matchmaking for my daughter's proposals. The ashtakoot narrative alone saved us weeks of back-and-forth." },
  { name: "Anita Kapoor", plan: "Plus", city: "Delhi", rashi: "Mesha", text: "Panchang and muhurta are now part of my morning routine. BabaJi makes it feel accessible, not overwhelming." },
  { name: "Sanjay Reddy", plan: "Elite", city: "Hyderabad", rashi: "Simha", text: "Vaastu analysis for my new office was spot-on. The checklist with room-by-room remedies was exactly what I needed." },
  { name: "Kavita Nair", plan: "Plus", city: "Pune", rashi: "Kanya", text: "Daily rashifal with actual planetary reasoning instead of vague fortune-cookie text. Finally, astrology that respects my intelligence." },
  { name: "Amit Patel", plan: "Pro", city: "Ahmedabad", rashi: "Dhanu", text: "The gem guidance saved me from an overpriced blue sapphire purchase. The due diligence toolkit is genuinely useful." },
];

const RASHIS = [
  { id: "mesha", name: "Mesha", en: "Aries", icon: "♈" },
  { id: "vrishabha", name: "Vrishabha", en: "Taurus", icon: "♉" },
  { id: "mithuna", name: "Mithuna", en: "Gemini", icon: "♊" },
  { id: "karka", name: "Karka", en: "Cancer", icon: "♋" },
  { id: "simha", name: "Simha", en: "Leo", icon: "♌" },
  { id: "kanya", name: "Kanya", en: "Virgo", icon: "♍" },
  { id: "tula", name: "Tula", en: "Libra", icon: "♎" },
  { id: "vrishchika", name: "Vrishchika", en: "Scorpio", icon: "♏" },
  { id: "dhanu", name: "Dhanu", en: "Sagittarius", icon: "♐" },
  { id: "makara", name: "Makara", en: "Capricorn", icon: "♑" },
  { id: "kumbha", name: "Kumbha", en: "Aquarius", icon: "♒" },
  { id: "meena", name: "Meena", en: "Pisces", icon: "♓" },
];

// Deterministic daily preview based on rashi + today's date
function getDailyPreview(rashiId: string): { theme: string; energy: string; lucky_color: string; caution: string } {
  const dateStr = new Date().toDateString();
  const seed = (rashiId + dateStr).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const themes = ["Career clarity", "Relationship harmony", "Financial focus", "Personal growth", "Spiritual reflection", "Health & vitality", "Creative energy", "Family bonds"];
  const energies = ["Strong solar influence today — your confidence is well-placed.", "Moon's transit supports emotional clarity and dialogue.", "Mercury favors communication, planning, and short journeys.", "Venus brings warmth to personal connections and creative work.", "Mars lends courage for long-delayed decisions.", "Jupiter expands your sense of possibility in practical matters.", "Saturn rewards disciplined effort with steady, quiet progress.", "Rahu heightens intuition but avoid major financial risks."];
  const colors = ["Saffron", "Emerald", "Pearl white", "Coral red", "Royal blue", "Turmeric yellow", "Forest green", "Deep violet"];
  const cautions = ["Avoid making irreversible decisions before noon.", "Emotional reactions may cloud practical judgement today.", "Delay signing contracts until after Mercury settles.", "Rest is productive — do not push through fatigue.", "Keep financial matters close; avoid speculative moves.", "A quiet evening preserves tomorrow's clarity.", "Seek a second opinion on health-adjacent choices.", "Pace communication carefully — words carry extra weight today."];
  return {
    theme: themes[seed % themes.length],
    energy: energies[(seed + 1) % energies.length],
    lucky_color: colors[(seed + 2) % colors.length],
    caution: cautions[(seed + 3) % cautions.length],
  };
}

const PLAN_HIGHLIGHTS = [
  { id: "free", name: "Free", price: "₹0", color: "#64748b", perks: ["Guided spiritual chat", "Daily preview", "Basic chart data"] },
  { id: "plus", name: "Plus", price: "₹749/mo", color: "#3b82f6", perks: ["Full Kundli reports", "Tarot & numerology", "Panchang & muhurta"] },
  { id: "pro", name: "Pro", price: "₹1,599/mo", color: "#8b5cf6", popular: true, perks: ["Matchmaking studio", "Kundli videos", "50+ reports/mo"] },
  { id: "elite", name: "Elite", price: "₹3,249/mo", color: "#f59e0b", perks: ["Vaastu Studio", "Gem consultancy", "Live video consult"] },
];

export default function HomePage() {
  const [selectedPathId, setSelectedPathId] = useState(STARTER_PATHS[0].id);
  const [selectedRashi, setSelectedRashi] = useState(RASHIS[0]);
  const [rashiPreview, setRashiPreview] = useState(getDailyPreview(RASHIS[0].id));
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const selectedPath = STARTER_PATHS.find((path) => path.id === selectedPathId) ?? STARTER_PATHS[0];

  useEffect(() => {
    setRashiPreview(getDailyPreview(selectedRashi.id));
  }, [selectedRashi]);

  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const visibleTestimonials = [
    TESTIMONIALS[testimonialIdx % TESTIMONIALS.length],
    TESTIMONIALS[(testimonialIdx + 1) % TESTIMONIALS.length],
    TESTIMONIALS[(testimonialIdx + 2) % TESTIMONIALS.length],
  ];

  return (
    <main className="home-page">
      {/* ─── Hero ─── */}
      <section className="home-hero">
        <div className="home-hero-grid">
          <div className="home-copy-block">
            <span className="home-eyebrow">Private, grounded, and beautifully simple</span>
            <div className="home-mark">🕉</div>
            <h1 className="home-title">
              A calmer way to ask
              <br />
              life&apos;s bigger questions.
            </h1>
            <p className="home-summary">
              BabaJi turns Vedic wisdom into clear, modern guidance across birth charts, home energy,
              daily timing, and reflective insights — without making the experience feel like a dashboard.
            </p>
            <div className="home-primary-actions">
              <Link className="button" href="/kundli" style={{ fontSize: 15, padding: "12px 26px" }}>
                Start Free Kundli
              </Link>
              <Link className="home-secondary-link" href="/pricing">
                View plans
              </Link>
            </div>
            <div className="home-proof-strip">
              {TRUST_SIGNALS.map((signal) => (
                <span key={signal} className="home-proof-pill">
                  {signal}
                </span>
              ))}
            </div>
          </div>

          <aside className="home-ritual-card">
            <div className="home-ritual-kicker">A better first-run experience</div>
            <h2 className="home-ritual-title">From uncertainty to a useful next step.</h2>
            <p className="home-ritual-copy">
              The best version of this product feels more like a trusted ritual than a feature grid.
              These are the three beats the experience is optimized around.
            </p>
            <div className="home-step-list">
              {RITUAL_STEPS.map((item) => (
                <div key={item.step} className="home-step-card">
                  <div className="home-step-number">{item.step}</div>
                  <div>
                    <div className="home-step-title">{item.title}</div>
                    <div className="home-step-body">{item.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="home-ritual-footer">
              Your first reading is free. Save the ones you want to return to.
            </div>
          </aside>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="home-section" style={{ paddingTop: 0 }}>
        <div className="stats-bar">
          {STATS.map((s) => (
            <div key={s.label} className="stat-item">
              <span className="stat-icon">{s.icon}</span>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Daily Rashifal Widget ─── */}
      <section className="home-section">
        <Surface style={{ padding: 0, overflow: "hidden" }}>
          <div className="rashifal-widget">
            <div className="rashifal-header">
              <div>
                <div className="home-section-kicker">Today&apos;s Rashifal</div>
                <h2 className="home-section-title" style={{ marginBottom: 4 }}>What does your Rashi say today?</h2>
                <div style={{ fontSize: 13, color: "#64748b" }}>{today}</div>
              </div>
              <Link href="/insights" className="button" style={{ fontSize: 13, padding: "8px 18px", flexShrink: 0 }}>
                Full Rashifal →
              </Link>
            </div>

            {/* Rashi selector */}
            <div className="rashi-grid">
              {RASHIS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`rashi-pill${selectedRashi.id === r.id ? " active" : ""}`}
                  onClick={() => setSelectedRashi(r)}
                >
                  <span>{r.icon}</span>
                  <span>{r.name}</span>
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className="rashifal-preview">
              <div className="rashifal-rashi-header">
                <span className="rashifal-sign-icon">{selectedRashi.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>
                    {selectedRashi.name} <span style={{ fontWeight: 400, color: "#64748b", fontSize: "0.9rem" }}>· {selectedRashi.en}</span>
                  </div>
                  <div className="rashifal-theme-badge">{rashiPreview.theme}</div>
                </div>
              </div>
              <p style={{ fontSize: 15, color: "#334155", lineHeight: 1.7, margin: "12px 0" }}>
                {rashiPreview.energy}
              </p>
              <div className="rashifal-meta">
                <div className="rashifal-meta-item">
                  <span style={{ fontSize: 12, color: "#94a3b8", display: "block" }}>Lucky Color</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{rashiPreview.lucky_color}</span>
                </div>
                <div className="rashifal-meta-item">
                  <span style={{ fontSize: 12, color: "#94a3b8", display: "block" }}>Caution</span>
                  <span style={{ fontWeight: 600, color: "#ef4444", fontSize: 13 }}>{rashiPreview.caution}</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "12px 0 0", fontStyle: "italic" }}>
                Personalized rashifal with planetary positions requires a{" "}
                <Link href="/register" style={{ color: "#0a9396" }}>free account</Link>.
              </p>
            </div>
          </div>
        </Surface>
      </section>

      {/* ─── Starter Paths ─── */}
      <section className="home-section">
        <Surface style={{ padding: 0, overflow: "hidden" }}>
          <div className="starter-grid">
            <div className="starter-panel">
              <span className="home-section-kicker">Find your beginning</span>
              <h2 className="home-section-title">Tell the product what kind of clarity you want.</h2>
              <p className="home-section-copy" style={{ margin: 0 }}>
                Instead of guessing where to click first, choose the shape of your question and let the
                product recommend the best doorway.
              </p>

              <div className="starter-tabs">
                {STARTER_PATHS.map((path) => {
                  const active = path.id === selectedPathId;
                  return (
                    <button
                      key={path.id}
                      type="button"
                      className={`starter-tab${active ? " active" : ""}`}
                      onClick={() => setSelectedPathId(path.id)}
                      style={
                        active
                          ? { borderColor: `${path.accent}55`, boxShadow: `0 14px 28px ${path.accent}22` }
                          : undefined
                      }
                    >
                      <span className="starter-tab-label">{path.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="starter-preview" style={{ borderColor: `${selectedPath.accent}33` }}>
              <div className="starter-preview-label" style={{ color: selectedPath.accent }}>
                {selectedPath.tag}
              </div>
              <h3 className="starter-preview-title">{selectedPath.title}</h3>
              <p className="starter-preview-copy">{selectedPath.body}</p>
              <div className="starter-preview-list">
                {selectedPath.details.map((detail) => (
                  <div key={detail} className="starter-preview-item">
                    <span className="starter-preview-dot" style={{ background: selectedPath.accent }} />
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
              <Link
                className="button"
                href={selectedPath.href}
                style={{
                  width: "fit-content",
                  background: `linear-gradient(180deg, ${selectedPath.accent}, ${selectedPath.accent}dd)`,
                  boxShadow: `0 12px 24px ${selectedPath.accent}22`,
                }}
              >
                {selectedPath.cta}
              </Link>
            </div>
          </div>
        </Surface>
      </section>

      {/* ─── Module Cards ─── */}
      <section className="home-section">
        <div className="home-section-header">
          <div>
            <span className="home-section-kicker">Choose your doorway</span>
            <h2 className="home-section-title">Start with the kind of clarity you need today.</h2>
          </div>
          <p className="home-section-copy">
            Every pathway is framed to feel like a guided experience, not just raw output.
          </p>
        </div>

        <div className="grid two" style={{ gap: 18 }}>
          {MODULES.map((m) => (
            <Surface key={m.href} style={{ padding: 0, overflow: "hidden" }}>
              <div className="home-module-card">
                <div className="home-module-head">
                  <div className="module-emoji-icon" style={{ background: m.bg, border: `1px solid ${m.accent}22` }}>
                    {m.emoji}
                  </div>
                  <div>
                    <div className="home-module-kicker" style={{ color: m.accent }}>{m.tagline}</div>
                    <h3 className="home-module-title">{m.title}</h3>
                  </div>
                </div>
                <p className="home-module-copy">{m.description}</p>
                <div className="home-module-foot">
                  <span className="home-module-chip" style={{ background: m.bg, color: m.accent }}>
                    Guided pathway
                  </span>
                  <Link
                    className="button"
                    href={m.href}
                    style={{
                      fontSize: 13, padding: "9px 18px",
                      background: `linear-gradient(180deg, ${m.accent}, ${m.accent}dd)`,
                      boxShadow: `0 10px 20px ${m.accent}22`,
                    }}
                  >
                    {m.cta}
                  </Link>
                </div>
              </div>
            </Surface>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="home-section home-trust-band">
        <div className="home-section-header centered">
          <div>
            <span className="home-section-kicker">What members say</span>
            <h2 className="home-section-title">Real seekers. Real clarity.</h2>
          </div>
          <p className="home-section-copy">From first readings to daily practices — across every tier.</p>
        </div>

        <div className="testimonials-track">
          {visibleTestimonials.map((t, i) => (
            <div key={`${t.name}-${i}`} className="testimonial-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div style={{ fontSize: 28, color: "#0a9396", opacity: 0.35, fontFamily: "Georgia, serif", lineHeight: 1 }}>&ldquo;</div>
              <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.7, margin: "8px 0 16px", flexGrow: 1 }}>{t.text}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.city} · {t.rashi}</div>
                </div>
                <span style={{
                  background: t.plan === "Elite" ? "#fde68a" : t.plan === "Pro" ? "#ddd6fe" : "#bfdbfe",
                  color: t.plan === "Elite" ? "#92400e" : t.plan === "Pro" ? "#5b21b6" : "#1e40af",
                  fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                }}>
                  {t.plan}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setTestimonialIdx(i)}
              style={{
                width: 8, height: 8, borderRadius: "50%", border: "none", cursor: "pointer",
                background: i === testimonialIdx % TESTIMONIALS.length ? "#0a9396" : "#cbd5e1",
                transition: "background 0.3s",
                padding: 0,
              }}
            />
          ))}
        </div>
      </section>

      {/* ─── Trust Signals ─── */}
      <section className="home-section">
        <div className="home-section-header centered">
          <div>
            <span className="home-section-kicker">Why it feels trustworthy</span>
            <h2 className="home-section-title">Ancient systems deserve modern care.</h2>
          </div>
          <p className="home-section-copy">
            Trust comes from restraint, provenance, and clear language — not just beautiful output.
          </p>
        </div>

        <div className="grid two" style={{ gap: 16 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="home-feature-card">
              <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pricing Preview ─── */}
      <section className="home-section">
        <div className="home-section-header centered">
          <div>
            <span className="home-section-kicker">Simple pricing</span>
            <h2 className="home-section-title">Start free. Upgrade when you&apos;re ready.</h2>
          </div>
          <p className="home-section-copy">No credit card needed for Free. Every plan cancels in one click.</p>
        </div>

        <div className="pricing-preview-grid">
          {PLAN_HIGHLIGHTS.map((p) => (
            <div
              key={p.id}
              style={{
                border: `2px solid ${p.popular ? p.color : "#e2e8f0"}`,
                borderRadius: 16, padding: "20px 18px", background: p.popular ? `rgba(139,92,246,0.05)` : "#fff",
                position: "relative", transition: "transform 0.2s",
              }}
              className="plan-card"
            >
              {p.popular && (
                <div style={{
                  position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                  background: p.color, color: "#fff", fontSize: 10, fontWeight: 800,
                  padding: "3px 12px", borderRadius: 999, letterSpacing: 1, textTransform: "uppercase",
                }}>Popular</div>
              )}
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a", marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontWeight: 800, color: p.color, fontSize: 20, marginBottom: 14 }}>{p.price}</div>
              {p.perks.map((perk) => (
                <div key={perk} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, fontSize: 13, color: "#475569" }}>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span> {perk}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/pricing" className="button" style={{ fontSize: 14, padding: "10px 24px" }}>
            Compare all plans →
          </Link>
        </div>
      </section>

      {/* ─── Closing CTA ─── */}
      <section className="home-section">
        <Surface style={{ padding: 0, overflow: "hidden" }}>
          <div className="home-closing-card">
            <div>
              <span className="home-section-kicker">Begin simply</span>
              <h2 className="home-section-title" style={{ marginBottom: 10 }}>
                Start with one reading. Build a practice over time.
              </h2>
              <p className="home-section-copy" style={{ margin: 0, maxWidth: 520 }}>
                You do not need to learn the whole system at once. Pick one doorway, get one grounded answer,
                and return when the next question arrives.
              </p>
            </div>
            <div className="home-primary-actions">
              <Link className="button" href="/kundli" style={{ fontSize: 15, padding: "12px 24px" }}>
                Generate Free Kundli
              </Link>
              <Link className="home-secondary-link" href="/register">
                Save future readings
              </Link>
            </div>
          </div>
        </Surface>
      </section>

      <style>{`
        .stats-bar {
          display: flex; gap: 0; background: linear-gradient(135deg,#005f73,#0a9396);
          border-radius: 16px; overflow: hidden;
        }
        .stat-item {
          flex: 1; display: flex; align-items: center; gap: 12;
          padding: 20px 24px; border-right: 1px solid rgba(255,255,255,0.15);
          color: #fff;
        }
        .stat-item:last-child { border-right: none; }
        .stat-icon { font-size: 28px; }
        .stat-value { font-size: 1.4rem; font-weight: 900; }
        .stat-label { font-size: 11px; opacity: 0.8; margin-top: 2px; }
        @media (max-width: 680px) {
          .stats-bar { flex-wrap: wrap; }
          .stat-item { flex: 1 1 45%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.15); }
        }

        .rashifal-widget { padding: 28px; }
        .rashifal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16; margin-bottom: 20px; flex-wrap: wrap; }
        .rashi-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; }
        .rashi-pill {
          display: flex; align-items: center; gap: 5px; padding: 5px 10px;
          border-radius: 999px; border: 1.5px solid #e2e8f0; background: #f8fafc;
          cursor: pointer; font-size: 12px; font-weight: 600; color: #475569;
          transition: all 0.15s;
        }
        .rashi-pill:hover { border-color: #0a9396; color: #0a9396; background: rgba(10,147,150,0.05); }
        .rashi-pill.active { background: #0a9396; border-color: #0a9396; color: #fff; }
        .rashifal-preview {
          background: linear-gradient(135deg, rgba(10,147,150,0.05), rgba(10,147,150,0.02));
          border: 1px solid rgba(10,147,150,0.15); border-radius: 14px; padding: 20px;
        }
        .rashifal-rashi-header { display: flex; align-items: center; gap: 14; }
        .rashifal-sign-icon { font-size: 36px; }
        .rashifal-theme-badge {
          display: inline-block; background: rgba(10,147,150,0.1); color: #0a9396;
          font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
          margin-top: 4px; letter-spacing: 0.5px;
        }
        .rashifal-meta { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; margin-top: 12px; }
        .rashifal-meta-item { background: rgba(255,255,255,0.7); padding: 10px 14px; border-radius: 10px; }

        .testimonials-track {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;
        }
        .testimonial-card {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;
          display: flex; flex-direction: column; animation: fadeUp 0.4s ease both;
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        .pricing-preview-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;
        }
        .plan-card:hover { transform: translateY(-3px); }
      `}</style>
    </main>
  );
}
