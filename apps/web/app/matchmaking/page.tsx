"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { Surface } from "@cortex/ui";
import { useAnalytics } from "../../lib/analytics";
import { postJson } from "../../lib/api";

type PersonForm = {
  profile_id: string;
  name: string;
  date: string;
  time: string;
  timezone: string;
  location: string;
  latitude: string;
  longitude: string;
};

type MatchForm = { rubric: string; seeker: PersonForm; partner: PersonForm };

type MatchResult = {
  compatibility_score: number;
  strengths: string[];
  watchouts: string[];
  compatibility_paths: string[];
  disclaimer: string;
};

type MatchStarter = {
  id: string;
  title: string;
  tag: string;
  description: string;
  form: MatchForm;
};

const initialPerson = (profileId: string, name: string): PersonForm => ({
  profile_id: profileId,
  name,
  date: "1992-04-11",
  time: "09:10",
  timezone: "Asia/Kolkata",
  location: "Delhi",
  latitude: "28.6139",
  longitude: "77.2090",
});

const initialForm: MatchForm = {
  rubric: "guna-milan-core",
  seeker: initialPerson("seeker-1", "Anaya"),
  partner: {
    ...initialPerson("partner-1", "Rohan"),
    date: "1991-08-24",
    time: "18:30",
    location: "Pune",
    latitude: "18.5204",
    longitude: "73.8567",
  },
};

const MATCH_STARTERS: MatchStarter[] = [
  {
    id: "marriage-track",
    title: "Marriage track",
    tag: "Most complete",
    description: "Use the full compatibility pass when the relationship is serious and the reading needs both strengths and watchpoints.",
    form: initialForm,
  },
  {
    id: "curious-stage",
    title: "Early-stage curiosity",
    tag: "Lower pressure",
    description: "Best when you want a grounded snapshot without pretending the relationship is already settled.",
    form: {
      rubric: "compatibility-snapshot",
      seeker: initialPerson("seeker-curious", "Mira"),
      partner: {
        ...initialPerson("partner-curious", "Arjun"),
        date: "1993-06-18",
        time: "07:40",
        location: "Bengaluru",
        latitude: "12.9716",
        longitude: "77.5946",
      },
    },
  },
  {
    id: "timing-check",
    title: "Timing and rhythm check",
    tag: "Specific question",
    description: "Choose this when the main uncertainty is not the bond itself, but how the rhythm between two lives is landing right now.",
    form: {
      rubric: "timing-rhythm",
      seeker: initialPerson("seeker-timing", "Ishita"),
      partner: {
        ...initialPerson("partner-timing", "Kabir"),
        date: "1990-10-05",
        time: "21:15",
        location: "Mumbai",
        latitude: "19.0760",
        longitude: "72.8777",
      },
    },
  },
];

const CITY_PRESETS: Record<string, { location: string; latitude: string; longitude: string; timezone: string }> = {
  Delhi: { location: "Delhi", latitude: "28.6139", longitude: "77.2090", timezone: "Asia/Kolkata" },
  Mumbai: { location: "Mumbai", latitude: "19.0760", longitude: "72.8777", timezone: "Asia/Kolkata" },
  Pune: { location: "Pune", latitude: "18.5204", longitude: "73.8567", timezone: "Asia/Kolkata" },
  Bengaluru: { location: "Bengaluru", latitude: "12.9716", longitude: "77.5946", timezone: "Asia/Kolkata" },
};

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(score / 100, 1);
  const dash = circumference * progress;
  const color = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 70 ? "Excellent" : score >= 50 ? "Good" : "Needs Review";
  return (
    <div className="score-ring-wrap">
      <div className="score-ring-inner">
        <svg width={130} height={130} viewBox="0 0 130 130" aria-label="Compatibility score ring">
          <circle cx={65} cy={65} r={r} fill="none" stroke="#e2e8f0" strokeWidth={12} />
          <circle
            cx={65}
            cy={65}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 65 65)"
          />
        </svg>
        <div className="score-ring-label">
          {score}
          <span className="score-ring-sub">{label}</span>
        </div>
      </div>
    </div>
  );
}

