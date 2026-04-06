"use client";

import { useState, type ReactNode } from "react";
import { Surface } from "@cortex/ui";
import { useAnalytics } from "../../lib/analytics";
import { postJson } from "../../lib/api";

type FormValues = {
  profile_id: string;
  mode: "chat" | "voice" | "video";
  consent_recording: boolean;
  consent_transcription: boolean;
  consent_memory: boolean;
};

type SessionResult = { session_id: string; rtc_url: string; token_hint: string; retention_policy: string };
type SummaryResult = { summary: string; action_plan: string[]; disclaimer: string };

type ConsultJourney = {
  id: string;
  title: string;
  tag: string;
  description: string;
  form: FormValues;
  requestedFocus: string;
  transcriptExcerpt: string;
};

const initialValues: FormValues = {
  profile_id: "demo-1",
  mode: "video",
  consent_recording: true,
  consent_transcription: true,
  consent_memory: true,
};

const MODE_OPTIONS: Array<{ id: FormValues["mode"]; label: string; copy: string }> = [
  { id: "chat", label: "Chat", copy: "Fastest when the question is focused and low-friction." },
  { id: "voice", label: "Voice", copy: "Good when emotional nuance matters more than visual context." },
  { id: "video", label: "Video", copy: "Best for a fuller consult with presence, pacing, and trust." },
];

const JOURNEYS: ConsultJourney[] = [
  {
    id: "deep-dive",
    title: "First deep-dive consult",
    tag: "Best first session",
    description: "Use a fuller, more documented consult when the question is broad and you want a durable summary afterward.",
    form: {
      profile_id: "consult-deep-dive",
      mode: "video",
      consent_recording: true,
      consent_transcription: true,
      consent_memory: true,
    },
    requestedFocus: "life direction and timing",
    transcriptExcerpt: "Discussed career direction, family expectations, and how to move with less urgency and more clarity.",
  },
  {
    id: "private-check-in",
    title: "Private check-in",
    tag: "Lower pressure",
    description: "Choose this when you want intimacy and speed, with lighter documentation and a tighter scope.",
    form: {
      profile_id: "consult-private",
      mode: "voice",
      consent_recording: false,
      consent_transcription: true,
      consent_memory: false,
    },
    requestedFocus: "relationship clarity",
    transcriptExcerpt: "Focused on one emotional decision, recent friction, and how to respond without escalating tension.",
  },
  {
    id: "follow-up",
    title: "Follow-up and action plan",
    tag: "After the session",
    description: "Best when the live conversation already happened and the real need is a concise summary with next steps.",
    form: {
      profile_id: "consult-follow-up",
      mode: "chat",
      consent_recording: false,
      consent_transcription: true,
      consent_memory: true,
    },
    requestedFocus: "next-step planning",
    transcriptExcerpt: "Reviewed earlier guidance, clarified one decision window, and turned the conversation into practical next actions.",
  },
];

const FOCUS_STARTERS = [
  "career alignment",
  "relationship clarity",
  "family decisions",
  "timing and patience",
  "habit reset",
];

