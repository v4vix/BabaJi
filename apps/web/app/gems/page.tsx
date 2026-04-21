"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { postJson } from "../../lib/api";
import { Surface } from "@cortex/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

type GemResult = {
  recommendation: string;
  due_diligence_checklist: string[];
  disclaimers: string[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const PLANET_OPTIONS = [
  { value: "Sun",     label: "Sun",     gem: "Ruby",                symbol: "☀️" },
  { value: "Moon",    label: "Moon",    gem: "Pearl",               symbol: "🌙" },
  { value: "Mars",    label: "Mars",    gem: "Red Coral",           symbol: "🔴" },
  { value: "Mercury", label: "Mercury", gem: "Emerald",             symbol: "💚" },
  { value: "Jupiter", label: "Jupiter", gem: "Yellow Sapphire",     symbol: "🌟" },
  { value: "Venus",   label: "Venus",   gem: "Diamond / White Sapphire", symbol: "💎" },
  { value: "Saturn",  label: "Saturn",  gem: "Blue Sapphire",       symbol: "🪐" },
  { value: "Rahu",    label: "Rahu",    gem: "Hessonite Garnet",    symbol: "☊" },
  { value: "Ketu",    label: "Ketu",    gem: "Cat's Eye",           symbol: "☋" },
];

const BUDGET_OPTIONS = [
  { value: "budget",    label: "Budget / Economy" },
  { value: "mid-range", label: "Mid-Range" },
  { value: "premium",   label: "Premium" },
];

const PLANET_GEM_TABLE = [
  { planet: "Sun",     gem: "Ruby",                    metal: "Gold",       finger: "Ring finger" },
  { planet: "Moon",    gem: "Pearl",                   metal: "Silver",     finger: "Little finger" },
  { planet: "Mars",    gem: "Red Coral",               metal: "Gold/Copper",finger: "Ring finger" },
  { planet: "Mercury", gem: "Emerald",                 metal: "Gold",       finger: "Little finger" },
  { planet: "Jupiter", gem: "Yellow Sapphire",         metal: "Gold",       finger: "Index finger" },
  { planet: "Venus",   gem: "Diamond / White Sapphire",metal: "Platinum/White Gold", finger: "Middle finger" },
  { planet: "Saturn",  gem: "Blue Sapphire",           metal: "Gold/Silver",finger: "Middle finger" },
  { planet: "Rahu",    gem: "Hessonite Garnet",        metal: "Silver",     finger: "Middle finger" },
  { planet: "Ketu",    gem: "Cat's Eye",               metal: "Gold/Silver",finger: "Little finger" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderRecommendation(text: string): ReactNode {
  // Render **bold** markdown inline
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GemsPage() {
  const [planet, setPlanet] = useState("Jupiter");
  const [budget, setBudget] = useState("mid-range");
  const [intention, setIntention] = useState("career growth");
  const [result, setResult] = useState<GemResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    background: "#fff",
    color: "#0f172a",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const selectedPlanetInfo = PLANET_OPTIONS.find((p) => p.value === planet);

  async function handleSubmit() {
    if (!planet || !budget || !intention.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await postJson<GemResult>("/v1/gem/guidance", {
        profile_id: "demo-1",
        primary_planet: planet,
        budget_band: budget,
        intention: intention.trim(),
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get gem guidance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="feature-stage">
        <div className="feature-stage-grid">
          <div className="feature-stage-copy">
            <span className="feature-stage-kicker">Vedic Gemstone Remedy Engine</span>
            <h1 className="feature-stage-title">Planetary gemstone guidance with careful due diligence.</h1>
            <p className="feature-stage-summary">
              In Vedic astrology, gemstones are prescribed to strengthen the energy of specific planets in the
              natal chart. This tool provides cautious, practical guidance — not romanticized gemstone stories.
              Each recommendation includes a full due diligence checklist and important cautions.
            </p>
            <div className="feature-stage-step-list">
              <div className="feature-stage-step">
                <strong>1.</strong>
                <span>Select the planet you wish to strengthen, based on your natal chart analysis.</span>
              </div>
              <div className="feature-stage-step">
                <strong>2.</strong>
                <span>Choose your budget band for realistic stone quality guidance.</span>
              </div>
              <div className="feature-stage-step">
                <strong>3.</strong>
                <span>Get a grounded recommendation with verification steps before any purchase.</span>
              </div>
            </div>
          </div>

          <div className="feature-stage-panel">
            <div style={{ background: "#f0fafb", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b", marginBottom: 12 }}>
                Important before you begin
              </div>
              {[
                "Always consult a trained Jyotishi before purchasing a gemstone — the wrong stone can have adverse effects.",
                "Gemstones only work when they are natural, untreated, and of sufficient quality.",
                "The planet must be a functional benefic in your chart, not a functional malefic.",
                "A full Kundli analysis is the proper starting point for any gemstone recommendation.",
              ].map((note, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: "0.85rem", color: "#334155", paddingBottom: 8, lineHeight: 1.6 }}>
                  <span style={{ color: "#ca6702", fontWeight: 700, flexShrink: 0 }}>⚠</span>
                  <span>{note}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: "0.82rem" }}>
                <Link href="/kundli" style={{ color: "#0a9396", fontWeight: 600 }}>Generate your Kundli first →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid two">
        <Surface title="Get Gem Guidance">
          <div className="form">
            <p className="section-lead">
              Provide your primary planet and intention. The guidance will include stone selection,
              quality criteria, setting instructions, and a due diligence checklist.
            </p>

            <Field
              label="Primary Planet to Strengthen"
              input={
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={planet}
                  onChange={(e) => setPlanet(e.target.value)}
                >
                  {PLANET_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label} — {p.gem}
                    </option>
                  ))}
                </select>
              }
              help="Select the planet based on your Kundli analysis, not intuition alone."
            />

            {selectedPlanetInfo && (
              <div style={{
                background: "#e0f2f4", borderRadius: 8, padding: "8px 12px",
                fontSize: "0.85rem", color: "#005f73", fontWeight: 600, marginBottom: 8,
              }}>
                {selectedPlanetInfo.symbol} {selectedPlanetInfo.planet} → {selectedPlanetInfo.gem}
              </div>
            )}

            <Field
              label="Budget Band"
              input={
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                >
                  {BUDGET_OPTIONS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              }
              help="Budget: synthetic/low carat acceptable. Mid-range: natural 2–3ct. Premium: high clarity natural stones."
            />

            <Field
              label="Intention"
              input={
                <input
                  type="text"
                  style={inputStyle}
                  value={intention}
                  placeholder="e.g. career growth, health, marriage"
                  onChange={(e) => setIntention(e.target.value)}
                />
              }
              help="What specific area of life do you want to improve?"
            />

            <div className="mini-chip-row">
              {["career growth", "marriage & relationships", "health & vitality", "financial stability", "clarity & focus"].map((i) => (
                <button key={i} type="button" className="mini-chip" onClick={() => setIntention(i)}>{i}</button>
              ))}
            </div>

            {error ? <p className="error">{error}</p> : null}

            <div className="button-row">
              <button
                type="button"
                className="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{ background: "linear-gradient(135deg, #005f73, #0a9396)", color: "#fff", border: "none" }}
              >
                {loading ? "Getting guidance…" : "Get Gem Guidance"}
              </button>
            </div>
          </div>
        </Surface>

        <Surface title="Planet → Gem Quick Reference">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f0fafb" }}>
                  {["Planet", "Gemstone", "Metal", "Finger"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#005f73", borderBottom: "2px solid #e0f2f4", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLANET_GEM_TABLE.map((row, i) => (
                  <tr
                    key={row.planet}
                    style={{
                      background: row.planet === planet ? "#e0f2f4" : i % 2 === 0 ? "#fff" : "#f8fafc",
                      fontWeight: row.planet === planet ? 700 : 400,
                    }}
                  >
                    <td style={{ padding: "7px 10px", color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>{row.planet}</td>
                    <td style={{ padding: "7px 10px", color: "#334155", borderBottom: "1px solid #f1f5f9" }}>{row.gem}</td>
                    <td style={{ padding: "7px 10px", color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>{row.metal}</td>
                    <td style={{ padding: "7px 10px", color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>{row.finger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14, fontSize: "0.8rem", color: "#64748b", lineHeight: 1.6 }}>
            These are classical Vedic assignments. Individual natal chart analysis may modify the recommendation.
            Never wear a gemstone without confirming it is a functional benefic planet in your specific chart.
          </div>
        </Surface>
      </div>

      {result && (
        <div style={{ marginTop: 16 }}>
          <div className="insight-tile" data-testid="gem-result">
            <div className="insight-tile-header">
              <h3>Gem Guidance — {planet}</h3>
              <p>Budget: {BUDGET_OPTIONS.find((b) => b.value === budget)?.label} · Intention: {intention}</p>
            </div>
            <div className="insight-tile-body">
              <div className="result-section">
                <div className="result-section-label">Recommendation</div>
                <div className="result-section-text" style={{ lineHeight: 1.8 }}>
                  {renderRecommendation(result.recommendation)}
                </div>
              </div>

              {result.due_diligence_checklist.length > 0 && (
                <div className="result-section">
                  <div className="result-section-label">Due Diligence Checklist</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {result.due_diligence_checklist.map((item, i) => (
                      <label
                        key={i}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "8px 10px", borderRadius: 8,
                          background: "#f8fafc", border: "1px solid #e2e8f0",
                          cursor: "pointer",
                        }}
                      >
                        <input type="checkbox" style={{ marginTop: 3, flexShrink: 0, accentColor: "#0a9396" }} />
                        <span style={{ fontSize: "0.88rem", color: "#334155", lineHeight: 1.6 }}>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {result.disclaimers.length > 0 && (
                <div className="result-section">
                  <div className="result-section-label">Important Cautions</div>
                  {result.disclaimers.map((d, i) => (
                    <div key={i} style={{ fontSize: "0.88rem", color: "#7f1d1d", background: "#fff5f5", borderRadius: 8, padding: "7px 10px", marginBottom: 4, lineHeight: 1.6 }}>
                      {d}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <Link href="/" style={{ color: "#64748b", fontSize: "0.88rem", textDecoration: "none" }}>
          ← Back to Home
        </Link>
      </div>
    </main>
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
