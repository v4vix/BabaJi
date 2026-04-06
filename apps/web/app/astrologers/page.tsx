"use client";

import Link from "next/link";
import { Surface } from "@cortex/ui";

const ASTROLOGERS = [
  {
    id: "pandit-rajesh-nair",
    name: "Pandit Rajesh Nair",
    title: "Senior Jyotishi",
    years: 28,
    city: "Thiruvananthapuram",
    specialties: ["Natal Kundli", "Career & Finance", "Prashna Jyotish"],
    languages: ["English", "Malayalam", "Hindi"],
    rating: 4.9,
    reviews: 2847,
    consults: "12,000+",
    initial: "R",
    color: "#0a9396",
    verified: true,
    bio: "Pandit Rajesh holds a shastri degree from Sanskrit Vishwavidyalaya, Varanasi, and has practised Jyotish for 28 years across Kerala, Bengaluru, and London. Specialises in Prashna Kundli and natal chart correction.",
    available: true,
    tier: "Elite",
  },
  {
    id: "dr-meera-krishnamurthy",
    name: "Dr. Meera Krishnamurthy",
    title: "Jyotish Acharya",
    years: 20,
    city: "Mysuru",
    specialties: ["Marriage & Compatibility", "Gemstone Guidance", "Muhurta"],
    languages: ["English", "Kannada", "Tamil"],
    rating: 4.8,
    reviews: 1932,
    consults: "8,500+",
    initial: "M",
    color: "#8b5cf6",
    verified: true,
    bio: "Dr. Meera holds a PhD in Sanskrit and has taught Jyotish at University of Mysuru for a decade. Her expertise lies in the classical application of Muhurta and marriage compatibility using the full 36-point Ashtakoot system.",
    available: true,
    tier: "Pro",
  },
  {
    id: "acharya-suresh-sharma",
    name: "Acharya Suresh Sharma",
    title: "Vedic Astrologer",
    years: 35,
    city: "Varanasi",
    specialties: ["Dasha Interpretation", "Jaimini System", "Remedies"],
    languages: ["Hindi", "Sanskrit", "English"],
    rating: 4.95,
    reviews: 4210,
    consults: "22,000+",
    initial: "S",
    color: "#f59e0b",
    verified: true,
    bio: "Acharya Suresh is a 3rd-generation Jyotishi from Varanasi. He is one of the few practitioners deeply versed in both Parashara and Jaimini systems, with special expertise in Chara dasha and remedial astrology.",
    available: false,
    tier: "Elite",
    waitDays: 14,
  },
  {
    id: "kavitha-venkataraman",
    name: "Kavitha Venkataraman",
    title: "Jyotish Practitioner",
    years: 12,
    city: "Chennai",
    specialties: ["Vaastu Shastra", "Child Naming", "Education & Career"],
    languages: ["Tamil", "English", "Telugu"],
    rating: 4.7,
    reviews: 1108,
    consults: "4,200+",
    initial: "K",
    color: "#db2777",
    verified: true,
    bio: "Kavitha combines classical Vaastu Shastra with Jyotish timing to advise on home orientation, child naming ceremonies, and educational timing. She consults in English and Tamil, making complex concepts highly accessible.",
    available: true,
    tier: "Plus",
  },
  {
    id: "amit-bhatnagar",
    name: "Pt. Amit Bhatnagar",
    title: "Jyotish Guru",
    years: 18,
    city: "Jaipur",
    specialties: ["Lal Kitab", "Nadi Astrology", "Health & Longevity"],
    languages: ["Hindi", "Rajasthani", "English"],
    rating: 4.85,
    reviews: 2341,
    consults: "9,800+",
    initial: "A",
    color: "#059669",
    verified: true,
    bio: "Pt. Amit is known for his expertise in Lal Kitab and Nadi astrology — two of the most esoteric branches of Jyotish. He provides structured, practical remedies that his clients describe as life-changing in their specificity.",
    available: true,
    tier: "Pro",
  },
  {
    id: "sunita-desai",
    name: "Sunita Desai",
    title: "Vedic Counsellor",
    years: 10,
    city: "Pune",
    specialties: ["Numerology Integration", "Spiritual Guidance", "Women's Issues"],
    languages: ["Marathi", "Hindi", "English"],
    rating: 4.75,
    reviews: 876,
    consults: "3,100+",
    initial: "S",
    color: "#ca6702",
    verified: false,
    bio: "Sunita integrates Vedic numerology with Jyotish to provide holistic guidance, particularly around life transitions, relationships, and spiritual growth. She runs weekly group sessions in Pune and Nashik.",
    available: true,
    tier: "Plus",
  },
];

const SPECIALTIES = ["All", "Natal Kundli", "Career & Finance", "Marriage & Compatibility", "Vaastu Shastra", "Muhurta", "Remedies", "Health & Longevity", "Spiritual Guidance"];

const TIER_COLORS: Record<string, { bg: string; color: string }> = {
  Elite: { bg: "#fef3c7", color: "#92400e" },
  Pro: { bg: "#ede9fe", color: "#5b21b6" },
  Plus: { bg: "#dbeafe", color: "#1e40af" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color: "#f59e0b", fontSize: 13 }}>
      {"★".repeat(Math.floor(rating))}{"☆".repeat(5 - Math.floor(rating))}
      <span style={{ color: "#64748b", marginLeft: 5, fontWeight: 700 }}>{rating}</span>
    </span>
  );
}

