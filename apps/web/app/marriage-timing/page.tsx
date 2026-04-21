"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Surface } from "@cortex/ui";
import { postJson } from "../../lib/api";

type DashaWindow = {
  mahadasha_lord: string; emoji: string; start_date: string; end_date: string;
  age_range: string; score: number; is_7th_lord: boolean; is_karaka: boolean; reason: string;
};
type Indicator = { label: string; value: string; detail: string };
type MarriageResult = {
  seventh_house_sign: string; seventh_lord: string; planets_in_7th: string[];
  indicators: Indicator[]; dasha_windows: DashaWindow[];
  top_window: DashaWindow | null; summary: string; disclaimer: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MARRIAGE_INDICATORS = [
  {
    factor: "7th House",
    role: "Primary house of marriage and partnerships",
    details: "The sign on the 7th house cusp (Descendant) and planets placed in or aspecting the 7th house describe the nature of the partner and partnership. Benefics (Jupiter, Venus) here strengthen marriage prospects. Malefics (Saturn, Mars, Rahu) here require careful analysis.",
    planets: ["Venus", "Jupiter"],
    accent: "#0a9396",
  },
  {
    factor: "7th Lord",
    role: "Ruler of the 7th house — the 'marriage significator'",
    details: "The strength, placement, and periods of the 7th house lord are the primary timing tools for marriage. When the 7th lord's dasha or antardasha operates and it receives good transits, marriage events are strongly indicated.",
    planets: ["Any planet ruling the 7th"],
    accent: "#7c3aed",
  },
  {
    factor: "Venus",
    role: "Natural karaka (significator) of marriage for all charts",
    details: "Venus represents love, attraction, and partnership. Venus dasha, Venus antardasha, or major Venus transits (Jupiter conjunct Venus, Venus over the 7th) are classical marriage timing triggers.",
    planets: ["Venus"],
    accent: "#be185d",
  },
  {
    factor: "Jupiter",
    role: "Natural karaka of husband (in female charts); overall auspiciousness",
    details: "Jupiter transiting the 7th house, the 7th lord, or the natal Venus is a classical marriage timing trigger. Jupiter's dasha or antardasha over the 7th lord is highly significant.",
    planets: ["Jupiter"],
    accent: "#f59e0b",
  },
  {
    factor: "Navamsa (D9)",
    role: "The chart of marriage and partnerships",
    details: "The D9 chart is the most important divisional chart for marriage analysis. A well-placed Venus and 7th lord in D9, along with the D9 Lagna lord, confirms marriage timing and quality of the partnership.",
    planets: ["Venus", "7th Lord"],
    accent: "#059669",
  },
  {
    factor: "Rahu / Ketu",
    role: "Nodal axis — often triggers sudden or karmically significant unions",
    details: "Rahu or Ketu transiting or aspecting the 7th house or Venus can trigger marriage, though often with unconventional or sudden circumstances. The Rahu dasha is one of the most common marriage timing dashas.",
    planets: ["Rahu", "Ketu"],
    accent: "#ca6702",
  },
];

const LAGNA_7TH_LORD: Record<string, string> = {
  Aries: "Venus (Libra rules 7th)",
  Taurus: "Mars (Scorpio rules 7th)",
  Gemini: "Jupiter (Sagittarius rules 7th)",
  Cancer: "Saturn (Capricorn rules 7th)",
  Leo: "Saturn (Aquarius rules 7th)",
  Virgo: "Jupiter (Pisces rules 7th)",
  Libra: "Mars (Aries rules 7th)",
  Scorpio: "Venus (Taurus rules 7th)",
  Sagittarius: "Mercury (Gemini rules 7th)",
  Capricorn: "Moon (Cancer rules 7th)",
  Aquarius: "Sun (Leo rules 7th)",
  Pisces: "Mercury (Virgo rules 7th)",
};

const FAVORABLE_TIMING_WINDOWS = [
  { ages: "Ages 23–26", description: "Venus dasha or antardasha for most charts. Traditional prime marriage window in classical Jyotish.", strength: "High" },
  { ages: "Ages 27–30", description: "Jupiter matures at 16, but its full marriage effect peaks in late 20s for many. Common 7th lord antardasha window.", strength: "High" },
  { ages: "Ages 31–34", description: "Saturn matures at 36; this period often brings delayed but stable unions. Second classical window.", strength: "Moderate" },
  { ages: "Ages 35–39", description: "Rahu / Ketu axis — unconventional or karmically charged partnerships become possible.", strength: "Moderate" },
  { ages: "Ages 40+", description: "Less common in classical timing, but Saturn or 7th lord dashas can still bring partnerships — usually more grounded and deliberate.", strength: "Variable" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MarriageTimingPage() {
  const router = useRouter();
  const [dob, setDob] = useState("1994-02-10");
  const [tob, setTob] = useState("08:40");
  const [birthPlace, setBirthPlace] = useState("Delhi");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [selectedLagna, setSelectedLagna] = useState("Aries");
  const [latitude, setLatitude] = useState("28.6139");
  const [longitude, setLongitude] = useState("77.2090");
  const [gender, setGender] = useState("unknown");

  const [analysisResult, setAnalysisResult] = useState<MarriageResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const seventhLord = LAGNA_7TH_LORD[selectedLagna] ?? "Depends on chart";

  function goToKundli() {
    const params = new URLSearchParams({
      date: dob, time: tob, location: birthPlace, timezone,
      question: "What are the key indications and timing for marriage in my chart?",
    });
    router.push(`/kundli?${params.toString()}`);
  }

  async function runAnalysis() {
    setAnalysisError(null); setAnalysisResult(null);
    const lat = parseFloat(latitude); const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) { setAnalysisError("Please enter valid latitude and longitude."); return; }
    setAnalysisLoading(true);
    try {
      const data = await postJson<MarriageResult>("/v1/marriage-timing/analyze", {
        birth: { date: dob, time: tob, timezone, location: birthPlace, latitude: lat, longitude: lon },
        gender,
      });
      setAnalysisResult(data);
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : "Analysis failed.");
    } finally { setAnalysisLoading(false); }
  }

  return (
    <main>
      <section className="feature-stage">
        <div className="feature-stage-grid">
          <div className="feature-stage-copy">
            <span className="feature-stage-kicker">Vedic Marriage Timing Guide</span>
            <h1 className="feature-stage-title">Understand the classical indicators for marriage in your chart.</h1>
            <p className="feature-stage-summary">
              Marriage timing in Vedic astrology relies on a confluence of the 7th house, its lord, Venus, Jupiter,
              and the Navamsa chart. This guide explains the key indicators and classical timing rules — and connects
              you to a full Kundli analysis for precise personal timing.
            </p>
            <div className="feature-stage-step-list">
              <div className="feature-stage-step">
                <strong>1.</strong>
                <span>Learn the classical planetary indicators for marriage in Vedic astrology.</span>
              </div>
              <div className="feature-stage-step">
                <strong>2.</strong>
                <span>Understand the traditional age windows and dasha-based timing rules.</span>
              </div>
              <div className="feature-stage-step">
                <strong>3.</strong>
                <span>Generate a full Kundli to get precise, chart-specific marriage timing.</span>
              </div>
            </div>
          </div>

          <div className="feature-stage-panel">
            <div style={{ background: "#f0fafb", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b", marginBottom: 12 }}>
                Quick 7th Lord Lookup
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: "0.85rem", color: "#475569", fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Your Lagna (Ascendant Sign)
                </label>
                <select
                  style={{
                    border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px",
                    fontSize: 14, background: "#fff", color: "#0f172a", width: "100%", cursor: "pointer",
                  }}
                  value={selectedLagna}
                  onChange={(e) => setSelectedLagna(e.target.value)}
                >
                  {Object.keys(LAGNA_7TH_LORD).map((sign) => (
                    <option key={sign} value={sign}>{sign}</option>
                  ))}
                </select>
              </div>
              <div style={{ background: "#e0f2f4", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#005f73", marginBottom: 4 }}>
                  Your 7th Lord
                </div>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{seventhLord}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4, lineHeight: 1.5 }}>
                  This planet&apos;s dasha / antardasha period is the primary timing indicator for marriage events.
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>
                Note: This is a general rule. The actual Lagna must be calculated from your precise birth data.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA form — send to Kundli */}
      <div className="grid two">
        <Surface title="Generate Full Marriage Analysis">
          <div className="form">
            <p className="section-lead">
              Enter your birth details below and click the button to open the Kundli page pre-filled with your
              data and a marriage-focused question. This is the proper path to precise personal marriage timing.
            </p>

            <div className="form-grid">
              <div className="field">
                <label>Date of Birth</label>
                <input
                  type="date"
                  style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "#fff", color: "#0f172a", width: "100%", boxSizing: "border-box" }}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Time of Birth</label>
                <input
                  type="time"
                  style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "#fff", color: "#0f172a", width: "100%", boxSizing: "border-box" }}
                  value={tob}
                  onChange={(e) => setTob(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Birth Place</label>
              <input
                type="text"
                style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "#fff", color: "#0f172a", width: "100%", boxSizing: "border-box" }}
                value={birthPlace}
                placeholder="City name"
                onChange={(e) => setBirthPlace(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Timezone</label>
              <select
                style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "#fff", color: "#0f172a", width: "100%", cursor: "pointer", boxSizing: "border-box" }}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {["Asia/Kolkata","Asia/Dubai","Asia/Singapore","America/New_York","America/Los_Angeles","Europe/London","America/Toronto","Australia/Sydney"].map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Latitude</label>
                <input type="number" step="0.0001"
                  style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "#fff", color: "#0f172a", width: "100%", boxSizing: "border-box" }}
                  value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="28.6139" />
              </div>
              <div className="field">
                <label>Longitude</label>
                <input type="number" step="0.0001"
                  style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "#fff", color: "#0f172a", width: "100%", boxSizing: "border-box" }}
                  value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="77.2090" />
              </div>
            </div>

            <div className="field">
              <label>Gender (affects marriage karaka)</label>
              <select
                style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "#fff", color: "#0f172a", width: "100%", cursor: "pointer", boxSizing: "border-box" }}
                value={gender} onChange={(e) => setGender(e.target.value)}
              >
                <option value="unknown">Prefer not to say</option>
                <option value="male">Male (Venus as karaka)</option>
                <option value="female">Female (Jupiter as karaka)</option>
              </select>
            </div>

            {analysisError && (
              <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" }}>
                {analysisError}
              </div>
            )}

            <div className="button-row">
              <button
                type="button"
                className="button"
                onClick={runAnalysis}
                disabled={analysisLoading}
                style={{ background: analysisLoading ? "#94a3b8" : "linear-gradient(135deg, #005f73, #0a9396)", color: "#fff", border: "none" }}
              >
                {analysisLoading ? "Analysing chart…" : "💑 Analyse My Chart"}
              </button>
              <button type="button" className="button" onClick={goToKundli}
                style={{ background: "none", border: "1px solid #e2e8f0", color: "#475569" }}>
                Full Kundli →
              </button>
            </div>
          </div>
        </Surface>

        {analysisResult && (
          <Surface title="Your Personal Marriage Timing Analysis">
            <div className="form">
              {/* Summary */}
              <div style={{ background: "#f0fafb", borderRadius: 10, padding: "12px 16px", marginBottom: 16, borderLeft: "3px solid #0a9396" }}>
                <p style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.7, margin: 0 }}>{analysisResult.summary}</p>
              </div>

              {/* Top window */}
              {analysisResult.top_window && (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#16a34a", marginBottom: 4, letterSpacing: "0.06em" }}>
                    Primary Marriage Window
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>
                    {analysisResult.top_window.emoji} {analysisResult.top_window.mahadasha_lord} Mahadasha
                  </div>
                  <div style={{ fontSize: 14, color: "#475569", marginTop: 2 }}>
                    Ages {analysisResult.top_window.age_range} · Score {analysisResult.top_window.score}/10
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, lineHeight: 1.5 }}>
                    {analysisResult.top_window.reason}
                  </div>
                </div>
              )}

              {/* Indicators */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: 8, letterSpacing: "0.06em" }}>
                  Chart Indicators
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {analysisResult.indicators.map((ind, i) => (
                    <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", background: "#f8fafc" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#005f73", marginBottom: 2 }}>{ind.label}</div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a", marginBottom: 2 }}>{ind.value}</div>
                      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{ind.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All dasha windows */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: 8, letterSpacing: "0.06em" }}>
                  Ranked Dasha Windows
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {analysisResult.dasha_windows.map((w, i) => (
                    <div key={i} style={{
                      border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px",
                      display: "flex", gap: 10, alignItems: "center",
                      background: i === 0 ? "#f0fdf4" : "#f8fafc",
                      borderColor: i === 0 ? "#86efac" : "#e2e8f0",
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e0f2f4", display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>
                        {w.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                          {w.mahadasha_lord} · Ages {w.age_range}
                          {w.is_7th_lord && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: "#dbeafe", color: "#1d4ed8", padding: "1px 5px", borderRadius: 4 }}>7th Lord</span>}
                          {w.is_karaka && <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 800, background: "#fce7f3", color: "#be185d", padding: "1px 5px", borderRadius: 4 }}>Karaka</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{w.reason}</div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: w.score >= 8 ? "#16a34a" : w.score >= 6 ? "#0a9396" : "#64748b" }}>{w.score}/10</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 12, lineHeight: 1.5 }}>{analysisResult.disclaimer}</p>
            </div>
          </Surface>
        )}

        <Surface title="Classical Age Windows">
          <div className="form">
            <p className="section-lead">
              Classical Vedic astrology identifies certain age ranges as traditionally favorable for marriage,
              based on planetary maturity (bhava) and typical dasha sequence patterns.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {FAVORABLE_TIMING_WINDOWS.map((w, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #e2e8f0", borderRadius: 10,
                    padding: "10px 14px", background: "#f8fafc",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: "#005f73", fontSize: "0.92rem" }}>{w.ages}</span>
                    <span
                      style={{
                        fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                        background: w.strength === "High" ? "#dcfce7" : w.strength === "Moderate" ? "#fef3c7" : "#f1f5f9",
                        color: w.strength === "High" ? "#16a34a" : w.strength === "Moderate" ? "#d97706" : "#64748b",
                      }}
                    >
                      {w.strength} Potential
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>{w.description}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.6 }}>
              These are indicative classical ranges. Your personal chart may show entirely different windows
              based on dasha sequence and planetary strength. For precise timing,{" "}
              <Link href="/kundli" style={{ color: "#0a9396", fontWeight: 600 }}>generate your Kundli</Link>.
            </div>
          </div>
        </Surface>
      </div>

      {/* Marriage indicators grid */}
      <div style={{ marginTop: 16 }}>
        <Surface title="Classical Marriage Indicators in Vedic Astrology">
          <div style={{ padding: "4px 0" }}>
            <p className="section-lead">
              A complete marriage timing analysis considers all of these factors together. No single indicator
              alone is sufficient — classical Jyotish requires a confluence (at least 2–3 factors) before
              predicting a marriage event.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginTop: 16 }}>
              {MARRIAGE_INDICATORS.map((ind) => (
                <div
                  key={ind.factor}
                  style={{
                    border: `1.5px solid ${ind.accent}33`,
                    borderRadius: 12, padding: "14px 16px",
                    background: `${ind.accent}08`,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `${ind.accent}22`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, color: ind.accent, fontSize: "0.9rem",
                      }}
                    >
                      {ind.factor.slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.92rem" }}>{ind.factor}</div>
                      <div style={{ fontSize: "0.78rem", color: ind.accent, fontWeight: 600 }}>{ind.role}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.7 }}>{ind.details}</div>
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {ind.planets.map((p) => (
                      <span key={p} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${ind.accent}18`, color: ind.accent }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Surface>
      </div>

      {/* Final CTA */}
      <div style={{
        marginTop: 20, padding: "24px 28px",
        background: "linear-gradient(135deg, #004d5d, #0a9396)",
        borderRadius: 16, color: "#fff",
        display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: 6 }}>
            Ready for precise chart-based marriage timing?
          </div>
          <div style={{ fontSize: "0.88rem", opacity: 0.85, maxWidth: 480 }}>
            A full Kundli analysis gives you the 7th house structure, dasha timeline, and Navamsa analysis
            needed for accurate marriage timing — not just classical age windows.
          </div>
        </div>
        <Link
          href="/kundli"
          style={{
            background: "#fff", color: "#005f73", fontWeight: 700,
            padding: "10px 22px", borderRadius: 10, textDecoration: "none",
            fontSize: "0.92rem", flexShrink: 0,
          }}
        >
          Generate Full Kundli →
        </Link>
      </div>

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <Link href="/" style={{ color: "#64748b", fontSize: "0.88rem", textDecoration: "none" }}>
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
