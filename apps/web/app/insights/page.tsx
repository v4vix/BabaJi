"use client";

import { useState, useEffect, type ChangeEvent, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { postJson } from "../../lib/api";
import { Surface } from "@cortex/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

type TarotForm = { profile_id: string; spread: "three-card" | "decision"; intention: string };
type NumerologyForm = { profile_id: string; full_name: string; birth_date: string };
type MantraForm = { profile_id: string; focus_area: string; minutes_per_day: string; days_per_week: string };
type RashifalForm = { profile_id: string; sign: string; horizon: "daily" | "weekly" | "monthly" };
type GemForm = { profile_id: string; primary_planet: string; budget_band: string; intention: string };
type PrivacyForm = { user_id: string; scope: "profile" | "consults" | "media" | "all"; reason: string };
type RitualForm = { query: string };
type AyurvedaForm = { query: string };
type InsightModeId = "tarot" | "numerology" | "mantra" | "rashifal" | "gem" | "ritual" | "ayurveda";

type TarotResult = { spread: string; cards: { position: string; card: string; meaning: string }[]; reflection: string; disclaimer: string };
type NumerologyResult = { life_path_number: number; expression_number: number; interpretation: string; disclaimer: string };
type MantraResult = { suggested_mantra: string; schedule: string; practice_steps: string[]; disclaimer: string };
type RashifalResult = { sign: string; horizon: string; insight: string; influence_panel: string[]; disclaimer: string };
type GemResult = { recommendation: string; due_diligence_checklist: string[]; disclaimers: string[] };
type RitualResult = { guidance: string; disclaimer: string };
type AyurvedaResult = { guidance: string; disclaimer: string };
type PrivacyResult = { request_id: string; status: string; note: string };

// ── Defaults ──────────────────────────────────────────────────────────────────

const initialTarot: TarotForm = { profile_id: "demo-1", spread: "three-card", intention: "How should I prioritize this month?" };
const initialNumerology: NumerologyForm = { profile_id: "demo-1", full_name: "Aditi Sharma", birth_date: "1994-02-10" };
const initialMantra: MantraForm = { profile_id: "demo-1", focus_area: "focus", minutes_per_day: "15", days_per_week: "5" };
const initialRashifal: RashifalForm = { profile_id: "demo-1", sign: "Leo", horizon: "daily" };
const initialGem: GemForm = { profile_id: "demo-1", primary_planet: "Jupiter", budget_band: "mid-range", intention: "career growth" };
const initialPrivacy: PrivacyForm = { user_id: "demo-user", scope: "consults", reason: "cleanup request" };
const initialRitual: RitualForm = { query: "Suggest a safe satvik evening routine for focus." };
const initialAyurveda: AyurvedaForm = { query: "Share educational lifestyle suggestions for stable daily energy." };

const ZODIAC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const INSIGHT_MODES: Array<{
  id: InsightModeId;
  title: string;
  tag: string;
  description: string;
  bullets: string[];
  accent: string;
}> = [
  {
    id: "tarot",
    title: "Tarot Reflection",
    tag: "Emotional clarity",
    description: "Choose tarot when you want symbolic reflection, emotional texture, and a softer way into a complicated question.",
    bullets: [
      "Best when the question feels intuitive, relational, or hard to phrase analytically.",
      "Great for moments when you need reflection more than prediction.",
    ],
    accent: "#ca6702",
  },
  {
    id: "numerology",
    title: "Numerology Snapshot",
    tag: "Pattern language",
    description: "Choose numerology when you want a compact personality pattern read with less setup than a full chart.",
    bullets: [
      "Useful when you want identity language without diving into astrology.",
      "A strong lightweight entry point for first-time users.",
    ],
    accent: "#0f766e",
  },
  {
    id: "mantra",
    title: "Mantra Practice Plan",
    tag: "Steady ritual",
    description: "Choose mantra when you want a repeatable practice that turns guidance into something embodied and daily.",
    bullets: [
      "Best when you want consistency, focus, or devotional rhythm.",
      "Ideal for turning insight into a real-life habit.",
    ],
    accent: "#7c3aed",
  },
  {
    id: "rashifal",
    title: "Personalized Rashifal",
    tag: "Day-to-day guidance",
    description: "Choose rashifal when you want a quicker read on the current mood of a day, week, or month.",
    bullets: [
      "Useful for short-horizon timing and emotional tone.",
      "A good repeat-visit tool between deeper sessions.",
    ],
    accent: "#2563eb",
  },
  {
    id: "gem",
    title: "Gemstone Guidance",
    tag: "Careful recommendation",
    description: "Choose gem guidance when you want a cautious, due-diligence-heavy recommendation rather than a romanticized gemstone story.",
    bullets: [
      "Best when you care about safety, fit, and practical caution.",
      "Keeps the guidance grounded instead of mystical for its own sake.",
    ],
    accent: "#b45309",
  },
  {
    id: "ritual",
    title: "Ritual Safety Guidance",
    tag: "Safe spiritual routine",
    description: "Choose ritual guidance when you want a safe, everyday spiritual routine without intensity, fear, or unsafe claims.",
    bullets: [
      "Good for evening resets, devotional structure, and satvik rhythm.",
      "Designed to keep guidance gentle and sustainable.",
    ],
    accent: "#059669",
  },
  {
    id: "ayurveda",
    title: "Ayurveda Educational Guide",
    tag: "Lifestyle education",
    description: "Choose Ayurveda guidance when you want educational lifestyle suggestions rather than diagnostic or medical advice.",
    bullets: [
      "Useful for routines, food rhythm, and energy steadiness.",
      "Keeps the boundary clear between education and medical care.",
    ],
    accent: "#0f766e",
  },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function update<T extends object>(setter: Dispatch<SetStateAction<T>>, field: keyof T) {
  return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setter((prev) => ({ ...prev, [field]: e.target.value }));
}

// ── Result tile ───────────────────────────────────────────────────────────────

function InsightTile({
  title, subtitle, testId, children,
}: {
  title: string; subtitle?: string; testId: string; children: ReactNode;
}) {
  return (
    <div className="insight-tile" data-testid={testId}>
      <div className="insight-tile-header">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="insight-tile-body">{children}</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="result-section">
      <div className="result-section-label">{label}</div>
      {children}
    </div>
  );
}

function Disclaimer({ text }: { text: string }) {
  return <div className="disclaimer-text">{text}</div>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [activeMode, setActiveMode] = useState<InsightModeId>("tarot");
  const [tarotForm, setTarotForm] = useState<TarotForm>(initialTarot);
  const [numerologyForm, setNumerologyForm] = useState<NumerologyForm>(initialNumerology);
  const [mantraForm, setMantraForm] = useState<MantraForm>(initialMantra);
  const [rashifalForm, setRashifalForm] = useState<RashifalForm>(initialRashifal);
  const [gemForm, setGemForm] = useState<GemForm>(initialGem);
  const [privacyForm, setPrivacyForm] = useState<PrivacyForm>(initialPrivacy);
  const [ritualForm, setRitualForm] = useState<RitualForm>(initialRitual);
  const [ayurvedaForm, setAyurvedaForm] = useState<AyurvedaForm>(initialAyurveda);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tarotResult, setTarotResult] = useState<TarotResult | null>(null);
  const [numerologyResult, setNumerologyResult] = useState<NumerologyResult | null>(null);
  const [mantraResult, setMantraResult] = useState<MantraResult | null>(null);
  const [rashifalResult, setRashifalResult] = useState<RashifalResult | null>(null);
  const [gemResult, setGemResult] = useState<GemResult | null>(null);
  const [privacyResult, setPrivacyResult] = useState<PrivacyResult | null>(null);
  const [ritualResult, setRitualResult] = useState<RitualResult | null>(null);
  const [ayurvedaResult, setAyurvedaResult] = useState<AyurvedaResult | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (mode && INSIGHT_MODES.some((m) => m.id === mode)) {
      setActiveMode(mode as InsightModeId);
    }
  }, []);

  const activeModeConfig = INSIGHT_MODES.find((mode) => mode.id === activeMode) ?? INSIGHT_MODES[0];

  function selectMode(mode: InsightModeId) {
    setActiveMode(mode);
    setError("");
  }

  async function onTarot() {
    if (!tarotForm.profile_id || !tarotForm.intention) { setError("Tarot profile and intention are required."); return; }
    setError(""); setLoading(true);
    try { setTarotResult(await postJson<TarotResult>("/v1/tarot/read", tarotForm)); }
    catch (e) { setError(e instanceof Error ? e.message : "Tarot request failed"); }
    finally { setLoading(false); }
  }

  async function onNumerology() {
    if (!numerologyForm.profile_id || !numerologyForm.full_name || !numerologyForm.birth_date) { setError("All numerology fields are required."); return; }
    setError(""); setLoading(true);
    try { setNumerologyResult(await postJson<NumerologyResult>("/v1/numerology/report", numerologyForm)); }
    catch (e) { setError(e instanceof Error ? e.message : "Numerology request failed"); }
    finally { setLoading(false); }
  }

  async function onMantra() {
    if (!mantraForm.profile_id || !mantraForm.focus_area) { setError("Mantra profile and focus area are required."); return; }
    const minutes = Number(mantraForm.minutes_per_day), days = Number(mantraForm.days_per_week);
    if (Number.isNaN(minutes) || Number.isNaN(days)) { setError("Minutes/day and days/week must be numeric."); return; }
    setError(""); setLoading(true);
    try { setMantraResult(await postJson<MantraResult>("/v1/mantra/plan", { profile_id: mantraForm.profile_id, focus_area: mantraForm.focus_area, minutes_per_day: minutes, days_per_week: days })); }
    catch (e) { setError(e instanceof Error ? e.message : "Mantra plan request failed"); }
    finally { setLoading(false); }
  }

  async function onRashifal() {
    if (!rashifalForm.profile_id || !rashifalForm.sign) { setError("Rashifal profile and sign are required."); return; }
    setError(""); setLoading(true);
    try { setRashifalResult(await postJson<RashifalResult>("/v1/rashifal/personalized", rashifalForm)); }
    catch (e) { setError(e instanceof Error ? e.message : "Rashifal request failed"); }
    finally { setLoading(false); }
  }

  async function onGem() {
    if (!gemForm.profile_id || !gemForm.primary_planet || !gemForm.intention) { setError("Gem profile, planet, and intention are required."); return; }
    setError(""); setLoading(true);
    try { setGemResult(await postJson<GemResult>("/v1/gem/guidance", gemForm)); }
    catch (e) { setError(e instanceof Error ? e.message : "Gem guidance request failed"); }
    finally { setLoading(false); }
  }

  async function onRitual() {
    if (!ritualForm.query) { setError("Ritual query is required."); return; }
    setError(""); setLoading(true);
    try { setRitualResult(await postJson<RitualResult>("/v1/ritual/guide", ritualForm)); }
    catch (e) { setError(e instanceof Error ? e.message : "Ritual guidance failed"); }
    finally { setLoading(false); }
  }

  async function onAyurveda() {
    if (!ayurvedaForm.query) { setError("Ayurveda query is required."); return; }
    setError(""); setLoading(true);
    try { setAyurvedaResult(await postJson<AyurvedaResult>("/v1/ayurveda/guide", ayurvedaForm)); }
    catch (e) { setError(e instanceof Error ? e.message : "Ayurveda guidance failed"); }
    finally { setLoading(false); }
  }

  async function onPrivacyDelete() {
    if (!privacyForm.user_id) { setError("User ID is required."); return; }
    setError(""); setLoading(true);
    try { setPrivacyResult(await postJson<PrivacyResult>("/v1/privacy/delete-request", privacyForm)); }
    catch (e) { setError(e instanceof Error ? e.message : "Privacy delete request failed"); }
    finally { setLoading(false); }
  }

  function renderModeStarters(): ReactNode {
    switch (activeMode) {
      case "tarot":
        return (
          <div className="mini-chip-row">
            {[
              "What should I release before the next month begins?",
              "Where am I hesitating even though I already know the truth?",
              "What is the energy around this decision right now?",
            ].map((prompt) => (
              <button key={prompt} type="button" className="mini-chip" onClick={() => setTarotForm((prev) => ({ ...prev, intention: prompt }))}>
                {prompt}
              </button>
            ))}
          </div>
        );
      case "numerology":
        return (
          <div className="mini-chip-row">
            <button type="button" className="mini-chip" onClick={() => setNumerologyForm(initialNumerology)}>Use demo profile</button>
            <button
              type="button"
              className="mini-chip"
              onClick={() => setNumerologyForm({ profile_id: "numerology-2", full_name: "Rohan Verma", birth_date: "1991-08-24" })}
            >
              Try another profile
            </button>
          </div>
        );
      case "mantra":
        return (
          <div className="mini-chip-row">
            {["focus", "grounding", "confidence"].map((focus) => (
              <button key={focus} type="button" className="mini-chip" onClick={() => setMantraForm((prev) => ({ ...prev, focus_area: focus }))}>
                {focus}
              </button>
            ))}
          </div>
        );
      case "rashifal":
        return (
          <div className="mini-chip-row">
            {["Leo", "Virgo", "Scorpio"].map((sign) => (
              <button key={sign} type="button" className="mini-chip" onClick={() => setRashifalForm((prev) => ({ ...prev, sign }))}>
                {sign}
              </button>
            ))}
          </div>
        );
      case "gem":
        return (
          <div className="mini-chip-row">
            {["Jupiter", "Venus", "Mercury"].map((planet) => (
              <button key={planet} type="button" className="mini-chip" onClick={() => setGemForm((prev) => ({ ...prev, primary_planet: planet }))}>
                {planet}
              </button>
            ))}
          </div>
        );
      case "ritual":
        return (
          <div className="mini-chip-row">
            {[
              "Suggest a calm morning grounding routine.",
              "Give me a gentle evening ritual for nervous energy.",
            ].map((prompt) => (
              <button key={prompt} type="button" className="mini-chip" onClick={() => setRitualForm({ query: prompt })}>
                {prompt}
              </button>
            ))}
          </div>
        );
      case "ayurveda":
        return (
          <div className="mini-chip-row">
            {[
              "Share educational suggestions for steadier mornings.",
              "How can I create a more grounding evening rhythm?",
            ].map((prompt) => (
              <button key={prompt} type="button" className="mini-chip" onClick={() => setAyurvedaForm({ query: prompt })}>
                {prompt}
              </button>
            ))}
          </div>
        );
      default:
        return null;
    }
  }

  function renderActiveForm(): ReactNode {
    switch (activeMode) {
      case "tarot":
        return (
          <>
            <Field label="Profile ID" input={<input className="input" value={tarotForm.profile_id} onChange={update(setTarotForm, "profile_id")} />} />
            <Field label="Spread" input={
              <select className="select" value={tarotForm.spread} onChange={update(setTarotForm, "spread")}>
                <option value="three-card">Three Card</option>
                <option value="decision">Decision Spread</option>
              </select>
            } />
            <Field label="Intention" input={<textarea className="textarea" value={tarotForm.intention} onChange={update(setTarotForm, "intention")} />} />
            <button className="button" type="button" data-testid="tarot-submit" onClick={onTarot} disabled={loading}>
              {loading ? "Loading…" : "Run Tarot Reading"}
            </button>
          </>
        );
      case "numerology":
        return (
          <>
            <Field label="Profile ID" input={<input className="input" value={numerologyForm.profile_id} onChange={update(setNumerologyForm, "profile_id")} />} />
            <Field label="Full Name" input={<input className="input" value={numerologyForm.full_name} onChange={update(setNumerologyForm, "full_name")} />} />
            <Field label="Birth Date" input={<input className="input" type="date" value={numerologyForm.birth_date} onChange={update(setNumerologyForm, "birth_date")} />} />
            <button className="button" type="button" data-testid="numerology-submit" onClick={onNumerology} disabled={loading}>
              {loading ? "Loading…" : "Generate Numerology"}
            </button>
          </>
        );
      case "mantra":
        return (
          <>
            <Field label="Profile ID" input={<input className="input" value={mantraForm.profile_id} onChange={update(setMantraForm, "profile_id")} />} />
            <Field label="Focus Area" input={<input className="input" value={mantraForm.focus_area} onChange={update(setMantraForm, "focus_area")} />} />
            <div className="form-grid">
              <Field label="Minutes / Day" input={<input className="input" type="number" value={mantraForm.minutes_per_day} onChange={update(setMantraForm, "minutes_per_day")} />} />
              <Field label="Days / Week" input={<input className="input" type="number" value={mantraForm.days_per_week} onChange={update(setMantraForm, "days_per_week")} />} />
            </div>
            <button className="button" type="button" data-testid="mantra-submit" onClick={onMantra} disabled={loading}>
              {loading ? "Loading…" : "Build Mantra Plan"}
            </button>
          </>
        );
      case "rashifal":
        return (
          <>
            <Field label="Profile ID" input={<input className="input" value={rashifalForm.profile_id} onChange={update(setRashifalForm, "profile_id")} />} />
            <Field label="Sign" input={
              <select className="select" value={rashifalForm.sign} onChange={update(setRashifalForm, "sign")}>
                {ZODIAC_SIGNS.map((sign) => <option key={sign} value={sign}>{sign}</option>)}
              </select>
            } />
            <Field label="Horizon" input={
              <select className="select" value={rashifalForm.horizon} onChange={update(setRashifalForm, "horizon")}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            } />
            <button className="button" type="button" data-testid="rashifal-submit" onClick={onRashifal} disabled={loading}>
              {loading ? "Loading…" : "Generate Rashifal"}
            </button>
          </>
        );
      case "gem":
        return (
          <>
            <Field label="Profile ID" input={<input className="input" value={gemForm.profile_id} onChange={update(setGemForm, "profile_id")} />} />
            <Field label="Primary Planet" input={<input className="input" value={gemForm.primary_planet} onChange={update(setGemForm, "primary_planet")} />} />
            <Field label="Budget Band" input={<input className="input" value={gemForm.budget_band} onChange={update(setGemForm, "budget_band")} />} />
            <Field label="Intention" input={<textarea className="textarea" value={gemForm.intention} onChange={update(setGemForm, "intention")} />} />
            <button className="button" type="button" data-testid="gem-submit" onClick={onGem} disabled={loading}>
              {loading ? "Loading…" : "Generate Gem Guidance"}
            </button>
          </>
        );
      case "ritual":
        return (
          <>
            <Field label="Query" input={<textarea className="textarea" value={ritualForm.query} onChange={update(setRitualForm, "query")} />} />
            <button className="button secondary" type="button" data-testid="ritual-submit" onClick={onRitual} disabled={loading}>
              {loading ? "Loading…" : "Get Ritual Guide"}
            </button>
          </>
        );
      case "ayurveda":
        return (
          <>
            <Field label="Query" input={<textarea className="textarea" value={ayurvedaForm.query} onChange={update(setAyurvedaForm, "query")} />} />
            <button className="button secondary" type="button" data-testid="ayurveda-submit" onClick={onAyurveda} disabled={loading}>
              {loading ? "Loading…" : "Get Ayurveda Guide"}
            </button>
          </>
        );
      default:
        return null;
    }
  }

  return (
    <main>
      <section className="feature-stage">
        <div className="feature-stage-grid">
          <div className="feature-stage-copy">
            <span className="feature-stage-kicker">Lighter pathways, clearer entry points</span>
            <h1 className="feature-stage-title">Pick the kind of guidance you want today.</h1>
            <p className="feature-stage-summary">
              Insights works best when it helps you choose the right emotional tone first: reflective, practical,
              devotional, day-to-day, or cautious and research-led.
            </p>
            <div className="feature-stage-step-list">
              <div className="feature-stage-step">
                <strong>1.</strong>
                <span>Choose the mode that fits your question instead of scanning every tool at once.</span>
              </div>
              <div className="feature-stage-step">
                <strong>2.</strong>
                <span>Start from a stronger prompt so the result feels personal immediately.</span>
              </div>
              <div className="feature-stage-step">
                <strong>3.</strong>
                <span>Use lighter tools often, and reserve deeper systems for when the question becomes more serious.</span>
              </div>
            </div>
          </div>

          <div className="feature-stage-panel">
            <div className="feature-path-grid">
              {INSIGHT_MODES.map((mode) => {
                const active = mode.id === activeMode;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    className={`feature-path-card${active ? " active" : ""}`}
                    onClick={() => selectMode(mode.id)}
                    style={
                      active
                        ? {
                            borderColor: `${mode.accent}55`,
                            boxShadow: `0 16px 30px ${mode.accent}20`,
                          }
                        : undefined
                    }
                  >
                    <span className="feature-path-tag" style={{ color: mode.accent }}>{mode.tag}</span>
                    <span className="feature-path-title">{mode.title}</span>
                    <span className="feature-path-copy">{mode.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="grid two">
        <Surface title={activeModeConfig.title}>
          <div className="form">
            <p className="section-lead">{activeModeConfig.description}</p>
            {renderActiveForm()}
          </div>
        </Surface>

        <Surface title="How To Use This Well">
          <div className="form">
            <p className="section-lead">
              Let the mode shape the question. The better the fit between tool and intention, the more the result feels like guidance instead of generic content.
            </p>
            <div className="feature-stage-step-list">
              {activeModeConfig.bullets.map((bullet) => (
                <div key={bullet} className="feature-stage-step">
                  <strong>•</strong>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="result-section-label" style={{ marginBottom: 8 }}>Quick starters</div>
              {renderModeStarters()}
            </div>
            <div className="soft-note">
              If you are unsure where to begin, start with tarot for reflection or numerology for a lighter personal baseline.
            </div>
          </div>
        </Surface>
      </div>

      <div style={{ marginTop: 16 }}>
        <Surface title="Privacy Controls">
          <div className="form">
            <p className="section-lead">
              Keep account controls accessible but out of the emotional center of the page. Use this when you want to request deletion of stored data.
            </p>
            <Field label="User ID" input={<input className="input" value={privacyForm.user_id} onChange={update(setPrivacyForm, "user_id")} />} />
            <Field label="Scope" input={
              <select className="select" value={privacyForm.scope} onChange={update(setPrivacyForm, "scope")}>
                <option value="profile">profile</option>
                <option value="consults">consults</option>
                <option value="media">media</option>
                <option value="all">all</option>
              </select>
            } />
            <Field label="Reason" input={<textarea className="textarea" value={privacyForm.reason} onChange={update(setPrivacyForm, "reason")} />} />
            <button className="button warn" type="button" data-testid="privacy-delete-submit" onClick={onPrivacyDelete} disabled={loading}>
              {loading ? "Loading…" : "Submit Deletion Request"}
            </button>
          </div>
        </Surface>
      </div>

      {error ? <p className="error" style={{ marginTop: 16 }}>{error}</p> : null}

      {/* ── Results ──────────────────────────────────────────────────────── */}

      {activeMode === "tarot" && tarotResult ? (
        <InsightTile title="Tarot Reading" subtitle={`${tarotResult.spread} · ${tarotForm.intention}`} testId="tarot-result">
          <Section label="Cards">
            <div style={{ display: "grid", gap: 10 }}>
              {tarotResult.cards.map((c, i) => (
                <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em" }}>{c.position}</span>
                    <span style={{ fontWeight: 700, color: "#ca6702" }}>{c.card}</span>
                  </div>
                  <div style={{ fontSize: "0.92rem", color: "#334155", lineHeight: 1.6 }}>{c.meaning}</div>
                </div>
              ))}
            </div>
          </Section>
          <Section label="Reflection">
            <div className="result-section-text">{tarotResult.reflection}</div>
          </Section>
          <Disclaimer text={tarotResult.disclaimer} />
        </InsightTile>
      ) : null}

      {activeMode === "numerology" && numerologyResult ? (
        <InsightTile title="Numerology Report" subtitle={numerologyForm.full_name} testId="numerology-result">
          <div className="badge-row">
            <span className="badge ok" style={{ fontSize: "1rem", padding: "8px 16px" }}>Life Path {numerologyResult.life_path_number}</span>
            <span className="badge" style={{ fontSize: "1rem", padding: "8px 16px" }}>Expression {numerologyResult.expression_number}</span>
          </div>
          <Section label="Interpretation">
            <div className="result-section-text">{numerologyResult.interpretation}</div>
          </Section>
          <Disclaimer text={numerologyResult.disclaimer} />
        </InsightTile>
      ) : null}

      {activeMode === "mantra" && mantraResult ? (
        <InsightTile title="Mantra Practice Plan" subtitle={`Focus: ${mantraForm.focus_area}`} testId="mantra-result">
          <div style={{ background: "#004d5d", color: "#fff", borderRadius: 12, padding: "14px 18px", fontFamily: "serif", fontSize: "1.15rem", textAlign: "center", letterSpacing: "0.03em" }}>
            {mantraResult.suggested_mantra}
          </div>
          <Section label="Schedule">
            <div className="result-section-text">{mantraResult.schedule}</div>
          </Section>
          <Section label="Practice Steps">
            {mantraResult.practice_steps.map((step, i) => (
              <div key={i} className="why-item" style={{ paddingBottom: 6 }}>
                <span style={{ fontWeight: 700, color: "#005f73", minWidth: 22 }}>{i + 1}.</span>
                <span style={{ fontSize: "0.92rem" }}>{step}</span>
              </div>
            ))}
          </Section>
          <Disclaimer text={mantraResult.disclaimer} />
        </InsightTile>
      ) : null}

      {activeMode === "rashifal" && rashifalResult ? (
        <InsightTile title={`${rashifalResult.sign} — ${rashifalResult.horizon.charAt(0).toUpperCase() + rashifalResult.horizon.slice(1)} Rashifal`} testId="rashifal-result">
          <Section label="Insight">
            <div className="result-section-text large">{rashifalResult.insight}</div>
          </Section>
          {rashifalResult.influence_panel.length > 0 && (
            <Section label="Influences">
              <div className="badge-row">
                {rashifalResult.influence_panel.map((inf, i) => <span key={i} className="badge muted">{inf}</span>)}
              </div>
            </Section>
          )}
          <Disclaimer text={rashifalResult.disclaimer} />
        </InsightTile>
      ) : null}

      {activeMode === "gem" && gemResult ? (
        <InsightTile title={`Gem Guidance — ${gemForm.primary_planet}`} subtitle={`Budget: ${gemForm.budget_band}`} testId="gem-result">
          <Section label="Recommendation">
            <div className="result-section-text">{gemResult.recommendation}</div>
          </Section>
          <Section label="Due Diligence Checklist">
            {gemResult.due_diligence_checklist.map((item, i) => (
              <div key={i} className="why-item" style={{ paddingBottom: 6 }}>
                <span style={{ fontWeight: 700, color: "#005f73", minWidth: 22 }}>{i + 1}.</span>
                <span style={{ fontSize: "0.92rem" }}>{item}</span>
              </div>
            ))}
          </Section>
          <Section label="Important Cautions">
            {gemResult.disclaimers.map((d, i) => (
              <div key={i} style={{ fontSize: "0.88rem", color: "#7f1d1d", background: "#fff5f5", borderRadius: 8, padding: "7px 10px", marginBottom: 4 }}>
                {d}
              </div>
            ))}
          </Section>
        </InsightTile>
      ) : null}

      {activeMode === "ritual" && ritualResult ? (
        <InsightTile title="Ritual Guide" testId="ritual-result">
          <Section label="Guidance">
            <div className="result-section-text">{ritualResult.guidance}</div>
          </Section>
          <Disclaimer text={ritualResult.disclaimer} />
        </InsightTile>
      ) : null}

      {activeMode === "ayurveda" && ayurvedaResult ? (
        <InsightTile title="Ayurveda Guide" testId="ayurveda-result">
          <Section label="Guidance">
            <div className="result-section-text">{ayurvedaResult.guidance}</div>
          </Section>
          <Disclaimer text={ayurvedaResult.disclaimer} />
        </InsightTile>
      ) : null}

      {privacyResult ? (
        <InsightTile title="Privacy Deletion Request Submitted" testId="privacy-result">
          <div className="badge-row">
            <span className="badge muted">Request ID: {privacyResult.request_id}</span>
            <span className="badge warn">Status: {privacyResult.status}</span>
          </div>
          <Section label="Note">
            <div className="result-section-text">{privacyResult.note}</div>
          </Section>
        </InsightTile>
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
