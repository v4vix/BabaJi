"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { postJson } from "../../lib/api";
import { Surface } from "@cortex/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

type KundliForm = {
  profile_id: string;
  date: string;
  time: string;
  timezone: string;
  location: string;
  latitude: string;
  longitude: string;
  question: string;
};

type RectifyForm = {
  profile_id: string;
  birth_date: string;
  time_window_start: string;
  time_window_end: string;
  timezone: string;
  event_title: string;
  event_date: string;
  event_description: string;
};

type PlanetPos = {
  degree: number;
  sign: string;
  house: number;
  vargas: { D1: number; D9: number; D10: number };
};

type DashaPeriod = { lord: string; start: string; end: string; years: number };

type KundliReport = {
  mode: string;
  narrative: string;
  chart_elements_used: string[];
  citations: { title: string; locator: string; source?: string }[];
  disclaimers: string[];
  deterministic_facts: {
    engine_mode: string;
    lagna: { degree: number; sign: string };
    planet_positions: Record<string, PlanetPos>;
    panchang: { tithi: string; nakshatra: string; yoga: string; karana: string; vara: string };
    vimshottari_timeline: DashaPeriod[];
    highlights: string[];
  };
};

type TalkResult = {
  mode: string;
  answer: string;
  chart_elements_used: string[];
  citations: { title: string; locator: string }[];
  disclaimer: string;
};

type RectifyResult = {
  proposed_window: string;
  confidence_band: string;
  rationale: string;
  disclaimers: string[];
};

type JourneyId = "report" | "talk" | "rectify";

// ── Constants ─────────────────────────────────────────────────────────────────

const SIGNS = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];

const SIGN_SHORT: Record<string, string> = {
  Aries:"Ar", Taurus:"Ta", Gemini:"Ge", Cancer:"Cn", Leo:"Le", Virgo:"Vi",
  Libra:"Li", Scorpio:"Sc", Sagittarius:"Sg", Capricorn:"Cp", Aquarius:"Aq", Pisces:"Pi",
};

const PLANET_SHORT: Record<string, string> = {
  Sun:"Su", Moon:"Mo", Mercury:"Me", Venus:"Ve", Mars:"Ma",
  Jupiter:"Ju", Saturn:"Sa", Rahu:"Ra", Ketu:"Ke",
};

const DASHA_COLORS: Record<string, string> = {
  Sun:"#F59E0B", Moon:"#64748B", Mars:"#EF4444", Rahu:"#7C3AED",
  Jupiter:"#F97316", Saturn:"#1D4ED8", Mercury:"#10B981", Ketu:"#EC4899", Venus:"#BE185D",
};

// North Indian chart: house positions as [row, col] in a 4×4 grid
// centre 4 cells (rows 1-2, cols 1-2) are blank
const HOUSE_GRID: [number, number][] = [
  [0,0],[0,1],[0,2],[0,3], // houses 12,1,2,3
  [1,3],[2,3],[3,3],[3,2],[3,1],[3,0],[2,0],[1,0], // houses 4-11 clockwise remainder
];
// map house index (0-based) → [row,col]
const HOUSE_POS = (house: number): [number, number] => {
  const order = [1,2,3,4,5,6,7,8,9,10,11,12]; // 1-indexed houses
  const idx = order.indexOf(house);
  const map: [number, number][] = [
    [0,1],[0,2],[0,3],[1,3],[2,3],[3,3],[3,2],[3,1],[3,0],[2,0],[1,0],[0,0],
  ];
  return map[idx] ?? [0,0];
};

// ── SVG Chart Component ────────────────────────────────────────────────────────

