"use client";

import Link from "next/link";
import { Surface } from "@cortex/ui";

const VALUES = [
  {
    icon: "📚",
    title: "Classical before clever",
    body: "Every feature is grounded in classical Vedic texts — Brihat Parashara Hora Shastra, Vastu Shastra Samgraha, and others. AI enhances delivery, not interpretation.",
  },
  {
    icon: "🛡️",
    title: "Safety is non-negotiable",
    body: "Vedic guidance on health, legal, or financial matters is always referred to licensed professionals. Mandatory disclaimers appear on every output, without exception.",
  },
  {
    icon: "🔒",
    title: "Privacy by architecture",
    body: "Your birth data is yours. Local-first storage, zero third-party data sales, and GDPR-compliant deletion on request — from day one, not as an afterthought.",
  },
  {
    icon: "✨",
    title: "Readable over impressive",
    body: "We optimize for the moment you close the report feeling clear, not the moment you feel dazzled. Complexity is editorial work, not a feature.",
  },
  {
    icon: "🌐",
    title: "Accessible to everyone",
    body: "Ancient wisdom shouldn't be gated by geography or income. The Free tier offers genuine value, not a stripped-down teaser.",
  },
  {
    icon: "⚖️",
    title: "Honest about limitations",
    body: "Jyotish is a system of patterns and probabilities — not prophecy. We say so clearly, and we build the product to respect that distinction.",
  },
];

const MILESTONES = [
  { year: "2022", label: "Research phase", detail: "Spent 18 months studying classical Jyotish texts and safety frameworks for AI-assisted spiritual guidance." },
  { year: "2023", label: "Private beta", detail: "500 early members across India provided feedback that shaped the citation-first, safety-first design philosophy." },
  { year: "2024", label: "Public launch", detail: "Launched with Kundli, Vaastu, Matchmaking, and Panchang. Reached 50,000 users in the first 90 days." },
  { year: "2025", label: "Full suite live", detail: "Added live consult, gem guidance, mantra, numerology, and Elite tier. 2,40,000+ readings served." },
];

const TEAM = [
  { name: "Dr. Rajesh Nair", role: "Jyotish Advisor", bio: "25+ years as a practising Jyotishi. Ensures every algorithm respects classical reckoning.", initial: "R", color: "#0a9396" },
  { name: "Meera Iyer", role: "Product & Safety Lead", bio: "Former Google Health PM. Responsible for content safety guardrails and editorial policy.", initial: "M", color: "#8b5cf6" },
  { name: "Vikram Singh", role: "Engineering Lead", bio: "Built data infrastructure at Flipkart. Leads the AI integration and astronomy engine.", initial: "V", color: "#f59e0b" },
  { name: "Priya Menon", role: "UX Director", bio: "Designed experiences for 10M+ users. Champions calm over complexity at every step.", initial: "P", color: "#db2777" },
  { name: "Arjun Das", role: "Classical Texts Editor", bio: "Sanskrit scholar. Curates citation corpus and validates classical text references.", initial: "A", color: "#059669" },
  { name: "Sunita Rao", role: "Customer Experience", bio: "Vedic wellness coach. Bridges the gap between ancient practice and digital delivery.", initial: "S", color: "#ca6702" },
];

const PRESS = [
  { outlet: "The Hindu", quote: "BabaJi brings rare restraint to a space full of overpromising apps." },
  { outlet: "YourStory", quote: "One of the most thoughtfully designed Indian wellness products of 2024." },
  { outlet: "Inc42", quote: "A privacy-first approach that other astrology apps would do well to study." },
  { outlet: "Economic Times", quote: "The app speaks with the calm authority of a learned guide, not a fortune teller." },
];

