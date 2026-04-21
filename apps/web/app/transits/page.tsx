"use client";

import { useState, type ChangeEvent } from "react";
import { postJson } from "../../lib/api";
import { Surface } from "@cortex/ui";

type BirthForm = {
  date: string;
  time: string;
  timezone: string;
  location: string;
  latitude: string;
  longitude: string;
};

type TransitImpact = {
  transiting_planet: string;
  natal_planet: string;
  transit_sign: string;
  transit_degree: number;
  natal_house: number;
  aspect_type: string;
  orb_degrees: number;
  intensity: "high" | "medium" | "low";
  intensity_score: number;
  title: string;
  description: string;
};

type TransitResponse = {
  transits: TransitImpact[];
  summary: string;
  disclaimer: string;
  generated_at: string;
};

type Notice = { tone: "info" | "success" | "error"; text: string } | null;

const TZ_OPTIONS = [
  { label: "IST (India, UTC+5:30)", value: "5.5" },
  { label: "UTC+0", value: "0" },
  { label: "EST (UTC-5)", value: "-5" },
  { label: "PST (UTC-8)", value: "-8" },
  { label: "CET (UTC+1)", value: "1" },
  { label: "SGT (UTC+8)", value: "8" },
  { label: "JST (UTC+9)", value: "9" },
  { label: "GST (UAE, UTC+4)", value: "4" },
];

const INTENSITY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  high:   { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
  medium: { bg: "#fffbeb", color: "#d97706", border: "#fcd34d" },
  low:    { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
};

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};

function field(
  label: string,
  input: React.ReactNode,
): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {input}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
  fontSize: 14, outline: "none", background: "#fff", color: "#0f172a",
  transition: "border-color 0.15s",
};

export default function TransitsPage() {
  const [form, setForm] = useState<BirthForm>({
    date: "1990-01-01",
    time: "06:00",
    timezone: "5.5",
    location: "New Delhi",
    latitude: "28.6139",
    longitude: "77.2090",
  });
  const [result, setResult] = useState<TransitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  function set(key: keyof BirthForm) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setResult(null);
    const lat = parseFloat(form.latitude);
    const lon = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lon)) {
      setNotice({ tone: "error", text: "Please enter valid latitude and longitude." });
      return;
    }
    setLoading(true);
    try {
      const data = await postJson<TransitResponse>("/v1/transits/impact", {
        birth: {
          date: form.date,
          time: form.time,
          timezone: form.timezone,
          location: form.location,
          latitude: lat,
          longitude: lon,
        },
      });
      setResult(data);
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Request failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
        🪐 Transit Impact Dashboard
      </h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
        See how today&apos;s planetary positions aspect your natal chart and what they mean for you.
      </p>

      <Surface>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Date of Birth",
              <input type="date" style={inputStyle} value={form.date} onChange={set("date")} required />
            )}
            {field("Time of Birth",
              <input type="time" style={inputStyle} value={form.time} onChange={set("time")} required />
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Timezone",
              <select style={inputStyle} value={form.timezone} onChange={set("timezone")}>
                {TZ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {field("Birth Place",
              <input type="text" style={inputStyle} value={form.location} onChange={set("location")} placeholder="e.g. New Delhi" />
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Latitude",
              <input type="number" style={inputStyle} step="0.0001" value={form.latitude} onChange={set("latitude")} placeholder="28.6139" required />
            )}
            {field("Longitude",
              <input type="number" style={inputStyle} step="0.0001" value={form.longitude} onChange={set("longitude")} placeholder="77.2090" required />
            )}
          </div>

          {notice && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, fontSize: 13,
              background: notice.tone === "error" ? "#fef2f2" : "#f0fdf4",
              color: notice.tone === "error" ? "#dc2626" : "#16a34a",
              border: `1px solid ${notice.tone === "error" ? "#fca5a5" : "#86efac"}`,
            }}>
              {notice.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "11px 28px", borderRadius: 10, border: "none", cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#94a3b8" : "linear-gradient(135deg, #005f73, #0a9396)",
              color: "#fff", fontWeight: 700, fontSize: 15, alignSelf: "flex-start",
            }}
          >
            {loading ? "Calculating…" : "Show My Transits"}
          </button>
        </form>
      </Surface>

      {result && (
        <div style={{ marginTop: 28 }}>
          {/* Summary */}
          <Surface>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 28, lineHeight: 1 }}>🌟</span>
              <div>
                <p style={{ fontSize: 15, color: "#0f172a", fontWeight: 600, marginBottom: 4 }}>
                  Today&apos;s Cosmic Summary
                </p>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{result.summary}</p>
              </div>
            </div>
          </Surface>

          {/* Transits list */}
          {result.transits.length === 0 ? (
            <Surface>
              <p style={{ color: "#64748b", textAlign: "center", fontSize: 14 }}>
                No significant transit aspects are active today. A quiet, introspective period.
              </p>
            </Surface>
          ) : (
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {result.transits.map((t, i) => {
                const c = INTENSITY_COLORS[t.intensity] ?? INTENSITY_COLORS.low;
                return (
                  <Surface key={i}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ flexShrink: 0 }}>
                        <span style={{ fontSize: 26 }}>
                          {PLANET_GLYPHS[t.transiting_planet] ?? "🪐"}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{t.title}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12,
                            background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                            textTransform: "uppercase", letterSpacing: "0.04em",
                          }}>
                            {t.intensity}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 8 }}>
                          {t.description}
                        </p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: "#94a3b8", background: "#f8fafc", padding: "2px 8px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            {t.aspect_type} · {t.orb_degrees.toFixed(1)}° orb
                          </span>
                          <span style={{ fontSize: 11, color: "#94a3b8", background: "#f8fafc", padding: "2px 8px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            House {t.natal_house}
                          </span>
                          <span style={{ fontSize: 11, color: "#94a3b8", background: "#f8fafc", padding: "2px 8px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            {PLANET_GLYPHS[t.transiting_planet] ?? ""} {t.transiting_planet} in {t.transit_sign} {t.transit_degree.toFixed(1)}°
                          </span>
                        </div>
                      </div>
                    </div>
                  </Surface>
                );
              })}
            </div>
          )}

          {/* Disclaimer */}
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16, lineHeight: 1.5 }}>
            {result.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