export default function ConsultPage() {
  const { track } = useAnalytics();
  const [form, setForm] = useState<FormValues>(initialValues);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [transcriptExcerpt, setTranscriptExcerpt] = useState(
    "Discussed career planning, communication rhythm, and incremental decision strategy.",
  );
  const [requestedFocus, setRequestedFocus] = useState("career alignment");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeJourneyId, setActiveJourneyId] = useState(JOURNEYS[0].id);

  function applyJourney(journeyId: string) {
    const journey = JOURNEYS.find((item) => item.id === journeyId);
    if (!journey) return;
    setActiveJourneyId(journey.id);
    setForm({ ...journey.form });
    setRequestedFocus(journey.requestedFocus);
    setTranscriptExcerpt(journey.transcriptExcerpt);
    setError("");
    track("consult_journey_selected", { journey_id: journey.id, mode: journey.form.mode });
  }

  function setMode(mode: FormValues["mode"]) {
    setForm((prev) => ({ ...prev, mode }));
    track("consult_mode_selected", { mode });
  }

  async function submitSession() {
    if (!form.profile_id) {
      setError("Profile ID is required.");
      return;
    }

    setError("");
    setLoading(true);
    track("consult_session_requested", {
      mode: form.mode,
      consent_recording: form.consent_recording,
      consent_transcription: form.consent_transcription,
      consent_memory: form.consent_memory,
    });
    try {
      const data = await postJson<SessionResult>("/v1/consult/realtime/session", form);
      setSessionId(data.session_id);
      setSessionResult(data);
      track("consult_session_created", { mode: form.mode, retention_policy: data.retention_policy });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create consult session";
      setError(message);
      track("consult_session_failed", { message });
    } finally {
      setLoading(false);
    }
  }

  async function generateSummary() {
    if (!sessionId) {
      setError("Create a session first so summary can be attached to a valid consult record.");
      return;
    }
    if (!transcriptExcerpt || !requestedFocus) {
      setError("Transcript excerpt and focus are required for summary generation.");
      return;
    }

    setError("");
    setLoading(true);
    track("consult_summary_requested", {
      focus: requestedFocus,
      transcript_length: transcriptExcerpt.length,
    });
    try {
      const data = await postJson<SummaryResult>("/v1/consult/summary", {
        session_id: sessionId,
        profile_id: form.profile_id,
        transcript_excerpt: transcriptExcerpt,
        requested_focus: requestedFocus,
      });

      setSummaryResult(data);
      track("consult_summary_generated", { action_plan_count: data.action_plan.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate consult summary";
      setError(message);
      track("consult_summary_failed", { message });
    } finally {
      setLoading(false);
    }
  }

  const activeJourney = JOURNEYS.find((journey) => journey.id === activeJourneyId) ?? JOURNEYS[0];
  const enabledConsentCount = [
    form.consent_recording,
    form.consent_transcription,
    form.consent_memory,
  ].filter(Boolean).length;

  return (
    <main>
      <section className="feature-stage">
        <div className="feature-stage-grid">
          <div className="feature-stage-copy">
            <span className="feature-stage-kicker">Guided consult flow</span>
            <h1 className="feature-stage-title">Make the live session feel calm before it starts.</h1>
            <p className="feature-stage-summary">
              The right consult experience balances mode, consent, and follow-through. That means helping the user
              choose the tone of the session, then turning the conversation into something useful afterward.
            </p>
            <div className="feature-stage-step-list">
              <div className="feature-stage-step">
                <strong>01</strong>
                <span>Choose the kind of session you want, not just the transport layer.</span>
              </div>
              <div className="feature-stage-step">
                <strong>02</strong>
                <span>Set consent clearly so trust is established before a single question is asked.</span>
              </div>
              <div className="feature-stage-step">
                <strong>03</strong>
                <span>Use the summary pass to turn emotional conversation into grounded next actions.</span>
              </div>
            </div>
          </div>

          <div className="feature-stage-panel">
            <div className="feature-path-grid">
              {JOURNEYS.map((journey) => (
                <button
                  key={journey.id}
                  type="button"
                  className={`feature-path-card${journey.id === activeJourneyId ? " active" : ""}`}
                  onClick={() => applyJourney(journey.id)}
                >
                  <span className="feature-path-tag">{journey.tag}</span>
                  <span className="feature-path-title">{journey.title}</span>
                  <span className="feature-path-copy">{journey.description}</span>
                </button>
              ))}
            </div>
            <div className="summary-stat-grid">
              <div className="summary-stat-card">
                <span className="summary-stat-label">Recommended mode</span>
                <strong>{activeJourney.form.mode}</strong>
              </div>
              <div className="summary-stat-card">
                <span className="summary-stat-label">Consents enabled</span>
                <strong>{enabledConsentCount}/3</strong>
              </div>
              <div className="summary-stat-card">
                <span className="summary-stat-label">Follow-up focus</span>
                <strong>{requestedFocus}</strong>
              </div>
              <div className="summary-stat-card">
                <span className="summary-stat-label">Best for</span>
                <strong>Trust + clarity</strong>
              </div>
            </div>
            <div className="soft-note">
              Premium consult UX is mostly emotional design: calm expectations, explicit consent, and a strong sense
              that nothing meaningful from the session gets lost afterward.
            </div>
          </div>
        </div>
      </section>

      <div className="grid two" style={{ marginTop: 20, alignItems: "start" }}>
        <Surface title="Create the consult container">
          <p className="section-lead">
            {activeJourney.description}
          </p>

          <div className="choice-grid" style={{ marginTop: 16 }}>
            {MODE_OPTIONS.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`choice-card${form.mode === mode.id ? " active" : ""}`}
                onClick={() => setMode(mode.id)}
              >
                <span className="choice-card-title">{mode.label}</span>
                <span className="feature-path-copy">{mode.copy}</span>
              </button>
            ))}
          </div>

          <div className="form" style={{ marginTop: 16 }}>
            <Field
              label="Profile ID"
              input={<input className="input" value={form.profile_id} onChange={(event) => setForm((prev) => ({ ...prev, profile_id: event.target.value }))} />}
            />

            <div className="consent-grid">
              <ConsentCard
                checked={form.consent_recording}
                title="Recording"
                copy="Useful when the session should be reviewable later."
                onChange={(checked) => setForm((prev) => ({ ...prev, consent_recording: checked }))}
              />
              <ConsentCard
                checked={form.consent_transcription}
                title="Transcription"
                copy="Best when you want a cleaner written summary and action plan."
                onChange={(checked) => setForm((prev) => ({ ...prev, consent_transcription: checked }))}
              />
              <ConsentCard
                checked={form.consent_memory}
                title="Memory"
                copy="Helps the product preserve continuity across future sessions."
                onChange={(checked) => setForm((prev) => ({ ...prev, consent_memory: checked }))}
              />
            </div>

            <div className="button-row">
              <button className="button" type="button" data-testid="consult-submit" onClick={submitSession} disabled={loading}>
                {loading ? "Loading…" : "Create Session"}
              </button>
            </div>
          </div>
        </Surface>

        <Surface title="Capture the aftermath">
          <p className="section-lead">
            The consult becomes much more valuable when the emotional conversation is compressed into a concise summary
            you can actually revisit.
          </p>

          <div className="mini-chip-row" style={{ marginTop: 16 }}>
            {FOCUS_STARTERS.map((focus) => (
              <button key={focus} type="button" className="mini-chip" onClick={() => setRequestedFocus(focus)}>
                {focus}
              </button>
            ))}
          </div>

          <div className="form" style={{ marginTop: 16 }}>
            <Field
              label="Session ID"
              input={<input className="input" value={sessionId} onChange={(event) => setSessionId(event.target.value)} />}
              help="Auto-filled when you create a session above."
            />
            <Field
              label="Transcript excerpt"
              input={<textarea className="textarea" value={transcriptExcerpt} onChange={(event) => setTranscriptExcerpt(event.target.value)} />}
            />
            <Field
              label="Requested focus"
              input={<input className="input" value={requestedFocus} onChange={(event) => setRequestedFocus(event.target.value)} />}
            />
            <button className="button secondary" type="button" data-testid="consult-summary-submit" onClick={generateSummary} disabled={loading}>
              {loading ? "Loading…" : "Generate Summary + Action Plan"}
            </button>
          </div>
        </Surface>
      </div>

      {error ? <p className="error" style={{ marginTop: 16 }}>{error}</p> : null}

      {sessionResult ? (
        <div className="result-card" data-testid="consult-result" style={{ marginTop: 16 }}>
          <div className="result-card-header"><h3>Session created</h3></div>
          <div className="result-card-body">
            <div className="badge-row">
              <span className="badge ok">Session: {sessionResult.session_id}</span>
              <span className="badge muted">Retention: {sessionResult.retention_policy}</span>
            </div>
            <div className="result-section">
              <div className="result-section-label">RTC URL</div>
              <code style={{ fontSize: "0.88rem", background: "#f1f5f9", padding: "6px 10px", borderRadius: 8, display: "block" }}>{sessionResult.rtc_url}</code>
            </div>
            <div className="result-section">
              <div className="result-section-label">Token hint</div>
              <code style={{ fontSize: "0.85rem", color: "#64748b", background: "#f8fafc", padding: "6px 10px", borderRadius: 8, display: "block" }}>{sessionResult.token_hint}</code>
            </div>
          </div>
        </div>
      ) : null}

      {summaryResult ? (
        <div className="result-card" data-testid="consult-summary-result" style={{ marginTop: 16 }}>
          <div className="result-card-header"><h3>Post-consult summary</h3></div>
          <div className="result-card-body">
            <div className="result-section">
              <div className="result-section-label">Summary</div>
              <div className="result-section-text">{summaryResult.summary}</div>
            </div>
            <div className="result-section">
              <div className="result-section-label">Action plan</div>
              {summaryResult.action_plan.map((step, index) => (
                <div key={index} style={{ display: "flex", gap: 10, paddingBottom: 6, fontSize: "0.92rem" }}>
                  <span style={{ fontWeight: 700, color: "#005f73", minWidth: 24 }}>{index + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <div className="disclaimer-text">{summaryResult.disclaimer}</div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ConsentCard(props: {
  checked: boolean;
  title: string;
  copy: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`consent-card${props.checked ? " active" : ""}`}>
      <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} />
      <div>
        <div className="choice-card-title">{props.title}</div>
        <div className="feature-path-copy">{props.copy}</div>
      </div>
    </label>
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