export default function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #005f73 0%, #0a9396 55%, #c75a04 100%)",
          borderRadius: 24, padding: "52px 40px", color: "#fff", marginBottom: 48, textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🕉</div>
        <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
          Ancient Wisdom, Modern Intelligence
        </h1>
        <p style={{ fontSize: "1.1rem", opacity: 0.92, maxWidth: 640, margin: "0 auto 28px", lineHeight: 1.7 }}>
          BabaJi exists to make Vedic Jyotish and Vaastu accessible, honest, and genuinely useful —
          without the noise, mystification, or predatory upsells that have damaged trust in this space.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/kundli" style={{ background: "#fff", color: "#005f73", fontWeight: 800, padding: "12px 24px", borderRadius: 999, textDecoration: "none", fontSize: 15 }}>
            Try Kundli free
          </Link>
          <Link href="/pricing" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, padding: "12px 24px", borderRadius: 999, textDecoration: "none", fontSize: 15, border: "2px solid rgba(255,255,255,0.4)" }}>
            See plans
          </Link>
        </div>
      </div>

      {/* Mission */}
      <Surface style={{ marginBottom: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#0a9396", marginBottom: 8 }}>Our Mission</div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "#0f172a", margin: "0 0 16px", lineHeight: 1.3 }}>
              Bringing the dignity of classical Jyotish into the digital age.
            </h2>
            <p style={{ color: "#475569", lineHeight: 1.7, margin: "0 0 14px" }}>
              For thousands of years, Vedic astrology was practised with deep scholarship, careful observation, and genuine care for the person sitting across from the Jyotishi. Something of that quality was lost when the discipline moved online — replaced by generic sun-sign content and attention-seeking predictions.
            </p>
            <p style={{ color: "#475569", lineHeight: 1.7, margin: 0 }}>
              BabaJi is an attempt to restore what was lost: specific, grounded, classical guidance, delivered with modern clarity and honest limitations, at a price that respects everyone who comes through the door.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { n: "2,40,000+", l: "Readings served" },
              { n: "480+", l: "Cities across India" },
              { n: "12", l: "Classical texts cited" },
              { n: "99.8%", l: "Uptime SLA" },
            ].map((s) => (
              <div key={s.l} style={{ background: "linear-gradient(135deg, rgba(10,147,150,0.06), rgba(10,147,150,0.02))", border: "1px solid rgba(10,147,150,0.15)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#0a9396" }}>{s.n}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </Surface>

      {/* Values */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#0a9396", marginBottom: 8 }}>What We Stand For</div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>Six principles that guide everything we build.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {VALUES.map((v) => (
            <Surface key={v.title}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{v.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>{v.title}</div>
                  <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>{v.body}</div>
                </div>
              </div>
            </Surface>
          ))}
        </div>
      </div>

      {/* Team */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#0a9396", marginBottom: 8 }}>The Team</div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0f172a", margin: "0 0 8px" }}>Scholars, builders, and practitioners.</h2>
          <p style={{ color: "#64748b", margin: 0, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
            Our team spans classical Jyotish scholarship, AI engineering, safety policy, and UX design.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {TEAM.map((t) => (
            <Surface key={t.name} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${t.color}, ${t.color}99)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 20, flexShrink: 0,
              }}>
                {t.initial}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{t.name}</div>
                <div style={{ fontSize: 12, color: t.color, fontWeight: 700, marginBottom: 4 }}>{t.role}</div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{t.bio}</div>
              </div>
            </Surface>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <Surface style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#0a9396", marginBottom: 8 }}>Our Journey</div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0f172a", margin: "0 0 24px" }}>From research to 2,40,000 readings.</h2>
        <div style={{ position: "relative", paddingLeft: 32 }}>
          <div style={{ position: "absolute", left: 11, top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom, #0a9396, #c75a04)" }} />
          {MILESTONES.map((m, i) => (
            <div key={m.year} style={{ marginBottom: i < MILESTONES.length - 1 ? 28 : 0, position: "relative" }}>
              <div style={{
                position: "absolute", left: -32, top: 2, width: 22, height: 22,
                borderRadius: "50%", background: "#0a9396", border: "3px solid #fff",
                boxShadow: "0 0 0 2px #0a9396", display: "flex", alignItems: "center", justifyContent: "center",
              }} />
              <div style={{ fontWeight: 800, fontSize: 13, color: "#0a9396", marginBottom: 2 }}>{m.year} · {m.label}</div>
              <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{m.detail}</div>
            </div>
          ))}
        </div>
      </Surface>

      {/* Press */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#0a9396", marginBottom: 8 }}>In The Press</div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>What journalists are saying.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {PRESS.map((p) => (
            <div key={p.outlet} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", background: "#f8fafc" }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#0a9396", marginBottom: 8 }}>{p.outlet}</div>
              <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, fontStyle: "italic" }}>&ldquo;{p.quote}&rdquo;</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Surface style={{ textAlign: "center", background: "linear-gradient(135deg, rgba(10,147,150,0.06), rgba(10,147,150,0.02))" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🕉</div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0f172a", margin: "0 0 10px" }}>
          Ready to begin?
        </h2>
        <p style={{ color: "#64748b", margin: "0 0 24px", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
          Generate your first Kundli free. No credit card. No noise.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/kundli" className="button" style={{ fontSize: 15, padding: "12px 28px" }}>
            Start free Kundli
          </Link>
          <Link href="/faq" style={{ color: "#0a9396", fontWeight: 700, fontSize: 14, padding: "12px 16px", textDecoration: "none" }}>
            Read the FAQ →
          </Link>
        </div>
      </Surface>
    </main>
  );
}
