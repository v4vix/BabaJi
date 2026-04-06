"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { postJson } from "../../lib/api";
import { Surface } from "@cortex/ui";

type PanchangForm = { profile_id: string; date: string; timezone: string; location: string };
type MuhurtaForm = { profile_id: string; intent: string; date_from: string; date_to: string; timezone: string; constraints: string };

type PanchangData = {
  date: string; timezone: string; location: string;
  tithi: string; nakshatra: string; yoga: string; karana: string; vara: string;
  notes: string[]; disclaimer: string;
};

type MuhurtaWindow = {
  start: string; end: string; score: number;
  why: string[]; why_not: string[];
};

type MuhurtaData = { intent: string; windows: MuhurtaWindow[]; disclaimer: string };

const initialPanchang: PanchangForm = {
  profile_id: "demo-1", date: "2026-02-27", timezone: "Asia/Kolkata", location: "Mumbai",
};

const initialMuhurta: MuhurtaForm = {
  profile_id: "demo-1", intent: "marriage", date_from: "2026-03-01", date_to: "2026-03-31",
  timezone: "Asia/Kolkata", constraints: "weekend preferred, family availability",
};

export default function PanchangPage() {
  const [panchangForm, setPanchangForm] = useState<PanchangForm>(initialPanchang);
  const [muhurtaForm, setMuhurtaForm] = useState<MuhurtaForm>(initialMuhurta);
  const [panchangData, setPanchangData] = useState<PanchangData | null>(null);
  const [muhurtaData, setMuhurtaData] = useState<MuhurtaData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updatePanchang(field: keyof PanchangForm, e: ChangeEvent<HTMLInputElement>) {
    setPanchangForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function updateMuhurta(field: keyof MuhurtaForm, e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setMuhurtaForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function runPanchang() {
    if (!panchangForm.profile_id || !panchangForm.date || !panchangForm.timezone || !panchangForm.location) {
      setError("Complete all panchang fields."); return;
    }
    setError(""); setLoading(true);
    try {
      const data = await postJson<PanchangData>("/v1/panchang/daily", panchangForm);
      setPanchangData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate panchang.");
    } finally { setLoading(false); }
  }

  async function runMuhurta() {
    if (!muhurtaForm.profile_id || !muhurtaForm.intent || !muhurtaForm.date_from || !muhurtaForm.date_to || !muhurtaForm.timezone) {
      setError("Complete all muhurta fields."); return;
    }
    setError(""); setLoading(true);
    try {
      const data = await postJson<MuhurtaData>("/v1/muhurta/pick", {
        ...muhurtaForm,
        constraints: muhurtaForm.constraints.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setMuhurtaData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to pick muhurta windows.");
    } finally { setLoading(false); }
  }

  const scoreColor = (score: number) =>
    score >= 75 ? "#065f46" : score >= 65 ? "#92400e" : "#7f1d1d";

  return (
    <main>
      <div className="grid two">
        <Surface title="Daily Panchang">
          <div className="form">
            <div className="form-grid">
              <Field label="Profile ID" input={<input className="input" value={panchangForm.profile_id} onChange={(e) => updatePanchang("profile_id", e)} />} />
              <Field label="Date" input={<input className="input" type="date" value={panchangForm.date} onChange={(e) => updatePanchang("date", e)} />} />
              <Field label="Timezone" input={<input className="input" value={panchangForm.timezone} onChange={(e) => updatePanchang("timezone", e)} />} />
              <Field label="Location" input={<input className="input" value={panchangForm.location} onChange={(e) => updatePanchang("location", e)} />} />
            </div>
            <button className="button" type="button" data-testid="panchang-submit" onClick={runPanchang} disabled={loading}>
              {loading ? "Loading…" : "Generate Panchang"}
            </button>
          </div>
        </Surface>

        <Surface title="Muhurta Picker">
          <div className="form">
            <div className="form-grid">
              <Field label="Profile ID" input={<input className="input" value={muhurtaForm.profile_id} onChange={(e) => updateMuhurta("profile_id", e)} />} />
              <Field label="Intent" input={<input className="input" value={muhurtaForm.intent} onChange={(e) => updateMuhurta("intent", e)} />} />
              <Field label="Date From" input={<input className="input" type="date" value={muhurtaForm.date_from} onChange={(e) => updateMuhurta("date_from", e)} />} />
              <Field label="Date To" input={<input className="input" type="date" value={muhurtaForm.date_to} onChange={(e) => updateMuhurta("date_to", e)} />} />
              <Field label="Timezone" input={<input className="input" value={muhurtaForm.timezone} onChange={(e) => updateMuhurta("timezone", e)} />} />
            </div>
            <Field
              label="Constraints"
              input={<textarea className="textarea" value={muhurtaForm.constraints} onChange={(e) => updateMuhurta("constraints", e)} />}
              help="Comma-separated (e.g. weekend preferred, family availability)."
            />
            <button className="button" type="button" data-testid="muhurta-submit" onClick={runMuhurta} disabled={loading}>
              {loading ? "Loading…" : "Find Best Muhurta Windows"}
            </button>
          </div>
        </Surface>
      </div>

      {error ? <p className="error" style={{ marginTop: 16 }}>{error}</p> : null}

      {/* ── Panchang Result ──────────────────────────────────────────────── */}
      {panchangData ? (
        <div className="result-card" data-testid="panchang-result">
          <div className="result-card-header">
            <h3>Panchang — {panchangData.date}</h3>
            <span style={{ marginLeft: "auto", fontSize: "0.88rem", opacity: 0.85 }}>{panchangData.location} · {panchangData.timezone}</span>
          </div>
          <div className="result-card-body">
            <div className="badge-row">
              {(["tithi","nakshatra","yoga","karana","vara"] as const).map((key) => (
                <span key={key} className="badge">
                  <strong style={{ textTransform: "capitalize" }}>{key}:</strong>{" "}{panchangData[key]}
                </span>
              ))}
            </div>
            {panchangData.notes.length > 0 && (
              <div className="result-section">
                <div className="result-section-label">Notes</div>
                {panchangData.notes.map((n, i) => (
                  <div key={i} style={{ fontSize: "0.88rem", color: "#334155" }}>{n}</div>
                ))}
              </div>
            )}
            <div className="disclaimer-text">{panchangData.disclaimer}</div>
          </div>
        </div>
      ) : null}

      {/* ── Muhurta Result ───────────────────────────────────────────────── */}
      {muhurtaData ? (
        <div className="result-card" data-testid="muhurta-result">
          <div className="result-card-header">
            <h3>Top Muhurta Windows</h3>
            <span style={{ marginLeft: "auto", fontSize: "0.88rem", opacity: 0.85 }}>Intent: {muhurtaData.intent}</span>
          </div>
          <div className="result-card-body">
            {muhurtaData.windows.map((w, i) => (
              <div key={i} className="window-card">
                <div className="window-card-header">
                  <span className="window-card-title">
                    Window {i + 1} &nbsp;·&nbsp;{" "}
                    {new Date(w.start).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}{" "}
                    {new Date(w.start).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    {" "}–{" "}
                    {new Date(w.end).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="window-score" style={{ color: scoreColor(w.score) }}>
                    Score {w.score}/100
                  </span>
                </div>
                <div className="window-card-body">
                  {w.why.length > 0 && (
                    <div className="why-list">
                      {w.why.map((item, j) => (
                        <div key={j} className="why-item">
                          <div className="why-dot good" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {w.why_not.length > 0 && (
                    <div className="why-list">
                      {w.why_not.map((item, j) => (
                        <div key={j} className="why-item">
                          <div className="why-dot caution" />
                          <span style={{ color: "#78350f" }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="disclaimer-text">{muhurtaData.disclaimer}</div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Field(props: { label: string; input: ReactNode; help?: string }) {
  return (
    <div className="field">
      <label>{props.label}</label>
      {props.input}
      {props.help ? <span className="help">{props.help}</span> : null}
    </div>
  );
}
