"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { postJson } from "../../lib/api";
import { Surface } from "@cortex/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

type MuhurtaWindow = {
  start: string;
  end: string;
  score: number;
  why: string[];
  why_not: string[];
};

type MuhurtaResult = {
  intent: string;
  windows: MuhurtaWindow[];
  disclaimer: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const INTENT_OPTIONS = [
  { value: "marriage", label: "Marriage" },
  { value: "business_launch", label: "Business Launch" },
  { value: "travel", label: "Travel" },
  { value: "property_purchase", label: "Property Purchase" },
  { value: "medical_procedure", label: "Medical Procedure" },
  { value: "exam", label: "Exam / Interview" },
  { value: "new_venture", label: "New Venture" },
];

const TZ_OPTIONS = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAhead(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function formatDT(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      weekday: "short", year: "numeric", month: "short",
      day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function scoreColor(score: number): string {
  if (score >= 70) return "#16a34a";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

function scoreBg(score: number): string {
  if (score >= 70) return "#dcfce7";
  if (score >= 40) return "#fef3c7";
  return "#fee2e2";
}

function scoreLabel(score: number): string {
  if (score >= 70) return "Highly Auspicious";
  if (score >= 40) return "Moderately Suitable";
  return "Not Recommended";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
      <div
        style={{
          flex: 1, height: 8, background: "#e2e8f0", borderRadius: 99, overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`, height: "100%",
            background: scoreColor(score),
            borderRadius: 99, transition: "width 0.4s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "0.78rem", fontWeight: 800, minWidth: 36, textAlign: "right",
          color: scoreColor(score),
        }}
      >
        {score}
      </span>
      <span
        style={{
          fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px",
          borderRadius: 99, background: scoreBg(score), color: scoreColor(score),
          whiteSpace: "nowrap",
        }}
      >
        {scoreLabel(score)}
      </span>
    </div>
  );
}

function WindowCard({ win }: { win: MuhurtaWindow }) {
  return (
    <div
      style={{
        border: `1.5px solid ${scoreColor(win.score)}33`,
        borderRadius: 12, padding: "14px 16px", background: scoreBg(win.score) + "55",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{formatDT(win.start)}</div>
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>to {formatDT(win.end)}</div>
        </div>
      </div>
      <ScoreBar score={win.score} />
      {win.why.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "#16a34a", marginBottom: 4 }}>
            Why auspicious
          </div>
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {win.why.map((w, i) => (
              <li key={i} style={{ fontSize: "0.88rem", color: "#334155", lineHeight: 1.6, paddingBottom: 2 }}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {win.why_not.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "#dc2626", marginBottom: 4 }}>
            Cautions
          </div>
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {win.why_not.map((w, i) => (
              <li key={i} style={{ fontSize: "0.88rem", color: "#7f1d1d", lineHeight: 1.6, paddingBottom: 2 }}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MuhurtaPage() {
  const [intent, setIntent] = useState("marriage");
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(thirtyDaysAhead());
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [result, setResult] = useState<MuhurtaResult | null>(null);
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

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
  };

  async function handleSubmit() {
    if (!intent || !dateFrom || !dateTo || !timezone) {
      setError("Please fill in all fields.");
      return;
    }
    if (dateFrom > dateTo) {
      setError("Start date must be before end date.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await postJson<MuhurtaResult>("/v1/muhurta/pick", {
        profile_id: "demo-1",
        intent,
        date_from: dateFrom,
        date_to: dateTo,
        timezone,
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to find auspicious windows");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="feature-stage">
        <div className="feature-stage-grid">
          <div className="feature-stage-copy">
            <span className="feature-stage-kicker">Vedic Electional Astrology</span>
            <h1 className="feature-stage-title">Find the most auspicious time for your next important event.</h1>
            <p className="feature-stage-summary">
              Muhurta is the classical Vedic art of selecting the right moment. Every major life event — a wedding,
              a new business, surgery, travel — benefits from beginning at a time when the planetary alignments
              are most supportive and obstacles are minimal.
            </p>
            <div className="feature-stage-step-list">
              <div className="feature-stage-step">
                <strong>1.</strong>
                <span>Select the type of event and the window of dates you are considering.</span>
              </div>
              <div className="feature-stage-step">
                <strong>2.</strong>
                <span>The engine evaluates tithi, nakshatra, vara, lagna, and planetary positions.</span>
              </div>
              <div className="feature-stage-step">
                <strong>3.</strong>
                <span>Each window is scored and annotated with supporting factors and cautions.</span>
              </div>
            </div>
          </div>

          <div className="feature-stage-panel">
            <div style={{ background: "#f0fafb", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b", marginBottom: 12 }}>
                What Muhurta considers
              </div>
              {[
                ["Tithi", "Lunar day — governs overall energy quality"],
                ["Nakshatra", "Moon's asterism — key for intent alignment"],
                ["Vara", "Day of week — planetary ruler of the day"],
                ["Lagna", "Rising sign at the chosen hour"],
                ["Yoga", "Sun-Moon combination — auspicious or inauspicious"],
                ["Tarabala", "Star strength for the native"],
              ].map(([term, desc]) => (
                <div key={term} style={{ display: "flex", gap: 10, paddingBottom: 7, borderBottom: "1px solid #e0f2f4", marginBottom: 7 }}>
                  <span style={{ fontWeight: 700, color: "#005f73", minWidth: 72, fontSize: "0.85rem" }}>{term}</span>
                  <span style={{ fontSize: "0.82rem", color: "#475569" }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid two">
        <Surface title="Find Auspicious Windows">
          <div className="form">
            <p className="section-lead">
              Choose an event type and a date range of up to 90 days. The engine will return the best windows
              sorted by auspiciousness score.
            </p>

            <Field
              label="Event Type"
              input={
                <select style={selectStyle} value={intent} onChange={(e) => setIntent(e.target.value)}>
                  {INTENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              }
            />
            <div className="form-grid">
              <Field
                label="Start Date"
                input={
                  <input
                    type="date"
                    style={inputStyle}
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                }
              />
              <Field
                label="End Date"
                input={
                  <input
                    type="date"
                    style={inputStyle}
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                }
              />
            </div>
            <Field
              label="Timezone"
              input={
                <select style={selectStyle} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  {TZ_OPTIONS.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              }
            />

            {error ? <p className="error">{error}</p> : null}

            <div className="button-row">
              <button
                type="button"
                className="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{ background: "linear-gradient(135deg, #005f73, #0a9396)", color: "#fff", border: "none" }}
              >
                {loading ? "Finding windows…" : "Find Auspicious Windows"}
              </button>
            </div>
          </div>
        </Surface>

        <Surface title="Choosing the Right Date Matters">
          <div className="form">
            <p className="section-lead">
              Classical Vedic astrology assigns specific qualities to each moment in time. Starting an important
              event during a powerful muhurta gives it a stable, supported foundation.
            </p>
            <div className="soft-note">
              <strong>Score guide:</strong> 70+ is highly auspicious, 40–69 is moderately suitable but
              with caveats, under 40 indicates unfavorable timing — best avoided for the selected intent.
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="result-section-label" style={{ marginBottom: 8 }}>Best practices</div>
              {[
                "Pick a window with score 70+ when flexibility allows.",
                "Marriage: avoid Saturn's vara (Saturday) and inauspicious nakshatras like Ardra or Jyeshtha.",
                "Business: favor Mercury or Jupiter strong periods.",
                "Medical: choose a waxing Moon period for recovery strength.",
                "Travel: Thursday (Jupiter's day) is traditionally most protective.",
              ].map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: "0.88rem", color: "#334155", paddingBottom: 7, lineHeight: 1.6 }}>
                  <span style={{ color: "#0a9396", fontWeight: 700 }}>•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: "0.82rem", color: "#64748b" }}>
              For a natal-chart-aware muhurta recommendation, first{" "}
              <Link href="/kundli" style={{ color: "#0a9396", fontWeight: 600 }}>generate your Kundli</Link>.
            </div>
          </div>
        </Surface>
      </div>

      {result && (
        <div style={{ marginTop: 16 }}>
          <Surface title={`Auspicious Windows — ${INTENT_OPTIONS.find((o) => o.value === result.intent)?.label ?? result.intent}`}>
            <div style={{ padding: "4px 0" }}>
              {result.windows.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: "#64748b", fontSize: "0.92rem" }}>
                  No highly auspicious windows found in this range. Consider extending the date range.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 14 }}>
                    {result.windows.length} window{result.windows.length !== 1 ? "s" : ""} found — sorted by auspiciousness
                  </div>
                  {result.windows.map((win, i) => (
                    <WindowCard key={i} win={win} />
                  ))}
                </>
              )}
              <div className="disclaimer-text" style={{ marginTop: 12 }}>{result.disclaimer}</div>
            </div>
          </Surface>
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
