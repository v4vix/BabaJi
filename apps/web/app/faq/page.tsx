"use client";

import { useState } from "react";
import Link from "next/link";
import { Surface } from "@cortex/ui";

type FAQ = { q: string; a: string };
type Section = { id: string; label: string; icon: string; faqs: FAQ[] };

const SECTIONS: Section[] = [
  {
    id: "general",
    label: "General",
    icon: "🌐",
    faqs: [
      { q: "What is BabaJi?", a: "BabaJi is a privacy-first Vedic astrology and spiritual guidance platform. It combines classical Jyotish scholarship with modern AI to deliver Kundli reports, Vaastu analysis, matchmaking, daily Panchang, Tarot, Numerology, Mantra guidance, and live consult sessions." },
      { q: "Is BabaJi based on Vedic or Western astrology?", a: "BabaJi is strictly Vedic (Jyotish). All chart calculations use the Lahiri ayanamsha (sidereal zodiac), and guidance is grounded in classical texts like Brihat Parashara Hora Shastra and the Vastu Shastra Samgraha." },
      { q: "Who is BabaJi for?", a: "Anyone curious about Vedic astrology — from first-time readers to practising Jyotishis looking for a digital workspace. The platform is designed to be readable without prior Jyotish knowledge." },
      { q: "Is BabaJi available on mobile?", a: "Yes. The web app is fully responsive on mobile browsers. A dedicated iOS and Android app is in active development." },
      { q: "What languages does BabaJi support?", a: "English is the primary language right now. Hindi, Tamil, Telugu, and Kannada support are on the product roadmap." },
    ],
  },
  {
    id: "kundli",
    label: "Kundli & Charts",
    icon: "🔮",
    faqs: [
      { q: "How accurate is the Kundli calculation?", a: "BabaJi uses the pyswisseph library (Swiss Ephemeris), which is the gold standard for astronomical precision. Lahiri ayanamsha is applied for all sidereal calculations. Vimshottari Dasha periods are computed from the Moon's natal position." },
      { q: "What does a Kundli report include?", a: "A full report includes: D1 Lagna chart, D9 Navamsha, D10 Dashamsha, planetary positions in signs and houses, Panchang at birth, current and upcoming Vimshottari Dasha timeline, yoga identifications, and a personalized AI narrative grounded in classical principles." },
      { q: "What is 'Talk to Kundli'?", a: "Talk to Kundli lets you ask specific questions about your chart — like 'What does my 7th lord placement indicate?' or 'When is a good time for a career change?' — and receive a grounded, cited answer based on your actual birth data." },
      { q: "What is birth time rectification?", a: "If you are uncertain about your exact birth time, the rectification assistant helps narrow the window using known life events (like a marriage, career change, or move) and event chart analysis. Available on Pro and Elite plans." },
      { q: "Is my birth data stored on BabaJi servers?", a: "You control this. Charts are processed in memory and not stored unless you explicitly save a report to your account. You can delete all stored data at any time from Account → Privacy." },
    ],
  },
  {
    id: "vaastu",
    label: "Vaastu Shastra",
    icon: "🏠",
    faqs: [
      { q: "What does a Vaastu report analyse?", a: "The report covers all major rooms (main entrance, kitchen, master bedroom, children's room, study, puja room, and bathroom) against the 8-direction framework from classical Vaastu texts. Each section includes a directional assessment, remedies, and a safety checklist." },
      { q: "Do I need professional measurements for Vaastu analysis?", a: "No. The analysis is based on your description of the space layout and room directions. For structural changes, BabaJi always recommends consulting a licensed architect or Vaastu practitioner — the platform provides educational guidance, not structural advice." },
      { q: "Is Vaastu available on all plans?", a: "Vaastu Studio is available on Elite plans and as a standalone add-on for ₹999/month. It is not included in Free, Plus, or Pro." },
    ],
  },
  {
    id: "billing",
    label: "Plans & Billing",
    icon: "💳",
    faqs: [
      { q: "What is the Free tier?", a: "Free gives you guided spiritual chat, ritual guidance, Ayurveda education, and a preview of daily rashifal readings — no credit card needed, forever. It is a genuine tier, not a stripped-down teaser." },
      { q: "Can I cancel anytime?", a: "Yes. Cancel from Account → Subscription with one click. You retain access until the end of your current billing period, then revert to the Free tier." },
      { q: "Do prices change after I subscribe?", a: "No. Your price is locked at the rate you subscribed at. If we increase prices in the future, existing subscribers are grandfathered at their original rate for the duration of their active subscription." },
      { q: "What are add-ons?", a: "Add-ons let you unlock individual premium features (Vaastu Studio, Gem Consultancy, Matchmaking Studio, Kundli Video, Consult Video) on any base plan. No need to upgrade to Elite for just one module." },
      { q: "What are bundles?", a: "Bundles are one-time credit packages for heavier users (e.g., 60 consult minutes, 180 consult minutes, or a Reports Combo). Credits are added to your wallet immediately on purchase." },
      { q: "What payment methods do you accept?", a: "UPI, cards (Visa, Mastercard, RuPay), net banking, and wallets via Stripe and Razorpay. Subscriptions are billed monthly or annually in INR and USD." },
      { q: "How does the wallet work?", a: "Your wallet holds credits earned from bundles, offers, and subscriptions. Credits are deducted automatically when you use premium features like live consult minutes or video generation slots." },
      { q: "Is there a student or NGO discount?", a: "Yes. Email support@babaji.app with your institution details for a 30% discount on Plus or Pro annual plans." },
    ],
  },
  {
    id: "consult",
    label: "Live Consult",
    icon: "💬",
    faqs: [
      { q: "Who are the consultants on BabaJi?", a: "BabaJi sessions are AI-assisted Jyotish guidance, not live human astrologers in v1. The consult module uses your birth data, current dasha periods, and a session-specific question to generate a detailed, cited consultation. Human advisor integration is planned for v2." },
      { q: "What modes are available for consult?", a: "Text chat is available on Plus, Pro, and Elite. Voice session and video session are available on Elite or with the Consult Video add-on." },
      { q: "Are session transcripts stored?", a: "Transcripts are stored for 90 days by default to enable session summaries and action plans. You can set retention to 24 hours or zero (no storage) in Account → Privacy before starting a session." },
      { q: "Is consent required before a session?", a: "Yes. You must confirm a consent checkbox acknowledging the educational nature of the guidance before any consult session begins. This cannot be bypassed." },
    ],
  },
  {
    id: "privacy",
    label: "Privacy & Safety",
    icon: "🔒",
    faqs: [
      { q: "Does BabaJi sell my data?", a: "Never. We do not sell, rent, or broker personal data to any third party. Revenue comes entirely from subscriptions and add-ons." },
      { q: "How do I delete my account and data?", a: "Go to Account → Privacy → Request Data Deletion. Your profile, reports, and session data are deleted within 30 days. This is irreversible and complies with GDPR Article 17." },
      { q: "What are the safety disclaimers about?", a: "Every report includes mandatory disclaimers stating that BabaJi is an educational tool, not a substitute for licensed medical, legal, or financial advice. These cannot be disabled. This is core to how we operate." },
      { q: "Can minors use BabaJi?", a: "BabaJi is intended for users aged 18 and above. Kundli reports for minors can be generated by a parent or guardian from their own account." },
      { q: "Is BabaJi secure?", a: "Yes. All data in transit uses TLS 1.3. At rest, sensitive fields are encrypted. Authentication uses secure JWT tokens with short expiry and refresh flows. We do not store passwords in plain text — bcrypt hashing is applied." },
    ],
  },
  {
    id: "technical",
    label: "Technical",
    icon: "⚙️",
    faqs: [
      { q: "What AI model powers BabaJi?", a: "BabaJi uses Anthropic Claude for premium narrative generation. The system falls back to a local LLM (Ollama), and finally to deterministic computation if both are unavailable — so it always works, even offline." },
      { q: "Does BabaJi work offline?", a: "Core chart calculations and deterministic guidance work without an internet connection. AI narrative generation requires connectivity to the API service." },
      { q: "Is there an API for developers?", a: "A public developer API is planned for Q3 2025. If you have a specific use case, email dev@babaji.app to join the early access waitlist." },
      { q: "How do I report a bug or inaccuracy?", a: "Use the feedback button in any report, or email support@babaji.app with your report ID. Jyotish inaccuracies reviewed by our classical advisor team typically receive a response within 3 business days." },
    ],
  },
];

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #f1f5f9" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", textAlign: "left", padding: "16px 0", background: "none", border: "none",
          cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.4 }}>{faq.q}</span>
        <span style={{
          width: 24, height: 24, borderRadius: "50%", background: open ? "#0a9396" : "#f1f5f9",
          color: open ? "#fff" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, flexShrink: 0, transition: "all 0.2s",
        }}>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: 16, fontSize: 14, color: "#475569", lineHeight: 1.7 }}>
          {faq.a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [activeSection, setActiveSection] = useState("general");
  const section = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];

  return (
    <main>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#0a9396", marginBottom: 8 }}>
          Help & FAQs
        </div>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 900, color: "#0f172a", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
          Frequently asked questions
        </h1>
        <p style={{ fontSize: "1rem", color: "#64748b", maxWidth: 480, margin: "0 auto 24px" }}>
          Can&apos;t find what you&apos;re looking for? Email{" "}
          <a href="mailto:support@babaji.app" style={{ color: "#0a9396", fontWeight: 600 }}>support@babaji.app</a>
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>
        {/* Section nav */}
        <div style={{ position: "sticky", top: 80 }}>
          <nav>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 4,
                  fontSize: 14, fontWeight: activeSection === s.id ? 700 : 500,
                  background: activeSection === s.id ? "rgba(10,147,150,0.1)" : "transparent",
                  color: activeSection === s.id ? "#0a9396" : "#475569",
                  transition: "all 0.15s",
                }}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ marginTop: 24, padding: "16px", background: "rgba(10,147,150,0.06)", borderRadius: 12, border: "1px solid rgba(10,147,150,0.15)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 6 }}>Still have questions?</div>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px", lineHeight: 1.5 }}>Our team responds within 24 hours.</p>
            <a
              href="mailto:support@babaji.app"
              style={{ display: "block", textAlign: "center", background: "#0a9396", color: "#fff", borderRadius: 8, padding: "8px 12px", textDecoration: "none", fontSize: 13, fontWeight: 700 }}
            >
              Contact support
            </a>
          </div>
        </div>

        {/* FAQ content */}
        <Surface>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 28 }}>{section.icon}</span>
            <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>{section.label}</h2>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>{section.faqs.length} questions</span>
          </div>
          {section.faqs.map((faq) => (
            <FAQItem key={faq.q} faq={faq} />
          ))}
        </Surface>
      </div>

      {/* Quick links */}
      <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {[
          { href: "/kundli", icon: "🔮", label: "Try Kundli", sub: "Start a free chart" },
          { href: "/pricing", icon: "💳", label: "See pricing", sub: "Compare all plans" },
          { href: "/about", icon: "🕉", label: "About BabaJi", sub: "Our mission & team" },
          { href: "/register", icon: "✨", label: "Create account", sub: "Free, no card needed" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
              border: "1px solid #e2e8f0", borderRadius: 12, textDecoration: "none",
              background: "#fff", transition: "all 0.15s",
            }}
            className="faq-quick-link"
          >
            <span style={{ fontSize: 24 }}>{l.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{l.label}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{l.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .faq-quick-link:hover { border-color: #0a9396; box-shadow: 0 4px 12px rgba(10,147,150,0.1); }
        @media (max-width: 720px) {
          .faq-page-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
