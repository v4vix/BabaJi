"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { Surface } from "@cortex/ui";
import { useAnalytics } from "../../lib/analytics";
import { postJson } from "../../lib/api";

type RoomEntry = { name: string; zone: string };

type FormValues = {
  profile_id: string;
  facing_direction: string;
  entrance: string;
  notes: string;
};

type VaastuReport = {
  report_markdown: string;
  checklist: string[];
  safety_notes: string[];
  citations: { title: string; locator: string }[];
};

type StarterPreset = {
  id: string;
  title: string;
  subtitle: string;
  form: FormValues;
  rooms: RoomEntry[];
};

const DIRECTION_OPTIONS = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];

const DEFAULT_ROOMS: RoomEntry[] = [
  { name: "bedroom", zone: "Southwest" },
  { name: "kitchen", zone: "Southeast" },
  { name: "study", zone: "North" },
];

const initialValues: FormValues = {
  profile_id: "demo-1",
  facing_direction: "East",
  entrance: "Northeast",
  notes: "Apartment, no structural changes planned. Need practical, low-cost suggestions.",
};

const ALLOWED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg", "text/plain"];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const ROOM_ZONE_SUGGESTIONS: Record<string, string> = {
  bedroom: "Southwest",
  kitchen: "Southeast",
  study: "North",
  prayer: "Northeast",
  living: "East",
  office: "North",
};

const STARTER_PRESETS: StarterPreset[] = [
  {
    id: "renter-reset",
    title: "Renter reset",
    subtitle: "Light-touch, no-demolition fixes for a smaller home.",
    form: {
      profile_id: "home-rental",
      facing_direction: "East",
      entrance: "Northeast",
      notes: "Apartment rental, no structural changes or drilling. Need practical, low-cost suggestions for focus, sleep, and clutter flow.",
    },
    rooms: [
      { name: "bedroom", zone: "Southwest" },
      { name: "kitchen", zone: "Southeast" },
      { name: "living room", zone: "East" },
    ],
  },
  {
    id: "family-home",
    title: "Family home audit",
    subtitle: "Balanced guidance for routine, rest, and shared movement.",
    form: {
      profile_id: "home-family",
      facing_direction: "North",
      entrance: "East",
      notes: "Family home with children. Want room-by-room guidance for calmer mornings, better sleep, and less friction in shared spaces.",
    },
    rooms: [
      { name: "master bedroom", zone: "Southwest" },
      { name: "kitchen", zone: "Southeast" },
      { name: "study", zone: "North" },
      { name: "prayer room", zone: "Northeast" },
    ],
  },
  {
    id: "work-focus",
    title: "Work and study focus",
    subtitle: "Useful when the space needs more concentration than ceremony.",
    form: {
      profile_id: "home-work",
      facing_direction: "West",
      entrance: "North",
      notes: "Need a practical workspace audit for productivity, call quality, and lower distraction without major furniture changes.",
    },
    rooms: [
      { name: "office", zone: "North" },
      { name: "living room", zone: "West" },
      { name: "bedroom", zone: "Southwest" },
    ],
  },
];

const NOTE_STARTERS = [
  "No demolition, no structural work.",
  "Budget should stay low and changes should be reversible.",
  "Primary goal is better sleep and calmer mornings.",
  "Need one workspace that supports concentration and calls.",
];

const GUIDED_PATHS = [
  {
    id: "audit",
    title: "Run a practical audit",
    tag: "Fastest start",
    description: "Best when you want a room-by-room report with fixes you can actually do this week.",
    actionLabel: "Open audit form",
    starterId: "family-home",
    targetId: "vaastu-workbench",
  },
  {
    id: "renter",
    title: "Keep it renter-friendly",
    tag: "Low-disruption",
    description: "Use this when the space is temporary and every suggestion needs to stay reversible.",
    actionLabel: "Load renter preset",
    starterId: "renter-reset",
    targetId: "vaastu-workbench",
  },
  {
    id: "visual",
    title: "Explain it visually",
    tag: "Show, don’t tell",
    description: "Queue the visual walkthrough when you want the result translated into a more cinematic format.",
    actionLabel: "Jump to video queue",
    starterId: "work-focus",
    targetId: "vaastu-video",
  },
];