export default function AstrologersPage() {
  return (
    <main>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#0a9396", marginBottom: 8 }}>
          Expert Jyotishis
        </div>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, color: "#0f172a", margin: "0 0 14px", letterSpacing: "-0.02em" }}>
          Meet our classical scholars
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#64748b", maxWidth: 560, margin: "0 auto 24px", lineHeight: 1.7 }}>
          Every BabaJi expert holds formal Jyotish credentials and passes a rigorous content verification process.
          No generic fortune-tellers — only classical scholars.
        </p>

        {/* Filters (static for now) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {SPECIALTIES.map((s, i) => (
            <button
              key={s}
              type="button"
              style={{
                padding: "6px 14px", borderRadius: 999,
                border: i === 0 ? "none" : "1px solid #e2e8f0",
                background: i === 0 ? "#0a9396" : "#fff",
                color: i === 0 ? "#fff" : "#475569",
                fontSize: 13, fontWeight: i === 0 ? 700 : 500, cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Trust bar */}
      <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap", marginBottom: 40 }}>
        {[
          { n: "6", l: "Verified Jyotishis" },
          { n: "35+", l: "Avg. years experience" },
          { n: "60,000+", l: "Consultations conducted" },
          { n: "4.85★", l: "Average rating" },
        ].map((s) => (
          <div key={s.l} style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 900, fontSize: "1.4rem", color: "#0a9396" }}>{s.n}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Astrologer cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 60 }}>
        {ASTROLOGERS.map((a) => {
          const tierBadge = TIER_COLORS[a.tier];
          return (
            <Surface key={a.id} style={{ position: "relative" }}>
              {a.verified && (
                <div style={{ position: "absolute", top: 16, right: 16, background: "#dcfce7", color: "#15803d", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, letterSpacing: 0.5 }}>
                  ✓ VERIFIED
                </div>
              )}

              {/* Header */}
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${a.color}, ${a.color}99)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 900, fontSize: 22,
                }}>
                  {a.initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", marginBottom: 2 }}>{a.name}</div>
                  <div style={{ fontSize: 13, color: a.color, fontWeight: 700 }}>{a.title} · {a.years} yrs</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>📍 {a.city}</div>
                </div>
              </div>

              {/* Rating & Stats */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                <StarRating rating={a.rating} />
                <span style={{ fontSize: 12, color: "#94a3b8" }}>({a.reviews.toLocaleString()} reviews)</span>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  <strong style={{ color: "#0f172a" }}>{a.consults}</strong> consults
                </div>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  Languages: <strong style={{ color: "#0f172a" }}>{a.languages.join(", ")}</strong>
                </div>
              </div>

              {/* Specialties */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {a.specialties.map((s) => (
                  <span key={s} style={{ background: `${a.color}12`, color: a.color, border: `1px solid ${a.color}30`, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>
                    {s}
                  </span>
                ))}
              </div>

              {/* Bio */}
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 16px" }}>{a.bio}</p>

              {/* Footer */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: a.available ? "#22c55e" : "#94a3b8", display: "inline-block",
                  }} />
                  <span style={{ fontSize: 12, color: a.available ? "#15803d" : "#94a3b8", fontWeight: 600 }}>
                    {a.available ? "Available now" : `Available in ${a.waitDays ?? "7"} days`}
                  </span>
                </div>
                {tierBadge && (
                  <span style={{ fontSize: 10, fontWeight: 800, background: tierBadge.bg, color: tierBadge.color, padding: "3px 8px", borderRadius: 4 }}>
                    {a.tier}+ Plan
                  </span>
                )}
              </div>

              <Link
                href="/consult"
                style={{
                  display: "block", marginTop: 14, textAlign: "center",
                  background: a.available ? `linear-gradient(135deg,${a.color},${a.color}dd)` : "#e2e8f0",
                  color: a.available ? "#fff" : "#94a3b8",
                  padding: "11px 0", borderRadius: 10, textDecoration: "none",
                  fontSize: 14, fontWeight: 700, transition: "opacity 0.2s",
                }}
              >
                {a.available ? "Book session" : "Join waitlist"}
              </Link>
            </Surface>
          );
        })}
      </div>

      {/* How it works */}
      <Surface style={{ marginBottom: 48 }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.4rem", color: "#0f172a", margin: "0 0 24px" }}>
          How live consult works
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          {[
            { step: "01", title: "Choose your Jyotishi", body: "Browse by specialty, language, and availability. All are classically trained and BabaJi-verified." },
            { step: "02", title: "Share your birth data", body: "Your Kundli is computed and shared with the astrologer before the session begins — no time wasted." },
            { step: "03", title: "Confirm consent", body: "You confirm a consent note that the session is educational guidance, not medical or legal advice." },
            { step: "04", title: "Consult & receive summary", body: "Chat, voice, or video session. A structured summary with action points is auto-generated afterward." },
          ].map((s) => (
            <div key={s.step} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(10,147,150,0.1)", color: "#0a9396", fontWeight: 900, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.step}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </Surface>

      {/* CTA */}
      <div style={{ background: "linear-gradient(135deg,#005f73,#0a9396)", borderRadius: 20, padding: "36px 32px", textAlign: "center", color: "#fff" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: "1.6rem", fontWeight: 900 }}>Ready for a live session?</h2>
        <p style={{ margin: "0 0 24px", opacity: 0.9, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          Elite and Consult Video add-on users can book immediately. New to BabaJi? Start with a free Kundli first.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/consult" style={{ background: "#fff", color: "#005f73", fontWeight: 800, padding: "12px 24px", borderRadius: 999, textDecoration: "none", fontSize: 15 }}>
            Book a consult
          </Link>
          <Link href="/pricing" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, padding: "12px 24px", borderRadius: 999, textDecoration: "none", fontSize: 15, border: "2px solid rgba(255,255,255,0.4)" }}>
            View plans
          </Link>
        </div>
      </div>
    </main>
  );
}