export default function MatchmakingPage() {
  const { track } = useAnalytics();
  const [form, setForm] = useState<MatchForm>(initialForm);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState<"seeker" | "partner" | null>(null);
  const [activeStarterId, setActiveStarterId] = useState(MATCH_STARTERS[0].id);

  function updatePerson(person: "seeker" | "partner", field: keyof PersonForm, event: ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [person]: { ...prev[person], [field]: event.target.value } }));
  }

  function applyStarter(starterId: string) {
    const starter = MATCH_STARTERS.find((item) => item.id === starterId);
    if (!starter) return;
    setActiveStarterId(starter.id);
    setForm({
      rubric: starter.form.rubric,
      seeker: { ...starter.form.seeker },
      partner: { ...starter.form.partner },
    });
    setError("");
    track("matchmaking_starter_selected", { starter_id: starter.id, rubric: starter.form.rubric });
  }

  function applyCity(person: "seeker" | "partner", city: keyof typeof CITY_PRESETS) {
    const preset = CITY_PRESETS[city];
    setForm((prev) => ({
      ...prev,
      [person]: { ...prev[person], ...preset },
    }));
    track("matchmaking_city_preset_used", { person, city });
  }

  async function lookupCity(person: "seeker" | "partner") {
    const city = form[person].location;
    if (!city) return;
    setGeoLoading(person);
    track("matchmaking_geo_lookup_requested", { person, city });
    try {
      const res = await fetch(`/v1/geocode/city?city=${encodeURIComponent(city)}`);
      if (!res.ok) return;
      const geo = await res.json() as { lat: number; lng: number; timezone_hint: string };
      setForm((prev) => ({
        ...prev,
        [person]: {
          ...prev[person],
          latitude: geo.lat.toFixed(4),
          longitude: geo.lng.toFixed(4),
          timezone: geo.timezone_hint,
        },
      }));
      track("matchmaking_geo_lookup_completed", { person, city });
    } finally {
      setGeoLoading(null);
    }
  }

  async function runMatchmaking() {
    setError("");
    if (!form.seeker.name || !form.partner.name) {
      setError("Both profiles require names.");
      return;
    }
    setLoading(true);
    track("matchmaking_requested", { rubric: form.rubric });
    try {
      const makeBirth = (person: PersonForm) => ({
        date: person.date,
        time: person.time,
        timezone: person.timezone,
        location: person.location,
        latitude: Number(person.latitude),
        longitude: Number(person.longitude),
      });
      const data = await postJson<MatchResult>("/v1/matchmaking/compare", {
        seeker: { ...form.seeker, birth: makeBirth(form.seeker) },
        partner: { ...form.partner, birth: makeBirth(form.partner) },
        rubric: form.rubric,
      });
      setResult(data);
      track("matchmaking_generated", { score: data.compatibility_score, rubric: form.rubric });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to run matchmaking analysis.";
      setError(message);
      track("matchmaking_failed", { message });
    } finally {
      setLoading(false);
    }
  }

  const kootaLines = result?.compatibility_paths.filter((path) => path.includes(":")) ?? [];
  const otherPaths = result?.compatibility_paths.filter((path) => !path.includes(":")) ?? [];
  const activeStarter = MATCH_STARTERS.find((starter) => starter.id === activeStarterId) ?? MATCH_STARTERS[0];

  return (
    <main>
      <section className="feature-stage">
        <div className="feature-stage-grid">
          <div className="feature-stage-copy">
            <span className="feature-stage-kicker">Relationship guidance with structure</span>
            <h1 className="feature-stage-title">Start from the relationship stage you are actually in.</h1>
            <p className="feature-stage-summary">
              Good matchmaking UX does not push every relationship into the same seriousness. It should help people ask
              a grounded compatibility question without forcing false certainty.
            </p>
            <div className="feature-stage-step-list">
              <div className="feature-stage-step">
                <strong>01</strong>
                <span>Pick the reading frame that matches the relationship stage.</span>
              </div>
              <div className="feature-stage-step">
                <strong>02</strong>
                <span>Fill in both birth profiles with enough accuracy to make the comparison worth trusting.</span>
              </div>
              <div className="feature-stage-step">
                <strong>03</strong>
                <span>Read strengths and watchouts together, so the result feels balanced instead of dramatic.</span>
              </div>
            </div>
          </div>

          <div className="feature-stage-panel">
            <div className="feature-path-grid">
              {MATCH_STARTERS.map((starter) => (
                <button
                  key={starter.id}
                  type="button"
                  className={`feature-path-card${starter.id === activeStarterId ? " active" : ""}`}
                  onClick={() => applyStarter(starter.id)}
                >
                  <span className="feature-path-tag">{starter.tag}</span>
                  <span className="feature-path-title">{starter.title}</span>
                  <span className="feature-path-copy">{starter.description}</span>
                </button>
              ))}
            </div>
            <div className="summary-stat-grid">
              <div className="summary-stat-card">
                <span className="summary-stat-label">Reading frame</span>
                <strong>{activeStarter.title}</strong>
              </div>
              <div className="summary-stat-card">
                <span className="summary-stat-label">Rubric</span>
                <strong>{form.rubric}</strong>
              </div>
              <div className="summary-stat-card">
                <span className="summary-stat-label">Profile cities</span>
                <strong>{form.seeker.location} + {form.partner.location}</strong>
              </div>
              <div className="summary-stat-card">
                <span className="summary-stat-label">Best output</span>
                <strong>Balanced report</strong>
              </div>
            </div>
            <div className="soft-note">
              A premium compatibility product should help people slow down. That means less theater, more nuance, and
              clearer handling of both harmony and friction.
            </div>
          </div>
        </div>
      </section>

      <div className="grid two" style={{ marginTop: 20, alignItems: "start" }}>
        <Surface title="Choose your relationship frame">
          <p className="section-lead">
            {activeStarter.description}
          </p>
          <div className="preset-row" style={{ marginTop: 16 }}>
            {MATCH_STARTERS.map((starter) => (
              <button
                key={starter.id}
                type="button"
                className={`preset-card${starter.id === activeStarterId ? " active-preset" : ""}`}
                onClick={() => applyStarter(starter.id)}
              >
                <span className="preset-card-title">{starter.title}</span>
                <span className="feature-path-copy">{starter.tag}</span>
              </button>
            ))}
          </div>
          <Field
            label="Rubric"
            input={<input className="input" value={form.rubric} onChange={(event) => setForm((prev) => ({ ...prev, rubric: event.target.value }))} />}
            help="You can keep the classic `guna-milan-core` rubric or use a more focused internal label."
          />
        </Surface>

        <Surface title="Quick city shortcuts">
          <p className="section-lead">
            Use these when the main blocker is location details, then refine manually if needed.
          </p>
          {(["seeker", "partner"] as const).map((person) => (
            <div key={person} style={{ marginTop: 16 }}>
              <div className="result-section-label">{person === "seeker" ? "Seeker city" : "Partner city"}</div>
              <div className="mini-chip-row" style={{ marginTop: 8 }}>
                {(Object.keys(CITY_PRESETS) as Array<keyof typeof CITY_PRESETS>).map((city) => (
                  <button key={`${person}-${city}`} type="button" className="mini-chip" onClick={() => applyCity(person, city)}>
                    {city}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Surface>
      </div>

      <div style={{ marginTop: 20 }}>
        <Surface title="People and birth details">
          <div className="grid two">
            {(["seeker", "partner"] as const).map((person) => (
              <Surface key={person} title={person === "seeker" ? "Seeker profile" : "Partner profile"}>
                <div className="form-grid">
                  {(["profile_id", "name", "date", "time", "timezone", "location", "latitude", "longitude"] as Array<keyof PersonForm>).map((field) => (
                    <Field
                      key={field}
                      label={field.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                      input={
                        field === "location" ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <input className="input" style={{ flex: 1 }} value={form[person][field]} onChange={(event) => updatePerson(person, field, event)} />
                            <button
                              className="button secondary"
                              type="button"
                              onClick={() => lookupCity(person)}
                              disabled={geoLoading === person}
                              style={{ whiteSpace: "nowrap", padding: "0 10px" }}
                            >
                              {geoLoading === person ? "…" : "Lookup"}
                            </button>
                          </div>
                        ) : (
                          <input
                            className="input"
                            type={field === "date" ? "date" : field === "time" ? "time" : "text"}
                            value={form[person][field]}
                            onChange={(event) => updatePerson(person, field, event)}
                          />
                        )
                      }
                    />
                  ))}
                </div>
              </Surface>
            ))}
          </div>
          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="button" type="button" data-testid="matchmaking-submit" onClick={runMatchmaking} disabled={loading}>
              {loading ? "Loading…" : "Compare Compatibility"}
            </button>
          </div>
        </Surface>
      </div>

      {error ? <p className="error" style={{ marginTop: 16 }}>{error}</p> : null}

      {result ? (
        <div className="result-card" data-testid="matchmaking-result">
          <div className="result-card-header">
            <h3>Compatibility report — {form.seeker.name} &amp; {form.partner.name}</h3>
          </div>
          <div className="result-card-body">
            <div className="grid two" style={{ alignItems: "start" }}>
              <div>
                <ScoreRing score={result.compatibility_score} />
                <div style={{ textAlign: "center", fontSize: "0.88rem", color: "#64748b" }}>
                  Guna Milan Score: {result.compatibility_score}/100
                </div>
              </div>
              {kootaLines.length > 0 ? (
                <div className="result-section">
                  <div className="result-section-label">8-Koota breakdown</div>
                  {kootaLines.map((line, index) => {
                    const [name, rest] = line.split(":").map((item) => item.trim());
                    return (
                      <div key={index} className="koota-row">
                        <span className="koota-name">{name}</span>
                        <span className="koota-score">{rest}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="grid two">
              <div className="result-section">
                <div className="result-section-label">Strengths</div>
                {result.strengths.map((strength, index) => (
                  <div key={index} className="why-item">
                    <div className="why-dot good" style={{ marginTop: 5 }} />
                    <span style={{ fontSize: "0.92rem" }}>{strength}</span>
                  </div>
                ))}
              </div>
              <div className="result-section">
                <div className="result-section-label">Watchouts</div>
                {result.watchouts.map((watchout, index) => (
                  <div key={index} className="why-item">
                    <div className="why-dot caution" style={{ marginTop: 5 }} />
                    <span style={{ fontSize: "0.92rem", color: "#78350f" }}>{watchout}</span>
                  </div>
                ))}
              </div>
            </div>

            {otherPaths.length > 0 ? (
              <div className="result-section">
                <div className="result-section-label">Compatibility paths</div>
                {otherPaths.map((path, index) => <div key={index} style={{ fontSize: "0.88rem", color: "#334155" }}>{path}</div>)}
              </div>
            ) : null}

            <div className="disclaimer-text">{result.disclaimer}</div>
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