function validateFiles(fileList: FileList | null): string {
  if (!fileList) return "";
  for (const file of Array.from(fileList)) {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `"${file.name}" has unsupported type. Allowed: PDF, PNG, JPG, TXT.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `"${file.name}" exceeds the 20 MB size limit.`;
    }
  }
  return "";
}

function cloneRooms(rooms: RoomEntry[]): RoomEntry[] {
  return rooms.map((room) => ({ ...room }));
}

export default function VaastuPage() {
  const { track } = useAnalytics();
  const [form, setForm] = useState<FormValues>(initialValues);
  const [rooms, setRooms] = useState<RoomEntry[]>(DEFAULT_ROOMS);
  const [report, setReport] = useState<VaastuReport | null>(null);
  const [videoJob, setVideoJob] = useState<{ job_id: string; status: string } | null>(null);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStarterId, setActiveStarterId] = useState(STARTER_PRESETS[0].id);

  function update(field: keyof FormValues, event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function updateRoom(index: number, field: keyof RoomEntry, value: string) {
    setRooms((prev) => prev.map((room, currentIndex) => (currentIndex === index ? { ...room, [field]: value } : room)));
  }

  function addRoom(name = "", zone = "North") {
    setRooms((prev) => [...prev, { name, zone }]);
  }

  function removeRoom(index: number) {
    setRooms((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  function applyStarter(starterId: string) {
    const starter = STARTER_PRESETS.find((item) => item.id === starterId);
    if (!starter) return;
    setActiveStarterId(starter.id);
    setForm({ ...starter.form });
    setRooms(cloneRooms(starter.rooms));
    setError("");
    track("vaastu_starter_selected", { starter_id: starter.id });
  }

  function appendNote(note: string) {
    setForm((prev) => ({
      ...prev,
      notes: prev.notes.includes(note) ? prev.notes : `${prev.notes.trim()} ${note}`.trim(),
    }));
    track("vaastu_note_starter_used", { note });
  }

  function addSuggestedRoom(roomName: string) {
    const normalized = roomName.trim().toLowerCase();
    if (!normalized) return;
    if (rooms.some((room) => room.name.trim().toLowerCase() === normalized)) return;
    addRoom(roomName, ROOM_ZONE_SUGGESTIONS[normalized] ?? "North");
    track("vaastu_room_added", { room_name: normalized, source: "suggestion" });
  }

  function jumpToSection(starterId: string, targetId: string) {
    applyStarter(starterId);
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validate() {
    if (!form.profile_id || !form.facing_direction || !form.entrance) {
      return "Fill profile, facing direction, and entrance fields.";
    }
    for (const room of rooms) {
      if (!room.name.trim()) return "All room entries need a name.";
    }
    return "";
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const fileError = validateFiles(event.target.files);
    if (fileError) {
      setError(fileError);
      event.target.value = "";
      return;
    }
    setError("");
    setFiles(event.target.files);
    track("vaastu_uploads_selected", { count: event.target.files?.length ?? 0 });
  }

  function roomsPayload(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const room of rooms) {
      if (room.name.trim()) result[room.name.trim().toLowerCase()] = room.zone;
    }
    return result;
  }

  async function generateReport() {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setError("");
    setLoading(true);
    track("vaastu_report_requested", {
      facing_direction: form.facing_direction,
      entrance: form.entrance,
      room_count: rooms.length,
    });
    try {
      const data = await postJson<VaastuReport>("/v1/vaastu/report", {
        profile_id: form.profile_id,
        layout: {
          facing_direction: form.facing_direction,
          entrance: form.entrance,
          rooms: roomsPayload(),
          notes: form.notes,
        },
      });
      setReport(data);
      setVideoJob(null);
      track("vaastu_report_generated", {
        checklist_count: data.checklist.length,
        citation_count: data.citations.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate vaastu report");
      track("vaastu_report_failed", { message: err instanceof Error ? err.message : "unknown" });
    } finally {
      setLoading(false);
    }
  }

  async function queueVideo() {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setError("");
    setLoading(true);
    track("vaastu_video_requested", {
      facing_direction: form.facing_direction,
      upload_count: files?.length ?? 0,
    });
    try {
      const data = await postJson<{ job_id: string; status: string }>("/v1/video/vaastu", {
        profile_id: form.profile_id,
        topic: "vaastu",
        payload: {
          summary: form.notes,
          facing_direction: form.facing_direction,
          entrance: form.entrance,
          rooms: roomsPayload(),
          uploads: files ? Array.from(files).map((file) => file.name) : [],
        },
      });
      setVideoJob(data);
      setReport(null);
      track("vaastu_video_queued", { status: data.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue vaastu video");
      track("vaastu_video_failed", { message: err instanceof Error ? err.message : "unknown" });
    } finally {
      setLoading(false);
    }
  }

  const flexibilityLabel = /rental|no structural|no demolition|reversible|temporary/i.test(form.notes)
    ? "Light-touch remedies"
    : "Broader layout changes";
  const selectedUploadCount = files?.length ?? 0;
  const notesWordCount = form.notes.trim() ? form.notes.trim().split(/\s+/).length : 0;

  return (
    <main>
      <section className="feature-stage">
        <div className="feature-stage-grid">
          <div className="feature-stage-copy">
            <span className="feature-stage-kicker">Practical home energy guidance</span>
            <h1 className="feature-stage-title">Turn your space into a calmer daily environment.</h1>
            <p className="feature-stage-summary">
              Vaastu works best when it feels grounded and specific: what room is where, what cannot change, and what
              kind of life the home needs to support right now.
            </p>
            <div className="feature-stage-step-list">
              <div className="feature-stage-step">
                <strong>01</strong>
                <span>Choose the closest home situation so you do not start from a blank slate.</span>
              </div>
              <div className="feature-stage-step">
                <strong>02</strong>
                <span>Describe constraints clearly: rental limits, budget, focus, sleep, family flow, or work friction.</span>
              </div>
              <div className="feature-stage-step">
                <strong>03</strong>
                <span>Pick the written report for action, then queue the visual walkthrough if the space needs a second pass.</span>
              </div>
            </div>
          </div>

          <div className="feature-stage-panel">
            <div className="feature-path-grid">
              {GUIDED_PATHS.map((path) => (
                <button
                  key={path.id}
                  type="button"
                  className="feature-path-card"
                  onClick={() => jumpToSection(path.starterId, path.targetId)}
                >
                  <span className="feature-path-tag">{path.tag}</span>
                  <span className="feature-path-title">{path.title}</span>
                  <span className="feature-path-copy">{path.description}</span>
                  <span className="feature-path-link">{path.actionLabel}</span>
                </button>
              ))}
            </div>
            <div className="summary-stat-grid">
              <div className="summary-stat-card">
                <span className="summary-stat-label">Facing</span>
                <strong>{form.facing_direction}</strong>
              </div>
              <div className="summary-stat-card">
                <span className="summary-stat-label">Entrance</span>
                <strong>{form.entrance}</strong>
              </div>
              <div className="summary-stat-card">
                <span className="summary-stat-label">Rooms mapped</span>
                <strong>{rooms.length}</strong>
              </div>
              <div className="summary-stat-card">
                <span className="summary-stat-label">Approach</span>
                <strong>{flexibilityLabel}</strong>
              </div>
            </div>
            <div className="soft-note">
              The strongest Vaastu outcomes here come from clear constraints and realistic changes, not grand claims.
              This keeps the experience premium and believable.
            </div>
          </div>
        </div>
      </section>

      <div className="grid two" style={{ marginTop: 20, alignItems: "start" }}>
        <Surface title="Choose a starting layout">
          <p className="section-lead">
            Use a preset to get momentum, then tailor the rooms and notes to match the home exactly.
          </p>
          <div className="preset-row">
            {STARTER_PRESETS.map((starter) => (
              <button
                key={starter.id}
                type="button"
                className={`preset-card${starter.id === activeStarterId ? " active-preset" : ""}`}
                onClick={() => applyStarter(starter.id)}
              >
                <span className="preset-card-title">{starter.title}</span>
                <span className="feature-path-copy">{starter.subtitle}</span>
              </button>
            ))}
          </div>
          <div className="soft-note" style={{ marginTop: 14 }}>
            Recommended add-ons to the notes field:
          </div>
          <div className="mini-chip-row">
            {NOTE_STARTERS.map((note) => (
              <button key={note} type="button" className="mini-chip" onClick={() => appendNote(note)}>
                {note}
              </button>
            ))}
          </div>
          <div className="soft-note" style={{ marginTop: 14 }}>
            Helpful room shortcuts:
          </div>
          <div className="mini-chip-row">
            {Object.keys(ROOM_ZONE_SUGGESTIONS).map((room) => (
              <button key={room} type="button" className="mini-chip" onClick={() => addSuggestedRoom(room)}>
                Add {room}
              </button>
            ))}
          </div>
        </Surface>

        <Surface title="How to get a better reading">
          <div className="feature-stage-step-list">
            <div className="feature-stage-step">
              <strong>01</strong>
              <span>List only the rooms that really matter for the current problem instead of mapping the whole property at once.</span>
            </div>
            <div className="feature-stage-step">
              <strong>02</strong>
              <span>Put hard constraints in the notes field so the advice stays realistic: budget, landlord restrictions, family needs, shared spaces.</span>
            </div>
            <div className="feature-stage-step">
              <strong>03</strong>
              <span>Use optional uploads when a floor plan or room photo will help the visual explanation land better.</span>
            </div>
          </div>
          <div className="summary-stat-grid" style={{ marginTop: 16 }}>
            <div className="summary-stat-card">
              <span className="summary-stat-label">Notes depth</span>
              <strong>{notesWordCount} words</strong>
            </div>
            <div className="summary-stat-card">
              <span className="summary-stat-label">Uploads ready</span>
              <strong>{selectedUploadCount}</strong>
            </div>
            <div className="summary-stat-card">
              <span className="summary-stat-label">Best for</span>
              <strong>Rest, focus, flow</strong>
            </div>
            <div className="summary-stat-card">
              <span className="summary-stat-label">Format</span>
              <strong>Report or video</strong>
            </div>
          </div>
        </Surface>
      </div>

      <div id="vaastu-workbench" style={{ marginTop: 20 }}>
        <Surface title="Vaastu workbench">
          <p className="section-lead">
            Build the reading here. Keep it concrete and let the guidance stay rooted in what the home can actually support.
          </p>

          <div className="form" style={{ marginTop: 16 }}>
            <div className="form-grid">
              <Field label="Profile ID" input={<input className="input" value={form.profile_id} onChange={(event) => update("profile_id", event)} />} />
              <Field
                label="Facing Direction"
                input={
                  <select className="select" value={form.facing_direction} onChange={(event) => update("facing_direction", event)}>
                    {DIRECTION_OPTIONS.map((direction) => <option key={direction} value={direction}>{direction}</option>)}
                  </select>
                }
              />
              <Field
                label="Entrance Zone"
                input={
                  <select className="select" value={form.entrance} onChange={(event) => update("entrance", event)}>
                    {DIRECTION_OPTIONS.map((direction) => <option key={direction} value={direction}>{direction}</option>)}
                  </select>
                }
              />
            </div>

            <div>
              <label className="field-label">Room placements</label>
              <div className="feature-stage-step-list" style={{ marginTop: 10 }}>
                {rooms.map((room, index) => (
                  <div key={`${room.name}-${index}`} className="form-grid" style={{ alignItems: "center" }}>
                    <input
                      className="input"
                      placeholder="Room name"
                      value={room.name}
                      onChange={(event) => updateRoom(index, "name", event.target.value)}
                    />
                    <select className="select" value={room.zone} onChange={(event) => updateRoom(index, "zone", event.target.value)}>
                      {DIRECTION_OPTIONS.map((direction) => <option key={direction} value={direction}>{direction}</option>)}
                    </select>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => removeRoom(index)}
                      disabled={rooms.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="button secondary" style={{ marginTop: 10 }} onClick={() => addRoom()}>
                Add custom room
              </button>
            </div>

            <Field
              label="Notes and constraints"
              input={<textarea className="textarea" value={form.notes} onChange={(event) => update("notes", event)} />}
              help="Include what cannot change, what matters most, and what kind of life the home needs to support."
            />

            <Field
              label="Optional uploads"
              input={
                <input
                  className="input"
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  onChange={handleFileChange}
                />
              }
              help="PDF, PNG, JPG, TXT only. Max 20 MB per file."
            />

            <div className="button-row">
              <button className="button" type="button" data-testid="vaastu-submit" onClick={generateReport} disabled={loading}>
                {loading ? "Loading…" : "Generate Vaastu Report"}
              </button>
              <button className="button secondary" type="button" data-testid="vaastu-video-submit" onClick={queueVideo} disabled={loading}>
                {loading ? "Loading…" : "Queue Vaastu Video"}
              </button>
            </div>
          </div>
        </Surface>
      </div>

      {files?.length ? (
        <p className="small-muted" style={{ marginTop: 8 }}>
          Files selected: {Array.from(files).map((file) => file.name).join(", ")}
        </p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      {report ? <VaastuReportCard report={report} /> : null}

      {videoJob ? (
        <div id="vaastu-video">
          <Surface title="Visual walkthrough queued" style={{ marginTop: 16 }}>
            <p data-testid="vaastu-video-result"><strong>Job ID:</strong> {videoJob.job_id}</p>
            <p><strong>Status:</strong> {videoJob.status}</p>
            <p className="small-muted">
              This queue is best for stakeholders who need the same recommendations explained in a more visual, presentation-friendly format.
            </p>
          </Surface>
        </div>
      ) : (
        <div id="vaastu-video" />
      )}
    </main>
  );
}

function VaastuReportCard({ report }: { report: VaastuReport }) {
  return (
    <div data-testid="vaastu-report-result" style={{ marginTop: 16 }}>
      <div className="result-card">
        <div className="result-card-header">
          <h3>Vaastu analysis</h3>
        </div>
        <div className="result-card-body">
          <div className="result-section">
            <div className="result-section-label">Narrative</div>
            <div className="result-section-text">{report.report_markdown}</div>
          </div>
        </div>
      </div>

      {report.checklist.length > 0 ? (
        <Surface title="Action checklist" style={{ marginTop: 12 }}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {report.checklist.map((item, index) => (
              <li key={index} style={{ marginBottom: 6 }}>{item}</li>
            ))}
          </ul>
        </Surface>
      ) : null}

      {report.safety_notes.length > 0 ? (
        <Surface title="Safety notes" style={{ marginTop: 12 }}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {report.safety_notes.map((note, index) => (
              <li key={index} style={{ marginBottom: 6 }}>{note}</li>
            ))}
          </ul>
        </Surface>
      ) : null}

      {report.citations.length > 0 ? (
        <Surface title="Citations" style={{ marginTop: 12 }}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {report.citations.map((citation, index) => (
              <li key={index} style={{ marginBottom: 4 }}>
                <strong>{citation.title}</strong> — {citation.locator}
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}
    </div>
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