function NorthIndianChart({ facts }: { facts: KundliReport["deterministic_facts"] }) {
  const S = 320; // total SVG size
  const C = S / 4; // cell size = 80
  const lagnaSignIdx = SIGNS.indexOf(facts.lagna.sign);

  // Group planets by house
  const byHouse: Record<number, string[]> = {};
  for (const [name, pos] of Object.entries(facts.planet_positions)) {
    const h = pos.house;
    if (!byHouse[h]) byHouse[h] = [];
    byHouse[h].push(PLANET_SHORT[name] ?? name.slice(0, 2));
  }

  // For each house 1-12, compute the sign
  const cells = Array.from({ length: 12 }, (_, i) => {
    const houseNum = i + 1; // 1-indexed
    const signIdx = (lagnaSignIdx + i) % 12;
    const sign = SIGNS[signIdx];
    const [row, col] = HOUSE_POS(houseNum);
    const x = col * C;
    const y = row * C;
    const planets = byHouse[houseNum] ?? [];
    const isLagna = houseNum === 1;
    return { houseNum, sign, x, y, planets, isLagna };
  });

  return (
    <div className="chart-wrap">
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-label="North Indian birth chart">
        {/* Outer border */}
        <rect x={0} y={0} width={S} height={S} className="chart-cell" />
        {/* Centre blank area */}
        <rect x={C} y={C} width={2 * C} height={2 * C} fill="#f0f4f8" stroke="#b0bec5" strokeWidth={1} />
        {/* BabaJi label in centre */}
        <text x={S / 2} y={S / 2 - 8} textAnchor="middle" fontSize={12} fill="#94a3b8" fontFamily="serif">
          ॐ
        </text>
        <text x={S / 2} y={S / 2 + 10} textAnchor="middle" fontSize={9} fill="#94a3b8">
          {facts.panchang.nakshatra}
        </text>
        <text x={S / 2} y={S / 2 + 22} textAnchor="middle" fontSize={8} fill="#94a3b8">
          {facts.panchang.tithi}
        </text>

        {/* House diagonal dividers — inner diamond lines */}
        <line x1={C} y1={0} x2={0} y2={C} stroke="#b0bec5" strokeWidth={1} />
        <line x1={2 * C} y1={0} x2={3 * C} y2={C} stroke="#b0bec5" strokeWidth={1} />
        <line x1={0} y1={3 * C} x2={C} y2={4 * C} stroke="#b0bec5" strokeWidth={1} />
        <line x1={3 * C} y1={3 * C} x2={4 * C} y2={4 * C} stroke="#b0bec5" strokeWidth={1} />
        {/* Row/col dividers */}
        <line x1={C} y1={0} x2={C} y2={C} stroke="#b0bec5" strokeWidth={1} />
        <line x1={2 * C} y1={0} x2={2 * C} y2={C} stroke="#b0bec5" strokeWidth={1} />
        <line x1={C} y1={S - C} x2={C} y2={S} stroke="#b0bec5" strokeWidth={1} />
        <line x1={2 * C} y1={S - C} x2={2 * C} y2={S} stroke="#b0bec5" strokeWidth={1} />
        <line x1={0} y1={C} x2={C} y2={C} stroke="#b0bec5" strokeWidth={1} />
        <line x1={0} y1={2 * C} x2={C} y2={2 * C} stroke="#b0bec5" strokeWidth={1} />
        <line x1={S - C} y1={C} x2={S} y2={C} stroke="#b0bec5" strokeWidth={1} />
        <line x1={S - C} y1={2 * C} x2={S} y2={2 * C} stroke="#b0bec5" strokeWidth={1} />

        {cells.map(({ houseNum, sign, x, y, planets, isLagna }) => (
          <g key={houseNum}>
            {/* Lagna highlight */}
            {isLagna && (
              <rect x={x + 1} y={y + 1} width={C - 2} height={C - 2} fill="#e0f2f4" rx={4} />
            )}
            {/* House number */}
            <text x={x + C / 2} y={y + 14} textAnchor="middle" className="chart-house-num">
              {houseNum}
            </text>
            {/* Sign abbreviation */}
            <text x={x + C / 2} y={y + 26} textAnchor="middle" className="chart-sign">
              {SIGN_SHORT[sign] ?? sign.slice(0, 2)}
            </text>
            {/* Planets */}
            {planets.slice(0, 4).map((p, i) => (
              <text
                key={p}
                x={x + C / 2}
                y={y + 42 + i * 13}
                textAnchor="middle"
                className="chart-planets"
              >
                {p}
              </text>
            ))}
            {/* Lagna marker */}
            {isLagna && (
              <text x={x + C - 8} y={y + C - 6} textAnchor="middle" fontSize={8} fill="#ca6702" fontWeight="700">
                L
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Dasha Timeline ─────────────────────────────────────────────────────────────

function DashaTimeline({ timeline }: { timeline: DashaPeriod[] }) {
  const total = timeline.reduce((s, d) => s + d.years, 0);
  return (
    <div className="dasha-timeline">
      {timeline.map((d) => (
        <div key={d.lord + d.start} className="dasha-row">
          <span className="dasha-lord">{d.lord}</span>
          <div className="dasha-bar-track">
            <div
              className="dasha-bar-fill"
              style={{
                width: `${Math.round((d.years / total) * 100)}%`,
                background: DASHA_COLORS[d.lord] ?? "#005f73",
              }}
            />
          </div>
          <span className="dasha-dates">{d.start.slice(0, 7)} → {d.end.slice(0, 7)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Planet Table ───────────────────────────────────────────────────────────────

function PlanetTable({ positions }: { positions: Record<string, PlanetPos> }) {
  return (
    <table className="planet-table">
      <thead>
        <tr>
          <th>Planet</th>
          <th>Sign</th>
          <th>House</th>
          <th>Degree</th>
          <th>D9</th>
          <th>D10</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(positions).map(([name, pos]) => (
          <tr key={name}>
            <td>{name}</td>
            <td>{pos.sign}</td>
            <td>{pos.house}</td>
            <td>{pos.degree.toFixed(2)}°</td>
            <td>{pos.vargas.D9}</td>
            <td>{pos.vargas.D10}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Engine Banner ──────────────────────────────────────────────────────────────

function EngineBanner({ engineMode, reportMode }: { engineMode: string; reportMode: string }) {
  const isSwisseph = engineMode === "swisseph";
  const llmLabel = reportMode.startsWith("llm:")
    ? reportMode.replace("llm:", "")
    : reportMode === "deterministic"
      ? null
      : null;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
      <div className={`engine-banner ${isSwisseph ? "live" : "fallback"}`}>
        <span>{isSwisseph ? "✓" : "⚠"}</span>
        <span>
          {isSwisseph
            ? "Swiss Ephemeris — positions accurate."
            : <><strong>Fallback mode:</strong> approximate positions. Install pyswisseph for accuracy.</>}
        </span>
      </div>
      {llmLabel && (
        <div className="engine-banner live" style={{ background: "linear-gradient(90deg,#e0f2f4,#d1fae5)" }}>
          <span>✦</span>
          <span>AI narrative: <strong>{llmLabel}</strong></span>
        </div>
      )}
      {!llmLabel && (
        <div className="engine-banner fallback">
          <span>—</span>
          <span>Deterministic narrative (no LLM configured)</span>
        </div>
      )}
    </div>
  );
}

// ── Main Forms ────────────────────────────────────────────────────────────────

const initialKundliForm: KundliForm = {
  profile_id: "demo-1",
  date: "1994-02-10",
  time: "08:40",
  timezone: "Asia/Kolkata",
  location: "Delhi",
  latitude: "28.6139",
  longitude: "77.209",
  question: "What should I focus on in the next quarter?",
};

const initialRectifyForm: RectifyForm = {
  profile_id: "demo-1",
  birth_date: "1994-02-10",
  time_window_start: "08:10",
  time_window_end: "09:00",
  timezone: "Asia/Kolkata",
  event_title: "Job change",
  event_date: "2021-07-01",
  event_description: "Major role shift with relocation and higher responsibility",
};

const KUNDLI_PROMPTS = [
  "What should I focus on in the next quarter?",
  "Where do I need more discipline right now?",
  "How can I move through this transition with less friction?",
];

const TALK_PROMPTS = [
  "What should I prioritize for career stability this quarter?",
  "Where am I overextending my energy lately?",
  "What pattern should I stop repeating in relationships?",
];

const PROFILE_PRESETS = [
  {
    title: "Career clarity",
    subtitle: "A strong baseline for work and direction.",
    kundli: {
      profile_id: "career-demo",
      date: "1994-02-10",
      time: "08:40",
      timezone: "Asia/Kolkata",
      location: "Delhi",
      latitude: "28.6139",
      longitude: "77.2090",
      question: "What should I focus on in the next quarter?",
    },
    rectification: {
      profile_id: "career-demo",
      birth_date: "1994-02-10",
      time_window_start: "08:10",
      time_window_end: "09:00",
      timezone: "Asia/Kolkata",
      event_title: "Job change",
      event_date: "2021-07-01",
      event_description: "Major role shift with relocation and higher responsibility",
    },
  },
  {
    title: "Relationship season",
    subtitle: "Useful when your question feels emotional or relational.",
    kundli: {
      profile_id: "relationship-demo",
      date: "1992-04-11",
      time: "09:10",
      timezone: "Asia/Kolkata",
      location: "Mumbai",
      latitude: "19.0760",
      longitude: "72.8777",
      question: "What pattern should I understand before making a relationship decision?",
    },
    rectification: {
      profile_id: "relationship-demo",
      birth_date: "1992-04-11",
      time_window_start: "08:40",
      time_window_end: "09:35",
      timezone: "Asia/Kolkata",
      event_title: "Serious partnership shift",
      event_date: "2023-02-14",
      event_description: "A relationship deepened quickly and changed my daily emotional rhythm.",
    },
  },
  {
    title: "Move and reset",
    subtitle: "Good for relocation, home, and major life reorientation.",
    kundli: {
      profile_id: "move-demo",
      date: "1989-09-19",
      time: "18:25",
      timezone: "Asia/Kolkata",
      location: "Bengaluru",
      latitude: "12.9716",
      longitude: "77.5946",
      question: "How should I navigate a relocation and fresh chapter this year?",
    },
    rectification: {
      profile_id: "move-demo",
      birth_date: "1989-09-19",
      time_window_start: "18:00",
      time_window_end: "18:50",
      timezone: "Asia/Kolkata",
      event_title: "Home move",
      event_date: "2020-11-05",
      event_description: "A move to a new city reshaped work, lifestyle, and family responsibilities.",
    },
  },
];

const JOURNEY_OPTIONS: Array<{
  id: JourneyId;
  title: string;
  tag: string;
  description: string;
  targetId: string;
  cta: string;
  bullets: string[];
  accent: string;
}> = [
  {
    id: "report",
    title: "Build your baseline",
    tag: "First-time recommended",
    description: "Start here when you want the full chart, a grounded reading, and something worth returning to later.",
    targetId: "kundli-report-form",
    cta: "Start with the full report",
    bullets: [
      "You get planetary positions, panchang, dasha timing, and a narrative in one pass.",
      "Best for first-time use because it creates a durable reference point for future questions.",
    ],
    accent: "#0a9396",
  },
  {
    id: "talk",
    title: "Ask one direct question",
    tag: "Faster guidance",
    description: "Use this when the chart already exists in your mind and you want one focused answer instead of a full reading.",
    targetId: "kundli-talk",
    cta: "Jump to Talk to Kundli",
    bullets: [
      "Great after you have a baseline reading and want a sharper follow-up.",
      "Feels more conversational and less like generating a full report again.",
    ],
    accent: "#059669",
  },
  {
    id: "rectify",
    title: "Refine uncertain birth time",
    tag: "Accuracy-first",
    description: "Choose this when the time is fuzzy and you want to anchor the chart against real life events before going deeper.",
    targetId: "kundli-rectify",
    cta: "Open rectification",
    bullets: [
      "Most useful when the difference between nearby times changes the chart meaningfully.",
      "Ideal when family memory is approximate but you remember major life turning points.",
    ],
    accent: "#ca6702",
  },
];

export default function KundliPage() {
  const [kundliForm, setKundliForm] = useState<KundliForm>(initialKundliForm);
  const [rectForm, setRectForm] = useState<RectifyForm>(initialRectifyForm);
  const [talkQuery, setTalkQuery] = useState("What should I prioritize for career stability this quarter?");
  const [report, setReport] = useState<KundliReport | null>(null);
  const [talkResult, setTalkResult] = useState<TalkResult | null>(null);
  const [rectifyResult, setRectifyResult] = useState<RectifyResult | null>(null);
  const [videoResult, setVideoResult] = useState<{ job_id: string; status: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<JourneyId>("report");

  const selectedJourneyConfig = JOURNEY_OPTIONS.find((option) => option.id === selectedJourney) ?? JOURNEY_OPTIONS[0];
  const reportHighlights = report?.deterministic_facts.highlights.slice(0, 3) ?? [];
  const currentDasha = report?.deterministic_facts.vimshottari_timeline[0];

  async function lookupCity() {
    if (!kundliForm.location) return;
    setGeoLoading(true);
    try {
      const res = await fetch(`/v1/geocode/city?city=${encodeURIComponent(kundliForm.location)}`);
      if (!res.ok) throw new Error(await res.text());
      const geo = await res.json() as { lat: number; lng: number; timezone_hint: string };
      setKundliForm((prev) => ({
        ...prev,
        latitude: geo.lat.toFixed(4),
        longitude: geo.lng.toFixed(4),
        timezone: geo.timezone_hint,
      }));
    } catch {
      // silently ignore — user can fill in manually
    } finally {
      setGeoLoading(false);
    }
  }

  function updateKundliField(field: keyof KundliForm, e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setKundliForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function updateRectField(field: keyof RectifyForm, e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setRectForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function validateKundli() {
    if (!kundliForm.profile_id || !kundliForm.question || !kundliForm.date || !kundliForm.time) return "Complete all required kundli fields.";
    if (Number.isNaN(Number(kundliForm.latitude)) || Number.isNaN(Number(kundliForm.longitude))) return "Latitude and longitude must be valid numbers.";
    return "";
  }

  function validateRectification() {
    if (!rectForm.profile_id || !rectForm.birth_date || !rectForm.event_title || !rectForm.event_description) return "Complete all required rectification fields.";
    if (rectForm.time_window_start >= rectForm.time_window_end) return "Window start must be before window end.";
    return "";
  }

  const birthPayload = () => ({
    date: kundliForm.date, time: kundliForm.time, timezone: kundliForm.timezone,
    location: kundliForm.location, latitude: Number(kundliForm.latitude), longitude: Number(kundliForm.longitude),
  });

  function applyProfilePreset(index: number) {
    const preset = PROFILE_PRESETS[index];
    if (!preset) return;
    setKundliForm(preset.kundli);
    setRectForm(preset.rectification);
    setTalkQuery(preset.kundli.question);
    setSelectedJourney("report");
    setError("");
  }

  function jumpToJourney(journey: JourneyId) {
    const option = JOURNEY_OPTIONS.find((item) => item.id === journey);
    if (!option) return;
    setSelectedJourney(journey);
    requestAnimationFrame(() => {
      document.getElementById(option.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function submitReport() {
    const err = validateKundli();
    if (err) { setError(err); return; }
    setError(""); setLoading(true);
    try {
      const data = await postJson<KundliReport>("/v1/kundli/report", {
        profile_id: kundliForm.profile_id, birth: birthPayload(), question: kundliForm.question,
      });
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate kundli report");
    } finally { setLoading(false); }
  }

  async function submitRectification() {
    const err = validateRectification();
    if (err) { setError(err); return; }
    setError(""); setLoading(true);
    try {
      const data = await postJson<RectifyResult>("/v1/kundli/rectify", {
        profile_id: rectForm.profile_id, birth_date: rectForm.birth_date,
        time_window_start: rectForm.time_window_start, time_window_end: rectForm.time_window_end,
        timezone: rectForm.timezone,
        events: [{ title: rectForm.event_title, date: rectForm.event_date, description: rectForm.event_description }],
      });
      setRectifyResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run rectification");
    } finally { setLoading(false); }
  }

  async function queueKundliVideo() {
    const err = validateKundli();
    if (err) { setError(err); return; }
    setError(""); setLoading(true);
    try {
      const data = await postJson<{ job_id: string; status: string }>("/v1/video/kundli", {
        profile_id: kundliForm.profile_id, topic: "kundli",
        payload: { birth_date: kundliForm.date, location: kundliForm.location, question: kundliForm.question },
      });
      setVideoResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to queue kundli video");
    } finally { setLoading(false); }
  }

  async function talkToKundli() {
    const err = validateKundli();
    if (err) { setError(err); return; }
    if (!talkQuery) { setError("Enter a question."); return; }
    setError(""); setLoading(true);
    try {
      const data = await postJson<TalkResult>("/v1/kundli/talk", {
        profile_id: kundliForm.profile_id, birth: birthPayload(), query: talkQuery,
      });
      setTalkResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run Talk to Kundli.");
    } finally { setLoading(false); }
  }

  return (
    <main>
      <section className="feature-stage">
        <div className="feature-stage-grid">
          <div className="feature-stage-copy">
            <span className="feature-stage-kicker">Guided first reading</span>
            <h1 className="feature-stage-title">Turn your chart into a baseline you can return to.</h1>
            <p className="feature-stage-summary">
              The best first Kundli experience feels less like generating a report and more like setting your compass.
              Start with a full reading, ask one direct question, or refine time accuracy before going deeper.
            </p>
            <div className="feature-stage-step-list">
              <div className="feature-stage-step">
                <strong>1.</strong>
                <span>Anchor the birth details and the question that actually matters right now.</span>
              </div>
              <div className="feature-stage-step">
                <strong>2.</strong>
                <span>Choose whether you want a full baseline, a direct answer, or a rectification pass.</span>
              </div>
              <div className="feature-stage-step">
                <strong>3.</strong>
                <span>Leave with chart structure, narrative clarity, and something worth saving for later.</span>
              </div>
            </div>
          </div>

          <div className="feature-stage-panel">
            <div className="feature-path-grid">
              {JOURNEY_OPTIONS.map((option) => {
                const active = option.id === selectedJourney;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`feature-path-card${active ? " active" : ""}`}
                    onClick={() => jumpToJourney(option.id)}
                    style={
                      active
                        ? {
                            borderColor: `${option.accent}55`,
                            boxShadow: `0 16px 30px ${option.accent}20`,
                          }
                        : undefined
                    }
                  >
                    <span className="feature-path-tag" style={{ color: option.accent }}>{option.tag}</span>
                    <span className="feature-path-title">{option.title}</span>
                    <span className="feature-path-copy">{option.description}</span>
                  </button>
                );
              })}
            </div>

            <div className="soft-note">
              <strong>{selectedJourneyConfig.cta}</strong>
              <br />
              {selectedJourneyConfig.bullets[0]}
            </div>
          </div>
        </div>
      </section>

      <div className="grid two">
        <div id="kundli-report-form">
          <Surface title="1. Build Your Kundli Baseline">
            <div className="form">
              <p className="section-lead">
                If this is your first visit, start here. A full report gives the chart shape, timing, and language you can build on later.
              </p>
              <div className="preset-row">
                {PROFILE_PRESETS.map((preset, index) => (
                  <button key={preset.title} type="button" className="preset-card" onClick={() => applyProfilePreset(index)}>
                    <span className="preset-card-title">{preset.title}</span>
                    <span className="small-muted">{preset.subtitle}</span>
                  </button>
                ))}
              </div>

              <div className="form-grid">
                <Field label="Profile ID" input={<input className="input" value={kundliForm.profile_id} onChange={(e) => updateKundliField("profile_id", e)} />} />
                <Field label="Birth Date" input={<input className="input" type="date" value={kundliForm.date} onChange={(e) => updateKundliField("date", e)} />} />
                <Field label="Birth Time" input={<input className="input" type="time" value={kundliForm.time} onChange={(e) => updateKundliField("time", e)} />} />
                <Field label="Timezone" input={<input className="input" value={kundliForm.timezone} onChange={(e) => updateKundliField("timezone", e)} />} />
                <Field
                  label="Location"
                  input={
                    <div style={{ display: "flex", gap: 6 }}>
                      <input className="input" style={{ flex: 1 }} value={kundliForm.location} onChange={(e) => updateKundliField("location", e)} />
                      <button className="button secondary" type="button" onClick={lookupCity} disabled={geoLoading} style={{ whiteSpace: "nowrap", padding: "0 10px" }}>
                        {geoLoading ? "…" : "Lookup"}
                      </button>
                    </div>
                  }
                  help="Type a city name and click Lookup to auto-fill coordinates."
                />
                <Field label="Latitude" input={<input className="input" type="number" step="0.0001" value={kundliForm.latitude} onChange={(e) => updateKundliField("latitude", e)} />} />
                <Field label="Longitude" input={<input className="input" type="number" step="0.0001" value={kundliForm.longitude} onChange={(e) => updateKundliField("longitude", e)} />} />
              </div>
              <Field
                label="Question"
                input={<textarea className="textarea" value={kundliForm.question} onChange={(e) => updateKundliField("question", e)} />}
                help="Frame the reading around the decision, season, or recurring pattern you care about most."
              />
              <div className="mini-chip-row">
                {KUNDLI_PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" className="mini-chip" onClick={() => setKundliForm((prev) => ({ ...prev, question: prompt }))}>
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="button-row">
                <button className="button" type="button" data-testid="kundli-submit" onClick={submitReport} disabled={loading}>
                  {loading ? "Loading…" : "Generate Kundli Report"}
                </button>
                <button className="button secondary" type="button" data-testid="kundli-video-submit" onClick={queueKundliVideo} disabled={loading}>
                  {loading ? "Loading…" : "Queue Video"}
                </button>
              </div>
            </div>
          </Surface>
        </div>

        <Surface title={selectedJourneyConfig.title}>
          <div className="form">
            <p className="section-lead">{selectedJourneyConfig.description}</p>
            <div className="feature-stage-step-list">
              {selectedJourneyConfig.bullets.map((bullet) => (
                <div key={bullet} className="feature-stage-step">
                  <strong>•</strong>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
            <div className="soft-note">
              If you are brand new, start with the full report once, then come back for direct Q&A or rectification only when you need sharper follow-ups.
            </div>
            <div className="button-row">
              <button className="button secondary" type="button" onClick={() => jumpToJourney(selectedJourneyConfig.id)}>
                {selectedJourneyConfig.cta}
              </button>
            </div>
          </div>
        </Surface>
      </div>

      <div id="kundli-talk" style={{ marginTop: 16 }}>
        <Surface title="2. Talk to Your Kundli">
          <div className="form">
            <p className="section-lead">
              Ask one clean, present-tense question when you want chart-grounded guidance without regenerating the whole experience in your head.
            </p>
            <Field
              label="Your Question"
              input={<textarea className="textarea" value={talkQuery} onChange={(e) => setTalkQuery(e.target.value)} />}
              help="Best used after you have a baseline reading or when you know exactly what you want clarified."
            />
            <div className="mini-chip-row">
              {TALK_PROMPTS.map((prompt) => (
                <button key={prompt} type="button" className="mini-chip" onClick={() => setTalkQuery(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
            <button className="button secondary" type="button" data-testid="kundli-talk-submit" onClick={talkToKundli} disabled={loading}>
              {loading ? "Loading…" : "Ask Kundli"}
            </button>
          </div>
        </Surface>
      </div>

      <div id="kundli-rectify" style={{ marginTop: 16 }}>
        <Surface title="3. Birth Time Rectification">
          <div className="form">
            <p className="section-lead">
              Use real life turning points to narrow an uncertain birth time before relying too heavily on chart interpretation.
            </p>
            <div className="form-grid">
              <Field label="Profile ID" input={<input className="input" value={rectForm.profile_id} onChange={(e) => updateRectField("profile_id", e)} />} />
              <Field label="Birth Date" input={<input className="input" type="date" value={rectForm.birth_date} onChange={(e) => updateRectField("birth_date", e)} />} />
              <Field label="Window Start" input={<input className="input" type="time" value={rectForm.time_window_start} onChange={(e) => updateRectField("time_window_start", e)} />} />
              <Field label="Window End" input={<input className="input" type="time" value={rectForm.time_window_end} onChange={(e) => updateRectField("time_window_end", e)} />} />
              <Field label="Timezone" input={<input className="input" value={rectForm.timezone} onChange={(e) => updateRectField("timezone", e)} />} />
              <Field label="Event Title" input={<input className="input" value={rectForm.event_title} onChange={(e) => updateRectField("event_title", e)} />} />
              <Field label="Event Date" input={<input className="input" type="date" value={rectForm.event_date} onChange={(e) => updateRectField("event_date", e)} />} />
            </div>
            <Field label="Event Description" input={<textarea className="textarea" value={rectForm.event_description} onChange={(e) => updateRectField("event_description", e)} />} />
            <button className="button" type="button" data-testid="kundli-rectify-submit" onClick={submitRectification} disabled={loading}>
              {loading ? "Loading…" : "Run Rectification"}
            </button>
          </div>
        </Surface>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error ? <p className="error" style={{ marginTop: 16 }}>{error}</p> : null}

      {/* ── Kundli Report Result ───────────────────────────────────────────── */}
      {report ? (
        <div className="result-card" data-testid="kundli-report-result">
          <div className="result-card-header">
            <h3>Kundli Report</h3>
            <span className="badge" style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", color: "#fff" }}>
              {report.mode}
            </span>
            <button
              type="button"
              data-testid="kundli-share-card"
              onClick={() => {
                const p = new URLSearchParams({
                  lagna:     report.deterministic_facts.lagna.sign,
                  nakshatra: report.deterministic_facts.panchang.nakshatra,
                  dasha:     report.deterministic_facts.vimshottari_timeline[0]?.lord ?? "",
                  mode:      report.deterministic_facts.engine_mode,
                  name:      kundliForm.profile_id || "",
                });
                const cardUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/kundli-card?${p.toString()}`;
                navigator.clipboard.writeText(cardUrl).then(() => {
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2500);
                });
              }}
              style={{
                marginLeft: 10,
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: 6,
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "4px 12px",
                letterSpacing: "0.5px",
              }}
            >
              {shareCopied ? "Link Copied ✓" : "Share Card"}
            </button>
          </div>
          <div className="result-card-body">
            <EngineBanner engineMode={report.deterministic_facts.engine_mode} reportMode={report.mode} />

            <div className="summary-stat-grid">
              <div className="summary-stat-card">
                <span className="summary-stat-label">Lagna</span>
                <strong>{report.deterministic_facts.lagna.sign}</strong>
              </div>
              <div className="summary-stat-card">
                <span className="summary-stat-label">Nakshatra</span>
                <strong>{report.deterministic_facts.panchang.nakshatra}</strong>
              </div>
              <div className="summary-stat-card">
                <span className="summary-stat-label">Current Dasha</span>
                <strong>{currentDasha ? currentDasha.lord : "Not available"}</strong>
              </div>
              <div className="summary-stat-card">
                <span className="summary-stat-label">Reading Mode</span>
                <strong>{report.mode}</strong>
              </div>
            </div>

            {/* Chart + highlights side by side */}
            <div className="grid two" style={{ alignItems: "start" }}>
              <div>
                <div className="result-section-label" style={{ marginBottom: 8 }}>North Indian Birth Chart</div>
                <NorthIndianChart facts={report.deterministic_facts} />
                <div style={{ textAlign: "center", fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>
                  Lagna: {report.deterministic_facts.lagna.sign} ({report.deterministic_facts.lagna.degree.toFixed(2)}°)
                  &nbsp;·&nbsp;{"Lahiri"}
                </div>
              </div>
              <div className="result-section">
                <div className="result-section-label">Highlights</div>
                {reportHighlights.map((h, i) => (
                  <div key={i} style={{ fontSize: "0.88rem", color: "#334155", lineHeight: 1.6, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
                    {h}
                  </div>
                ))}
              </div>
            </div>

            {/* Narrative */}
            <div className="result-section">
              <div className="result-section-label">Reading</div>
              <div className="result-section-text large">{report.narrative}</div>
            </div>

            {/* Panchang */}
            <div className="result-section">
              <div className="result-section-label">Birth Panchang</div>
              <div className="badge-row">
                {(["tithi","nakshatra","yoga","karana","vara"] as const).map((key) => (
                  <span key={key} className="badge muted">{key}: {report.deterministic_facts.panchang[key]}</span>
                ))}
              </div>
            </div>

            {/* Planet table */}
            <div className="result-section">
              <div className="result-section-label">Planetary Positions</div>
              <PlanetTable positions={report.deterministic_facts.planet_positions} />
            </div>

            {/* Dasha timeline */}
            <div className="result-section">
              <div className="result-section-label">Vimshottari Dasha Timeline</div>
              <DashaTimeline timeline={report.deterministic_facts.vimshottari_timeline} />
            </div>

            {/* Chart elements */}
            <div className="result-section">
              <div className="result-section-label">Chart Elements Used</div>
              <div className="badge-row">
                {report.chart_elements_used.map((el) => (
                  <span key={el} className="badge">{el}</span>
                ))}
              </div>
            </div>

            {/* Citations */}
            {report.citations.length > 0 && (
              <div className="result-section">
                <div className="result-section-label">Citations</div>
                <ul className="citation-list">
                  {report.citations.map((c, i) => (
                    <li key={i}>{c.title} — {c.locator}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="disclaimer-text">{report.disclaimers.join(" ")}</div>
          </div>
        </div>
      ) : null}

      {/* ── Rectify Result ─────────────────────────────────────────────────── */}
      {rectifyResult ? (
        <div className="result-card" data-testid="kundli-rectify-result">
          <div className="result-card-header">
            <h3>Rectification Result</h3>
          </div>
          <div className="result-card-body">
            <div className="grid two">
              <div className="result-section">
                <div className="result-section-label">Proposed Window</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#005f73" }}>{rectifyResult.proposed_window}</div>
              </div>
              <div className="result-section">
                <div className="result-section-label">Confidence Band</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ca6702" }}>{rectifyResult.confidence_band}</div>
              </div>
            </div>
            <div className="result-section">
              <div className="result-section-label">Rationale</div>
              <div className="result-section-text">{rectifyResult.rationale}</div>
            </div>
            <div className="disclaimer-text">{rectifyResult.disclaimers.join(" ")}</div>
          </div>
        </div>
      ) : null}

      {/* ── Video Job ──────────────────────────────────────────────────────── */}
      {videoResult ? (
        <div className="result-card" data-testid="kundli-video-result">
          <div className="result-card-header"><h3>Video Job Queued</h3></div>
          <div className="result-card-body">
            <div className="badge-row">
              <span className="badge muted">Job ID: {videoResult.job_id}</span>
              <span className="badge ok">Status: {videoResult.status}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Talk Result ────────────────────────────────────────────────────── */}
      {talkResult ? (
        <div className="result-card" data-testid="kundli-talk-result">
          <div className="result-card-header">
            <h3>Kundli Q&A</h3>
            <span className="badge" style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", color: "#fff" }}>
              {talkResult.mode}
            </span>
          </div>
          <div className="result-card-body">
            <div className="result-section">
              <div className="result-section-label">Answer</div>
              <div className="result-section-text large">{talkResult.answer}</div>
            </div>
            <div className="result-section">
              <div className="result-section-label">Chart Elements Used</div>
              <div className="badge-row">
                {talkResult.chart_elements_used.map((el) => <span key={el} className="badge">{el}</span>)}
              </div>
            </div>
            {talkResult.citations.length > 0 && (
              <div className="result-section">
                <div className="result-section-label">Citations</div>
                <ul className="citation-list">
                  {talkResult.citations.map((c, i) => <li key={i}>{c.title} — {c.locator}</li>)}
                </ul>
              </div>
            )}
            <div className="disclaimer-text">{talkResult.disclaimer}</div>
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
