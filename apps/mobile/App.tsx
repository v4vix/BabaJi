import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  Pressable,
  View,
  TextInput,
  Switch,
  ActivityIndicator,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const tabs = ["Home", "Kundli", "Vaastu", "Consult", "Insights", "Matchmaking", "Panchang"] as const;
type Tab = (typeof tabs)[number];

const defaultApiBase = Platform.select({
  ios: "http://localhost:8101",
  android: "http://10.0.2.2:8101",
  default: "http://localhost:8101",
});
const enableInsecureDemoAuth = ["1", "true"].includes(
  (process.env.EXPO_PUBLIC_ENABLE_INSECURE_DEMO_AUTH ?? "").toLowerCase(),
);

// ── Result renderers ──────────────────────────────────────────────────────────

function Badge({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <View style={[S.badge, ok === true ? S.badgeOk : ok === false ? S.badgeWarn : S.badgeMuted]}>
      <Text style={S.badgeLabel}>{label}</Text>
      <Text style={S.badgeValue}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={S.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BulletRow({ text, good }: { text: string; good?: boolean }) {
  const color = good === true ? "#16a34a" : good === false ? "#b45309" : "#334155";
  const dot = good === true ? "●" : good === false ? "●" : "·";
  return (
    <View style={{ flexDirection: "row", gap: 8, paddingVertical: 3 }}>
      <Text style={{ color, fontSize: 13, minWidth: 14 }}>{dot}</Text>
      <Text style={{ color, fontSize: 13, flex: 1 }}>{text}</Text>
    </View>
  );
}

function KundliCard({ data }: { data: Record<string, unknown> }) {
  const facts = data.deterministic_facts as Record<string, unknown> | undefined;
  const lagna = (facts?.lagna as Record<string, unknown>) ?? {};
  const planets = (facts?.planet_positions as Record<string, Record<string, unknown>>) ?? {};
  const dasha = ((facts?.vimshottari_timeline as unknown[]) ?? [])[0] as Record<string, unknown> | undefined;
  const panchang = (facts?.panchang as Record<string, unknown>) ?? {};
  const engine = (facts?.engine_mode as string) ?? "";
  const mode = (data.mode as string) ?? "";

  return (
    <View style={S.card}>
      <Text style={S.cardTitle}>Kundli Report</Text>

      {/* Engine + mode */}
      <View style={[S.engineBanner, engine === "swisseph" ? S.engineLive : S.engineFallback]}>
        <Text style={S.engineText}>
          {engine === "swisseph" ? "✓ Swiss Ephemeris" : "⚠ Approximate"}{" "}
          {mode ? `· ${mode}` : ""}
        </Text>
      </View>

      {/* Panchang badges */}
      <View style={S.badgeRow}>
        {(["tithi", "nakshatra", "yoga", "vara"] as const).map((k) =>
          panchang[k] ? <Badge key={k} label={k} value={String(panchang[k])} /> : null
        )}
        {lagna.sign ? <Badge key="lagna" label="Lagna" value={String(lagna.sign)} ok /> : null}
      </View>

      {/* Dasha */}
      {dasha && (
        <Section title="Current Mahadasha">
          <Text style={S.body}>{dasha.lord as string} Mahadasha · {dasha.start as string} → {dasha.end as string}</Text>
        </Section>
      )}

      {/* Key planets */}
      {Object.keys(planets).length > 0 && (
        <Section title="Planetary Positions">
          {Object.entries(planets).slice(0, 9).map(([name, pos]) => (
            <View key={name} style={S.tableRow}>
              <Text style={[S.tableCell, { fontWeight: "700", minWidth: 80 }]}>{name}</Text>
              <Text style={S.tableCell}>{pos.sign as string} H{pos.house as number}</Text>
              <Text style={[S.tableCell, { color: "#64748b" }]}>{(pos.degree as number).toFixed(1)}°</Text>
            </View>
          ))}
        </Section>
      )}

      {/* Narrative */}
      {data.narrative ? (
        <Section title="Reading">
          <Text style={S.body}>{data.narrative as string}</Text>
        </Section>
      ) : null}

      {/* Disclaimer */}
      <Text style={S.disclaimer}>{(data.disclaimers as string[])?.[0] ?? ""}</Text>
    </View>
  );
}

function VaastuCard({ data }: { data: Record<string, unknown> }) {
  const checklist = (data.checklist as string[]) ?? [];
  const safetyNotes = (data.safety_notes as string[]) ?? [];
  return (
    <View style={S.card}>
      <Text style={S.cardTitle}>Vaastu Report</Text>
      {data.report_markdown ? (
        <Section title="Analysis">
          <Text style={S.body}>{(data.report_markdown as string).replace(/[#*`]/g, "")}</Text>
        </Section>
      ) : null}
      {checklist.length > 0 && (
        <Section title="Checklist">
          {checklist.map((item, i) => <BulletRow key={i} text={item} />)}
        </Section>
      )}
      <Text style={S.disclaimer}>{safetyNotes[0] ?? ""}</Text>
    </View>
  );
}

function ConsultCard({ data }: { data: Record<string, unknown> }) {
  return (
    <View style={S.card}>
      <Text style={S.cardTitle}>Consult Session Created</Text>
      <View style={S.badgeRow}>
        <Badge label="Session" value={String(data.session_id ?? "")} ok />
        <Badge label="Retention" value={String(data.retention_policy ?? "")} />
      </View>
      <Section title="RTC URL">
        <Text style={[S.body, { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12 }]}>
          {String(data.rtc_url ?? "")}
        </Text>
      </Section>
      <Section title="Token Hint">
        <Text style={[S.body, { color: "#64748b", fontSize: 12 }]}>{String(data.token_hint ?? "")}</Text>
      </Section>
    </View>
  );
}

function InsightCard({ data, mode }: { data: Record<string, unknown>; mode: string }) {
  if (mode === "tarot") {
    const cards = (data.cards as Array<Record<string, unknown>>) ?? [];
    return (
        <View style={S.card}>
          <Text style={S.cardTitle}>Tarot Reading</Text>
          {cards.map((c, i) => (
            <View key={i} style={S.innerCard}>
              <Text style={S.innerCardTitle}>{c.position as string} · {c.card as string}</Text>
              <Text style={S.body}>{c.meaning as string}</Text>
            </View>
          ))}
        <Text style={S.disclaimer}>{String(data.disclaimer ?? "")}</Text>
      </View>
    );
  }
  if (mode === "numerology") {
    return (
        <View style={S.card}>
          <Text style={S.cardTitle}>Numerology Report</Text>
          <View style={S.badgeRow}>
            <Badge label="Life Path" value={String(data.life_path_number ?? "")} ok />
            <Badge label="Expression" value={String(data.expression_number ?? "")} />
          </View>
          {data.interpretation ? <Text style={[S.body, { marginTop: 10 }]}>{data.interpretation as string}</Text> : null}
          <Text style={S.disclaimer}>{String(data.disclaimer ?? "")}</Text>
        </View>
      );
  }
  if (mode === "mantra") {
    const steps = (data.practice_steps as string[]) ?? [];
      return (
        <View style={S.card}>
          <Text style={S.cardTitle}>Mantra Plan</Text>
          {data.suggested_mantra ? (
            <View style={S.mantraBlock}>
              <Text style={S.mantraText}>{data.suggested_mantra as string}</Text>
            </View>
          ) : null}
        {steps.length > 0 && (
          <Section title="Practice Steps">
            {steps.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, paddingVertical: 3 }}>
                <Text style={{ color: "#005f73", fontWeight: "700", minWidth: 20 }}>{i + 1}.</Text>
                <Text style={S.body}>{s}</Text>
              </View>
            ))}
          </Section>
        )}
        <Text style={S.disclaimer}>{String(data.disclaimer ?? "")}</Text>
      </View>
    );
  }
  if (mode === "rashifal") {
      return (
        <View style={S.card}>
          <Text style={S.cardTitle}>Rashifal · {String(data.sign ?? "")}</Text>
          <Text style={S.body}>{String(data.insight ?? "")}</Text>
          {Array.isArray(data.influence_panel) && data.influence_panel.length > 0 ? (
            <Section title="Influences">
              {(data.influence_panel as string[]).map((item, i) => <BulletRow key={i} text={item} />)}
            </Section>
          ) : null}
          <Text style={S.disclaimer}>{String(data.disclaimer ?? "")}</Text>
        </View>
      );
  }
  if (mode === "gem") {
    const steps = (data.due_diligence_checklist as string[]) ?? [];
    const cautions = (data.disclaimers as string[]) ?? [];
    return (
      <View style={S.card}>
        <Text style={S.cardTitle}>Gem Guidance</Text>
        {data.recommendation ? <Text style={S.body}>{String(data.recommendation)}</Text> : null}
        {steps.length > 0 && (
          <Section title="Due Diligence">
            {steps.map((s, i) => <BulletRow key={i} text={s} good />)}
          </Section>
        )}
        {cautions.length > 0 && (
          <Section title="Cautions">
            {cautions.map((c, i) => <BulletRow key={i} text={c} good={false} />)}
          </Section>
        )}
        <Text style={S.disclaimer}>{String(data.disclaimer ?? "")}</Text>
      </View>
    );
  }
  // generic fallback
  return (
    <View style={S.card}>
      <Text style={S.cardTitle}>Insight Result</Text>
      <Text style={S.body}>{JSON.stringify(data, null, 2)}</Text>
    </View>
  );
}

function MatchmakingCard({ data, seekerName, partnerName }: { data: Record<string, unknown>; seekerName: string; partnerName: string }) {
  const score = (data.compatibility_score as number) ?? 0;
  const scoreColor = score >= 70 ? "#16a34a" : score >= 50 ? "#b45309" : "#dc2626";
  const scoreLabel = score >= 70 ? "Excellent" : score >= 50 ? "Good" : "Needs Review";
  const strengths = (data.strengths as string[]) ?? [];
  const watchouts = (data.watchouts as string[]) ?? [];
  const paths = (data.compatibility_paths as string[]) ?? [];
  const kootaLines = paths.filter(p => p.includes(":"));
  return (
    <View style={S.card}>
      <Text style={S.cardTitle}>{seekerName} &amp; {partnerName}</Text>
      {/* Score ring substitute */}
      <View style={S.scoreWrap}>
        <Text style={[S.scoreNum, { color: scoreColor }]}>{score}</Text>
        <Text style={[S.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
        <Text style={{ color: "#64748b", fontSize: 12 }}>Guna Milan Score /100</Text>
      </View>

      {kootaLines.length > 0 && (
        <Section title="8-Koota Breakdown">
          {kootaLines.map((line, i) => {
            const [name, rest] = line.split(":").map(s => s.trim());
            return (
              <View key={i} style={S.tableRow}>
                <Text style={[S.tableCell, { fontWeight: "700", flex: 1 }]}>{name}</Text>
                <Text style={S.tableCell}>{rest}</Text>
              </View>
            );
          })}
        </Section>
      )}
      {strengths.length > 0 && (
        <Section title="Strengths">
          {strengths.map((s, i) => <BulletRow key={i} text={s} good />)}
        </Section>
      )}
      {watchouts.length > 0 && (
        <Section title="Watchouts">
          {watchouts.map((w, i) => <BulletRow key={i} text={w} good={false} />)}
        </Section>
      )}
      <Text style={S.disclaimer}>{String(data.disclaimer ?? "")}</Text>
    </View>
  );
}

function PanchangCard({ data }: { data: Record<string, unknown> }) {
  const windows = (data.windows as Array<Record<string, unknown>>) ?? [];
  if (data.tithi) {
    // daily panchang
    return (
      <View style={S.card}>
        <Text style={S.cardTitle}>Panchang · {String(data.date ?? "")}</Text>
        <View style={S.badgeRow}>
          {(["tithi","nakshatra","yoga","karana","vara"] as const).map(k =>
            data[k] ? <Badge key={k} label={k} value={String(data[k])} /> : null
          )}
        </View>
        {(data.notes as string[])?.length > 0 && (
          <Section title="Notes">
            {(data.notes as string[]).map((n, i) => <BulletRow key={i} text={n} />)}
          </Section>
        )}
        <Text style={S.disclaimer}>{String(data.disclaimer ?? "")}</Text>
      </View>
    );
  }
  // muhurta windows
  return (
    <View style={S.card}>
      <Text style={S.cardTitle}>Muhurta Windows · {String(data.intent ?? "")}</Text>
      {windows.map((w, i) => {
        const score = w.score as number;
        const scoreColor = score >= 75 ? "#16a34a" : score >= 65 ? "#b45309" : "#dc2626";
        const why = (w.why as string[]) ?? [];
        const whyNot = (w.why_not as string[]) ?? [];
        return (
          <View key={i} style={S.innerCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={S.innerCardTitle}>Window {i + 1}</Text>
              <Text style={{ fontWeight: "700", color: scoreColor }}>{score}/100</Text>
            </View>
            <Text style={{ color: "#64748b", fontSize: 12 }}>
              {new Date(w.start as string).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              {" → "}
              {new Date(w.end as string).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </Text>
            {why.map((item, j) => <BulletRow key={j} text={item} good />)}
            {whyNot.map((item, j) => <BulletRow key={j} text={item} good={false} />)}
          </View>
        );
      })}
      <Text style={S.disclaimer}>{String(data.disclaimer ?? "")}</Text>
    </View>
  );
}

function ResultCard({
  raw,
  tab,
  insightMode,
  seekerName,
  partnerName,
}: {
  raw: string;
  tab: Tab;
  insightMode: string;
  seekerName: string;
  partnerName: string;
}) {
  let parsed: Record<string, unknown> | null = null;
  try { parsed = JSON.parse(raw); } catch { /* raw text */ }

  if (!parsed) {
    return <Text style={S.rawResult}>{raw}</Text>;
  }

  switch (tab) {
    case "Kundli":      return <KundliCard data={parsed} />;
    case "Vaastu":      return <VaastuCard data={parsed} />;
    case "Consult":     return <ConsultCard data={parsed} />;
    case "Insights":    return <InsightCard data={parsed} mode={insightMode} />;
    case "Matchmaking": return <MatchmakingCard data={parsed} seekerName={seekerName} partnerName={partnerName} />;
    case "Panchang":    return <PanchangCard data={parsed} />;
    default:
      return (
        <View style={S.card}>
          <Text style={S.cardTitle}>Response</Text>
          <Text style={S.body}>{JSON.stringify(parsed, null, 2)}</Text>
        </View>
      );
  }
}

// ── Main App ─────────────────────────────────────────────────────────────────

// ── Device auth (Bearer token) ────────────────────────────────────────────────
// On first launch, registers the device and stores the device_key in memory.
// (Use expo-secure-store in production for persistent, encrypted storage.)
// Before each API call, exchanges device_key for a short-lived signed token.

type TokenCache = { token: string; expiresAt: number };

export default function App() {
  const [tab, setTab] = useState<Tab>("Home");
  const [apiBase, setApiBase] = useState(defaultApiBase ?? "http://localhost:8101");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  // Device auth state
  const deviceKeyRef = useRef<string | null>(null);
  const deviceUserRef = useRef<string>("mobile-demo");
  const tokenCacheRef = useRef<TokenCache | null>(null);

  async function ensureDeviceKey(userId: string): Promise<void> {
    if (deviceKeyRef.current && deviceUserRef.current === userId) return;
    try {
      const res = await fetch(`${apiBase}/v1/auth/device-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) return;
      const data = await res.json() as { device_key: string };
      deviceKeyRef.current = data.device_key;
      deviceUserRef.current = userId;
      tokenCacheRef.current = null;  // invalidate cached token
    } catch { /* dev mode without server — tolerated */ }
  }

  async function getToken(userId: string): Promise<string | null> {
    const now = Date.now() / 1000;
    if (tokenCacheRef.current && now < tokenCacheRef.current.expiresAt) {
      return tokenCacheRef.current.token;
    }
    const devKey = deviceKeyRef.current;
    if (!devKey) return null;
    try {
      const res = await fetch(`${apiBase}/v1/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, device_key: devKey }),
      });
      if (!res.ok) return null;
      const data = await res.json() as { token: string; expires_in: number };
      tokenCacheRef.current = { token: data.token, expiresAt: now + data.expires_in - 10 };
      return data.token;
    } catch { return null; }
  }

  // Register device on mount and whenever the profile ID changes
  useEffect(() => {
    ensureDeviceKey(profileId);
    registerPushToken(profileId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function registerPushToken(userId: string): Promise<void> {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (existing !== "granted") {
        const { status: asked } = await Notifications.requestPermissionsAsync();
        status = asked;
      }
      if (status !== "granted") return;
      const tokenData = await Notifications.getExpoPushTokenAsync();
      await fetch(`${apiBase}/v1/push/register-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, token: tokenData.data, platform: "expo" }),
      });
    } catch { /* push is best-effort */ }
  }

  const [profileId, setProfileId] = useState("mobile-demo");
  const [question, setQuestion] = useState("What should I focus on this week?");
  const [birthDate, setBirthDate] = useState("1994-02-10");
  const [birthTime, setBirthTime] = useState("08:40");
  const [location, setLocation] = useState("Delhi");

  const [facingDirection, setFacingDirection] = useState("East");
  const [entrance, setEntrance] = useState("Northeast");
  const [rooms, setRooms] = useState("bedroom:Southwest,kitchen:Southeast,study:North");
  const [vaastuNotes, setVaastuNotes] = useState("Need practical changes without structural modification");

  const [mode, setMode] = useState<"chat" | "voice" | "video">("video");
  const [consentRecording, setConsentRecording] = useState(true);
  const [consentTranscription, setConsentTranscription] = useState(true);
  const [consentMemory, setConsentMemory] = useState(true);

  const [insightMode, setInsightMode] = useState<"tarot" | "numerology" | "mantra" | "rashifal" | "gem">("tarot");
  const [insightInputA, setInsightInputA] = useState("How should I prioritize this month?");
  const [insightInputB, setInsightInputB] = useState("Leo");
  const [partnerBirthDate, setPartnerBirthDate] = useState("1991-08-24");
  const [panchangDate, setPanchangDate] = useState("2026-02-27");
  const [muhurtaIntent, setMuhurtaIntent] = useState("marriage");

  const tabDescription = useMemo(() => {
    switch (tab) {
      case "Kundli":      return "Generate a full birth chart reading with planetary positions and dasha timeline.";
      case "Vaastu":      return "Submit layout details and get a direction/room-aware Vaastu report.";
      case "Consult":     return "Create consent-bound live consult sessions with retention information.";
      case "Insights":    return "Run tarot, numerology, mantra, rashifal, and gem guidance tools.";
      case "Matchmaking": return "Dual-profile compatibility analysis with Guna Milan score and koota breakdown.";
      case "Panchang":    return "Daily panchang and muhurta windows with explainability.";
      default:            return "Use this mobile console to test full input-driven service workflows.";
    }
  }, [tab]);

  async function post(path: string, body: unknown) {
    setError("");
    setLoading(true);
    try {
      await ensureDeviceKey(profileId);
      const token = await getToken(profileId);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else if (enableInsecureDemoAuth) {
        headers["X-Plan"] = "free";
        headers["X-User-Id"] = profileId;
      } else {
        throw new Error("Signed auth is unavailable. Configure API_SECRET on the API or enable EXPO_PUBLIC_ENABLE_INSECURE_DEMO_AUTH=1 for local demo mode.");
      }
      const response = await fetch(`${apiBase}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || `${response.status} ${response.statusText}`);
      setResult(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function parseRooms(input: string): Record<string, string> {
    const map: Record<string, string> = {};
    input.split(",").map(e => e.trim()).filter(Boolean).forEach(entry => {
      const [key, value] = entry.split(":");
      if (key && value) map[key.trim()] = value.trim();
    });
    return map;
  }

  async function runCurrentTab() {
    setResult("");
    if (tab === "Home") {
      setError(""); setLoading(true);
      try {
        const resp = await fetch(`${apiBase}/healthz`);
        const text = await resp.text();
        if (!resp.ok) throw new Error(text || `${resp.status}`);
        setResult(text);
      } catch (err) { setError(err instanceof Error ? err.message : "Health check failed"); }
      finally { setLoading(false); }
      return;
    }
    if (tab === "Kundli") {
      await post("/v1/kundli/report", {
        profile_id: profileId,
        birth: { date: birthDate, time: birthTime, timezone: "Asia/Kolkata", location, latitude: 28.6139, longitude: 77.209 },
        question,
      });
    } else if (tab === "Vaastu") {
      await post("/v1/vaastu/report", {
        profile_id: profileId,
        layout: { facing_direction: facingDirection, entrance, rooms: parseRooms(rooms), notes: vaastuNotes },
      });
    } else if (tab === "Consult") {
      await post("/v1/consult/realtime/session", {
        profile_id: profileId, mode,
        consent_recording: consentRecording,
        consent_transcription: consentTranscription,
        consent_memory: consentMemory,
      });
    } else if (tab === "Insights") {
      if (insightMode === "tarot")
        await post("/v1/tarot/read", { profile_id: profileId, spread: "three-card", intention: insightInputA });
      else if (insightMode === "numerology")
        await post("/v1/numerology/report", { profile_id: profileId, full_name: insightInputA, birth_date: birthDate });
      else if (insightMode === "mantra")
        await post("/v1/mantra/plan", { profile_id: profileId, focus_area: insightInputA, minutes_per_day: 15, days_per_week: 5 });
      else if (insightMode === "rashifal")
        await post("/v1/rashifal/personalized", { profile_id: profileId, sign: insightInputB, horizon: "daily" });
      else
        await post("/v1/gem/guidance", { profile_id: profileId, primary_planet: insightInputB, budget_band: "mid-range", intention: insightInputA });
    } else if (tab === "Matchmaking") {
      await post("/v1/matchmaking/compare", {
        seeker: { profile_id: profileId, name: "Seeker", birth: { date: birthDate, time: birthTime, timezone: "Asia/Kolkata", location, latitude: 28.6139, longitude: 77.209 } },
        partner: { profile_id: `${profileId}-partner`, name: "Partner", birth: { date: partnerBirthDate, time: "18:30", timezone: "Asia/Kolkata", location: "Pune", latitude: 18.5204, longitude: 73.8567 } },
        rubric: "guna-milan-core",
      });
    } else if (tab === "Panchang") {
      await post("/v1/muhurta/pick", {
        profile_id: profileId, intent: muhurtaIntent,
        date_from: panchangDate, date_to: panchangDate,
        timezone: "Asia/Kolkata", constraints: ["mobile run"],
      });
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f3ea" }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#005f73" }}>BabaJi Mobile</Text>
        <Text style={{ color: "#334155" }}>{tabDescription}</Text>

        <Field label="API Base URL">
          <TextInput value={apiBase} onChangeText={setApiBase} style={S.input} autoCapitalize="none" />
        </Field>
        <Field label="Profile ID">
          <TextInput value={profileId} onChangeText={setProfileId} style={S.input} />
        </Field>

        {/* Tab selector */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {tabs.map((item) => (
            <Pressable
              key={item}
              onPress={() => { setTab(item); setResult(""); setError(""); }}
              style={{ borderRadius: 999, backgroundColor: tab === item ? "#005f73" : "#e7ecef", paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Text style={{ color: tab === item ? "#fff" : "#1f2933", fontWeight: "600" }}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {/* Tab-specific inputs */}
        {tab === "Kundli" && (
          <>
            <Field label="Birth Date (YYYY-MM-DD)"><TextInput value={birthDate} onChangeText={setBirthDate} style={S.input} /></Field>
            <Field label="Birth Time (HH:MM)"><TextInput value={birthTime} onChangeText={setBirthTime} style={S.input} /></Field>
            <Field label="Location"><TextInput value={location} onChangeText={setLocation} style={S.input} /></Field>
            <Field label="Question"><TextInput value={question} onChangeText={setQuestion} style={[S.input, S.textArea]} multiline /></Field>
          </>
        )}
        {tab === "Vaastu" && (
          <>
            <Field label="Facing Direction"><TextInput value={facingDirection} onChangeText={setFacingDirection} style={S.input} /></Field>
            <Field label="Entrance"><TextInput value={entrance} onChangeText={setEntrance} style={S.input} /></Field>
            <Field label="Rooms (key:direction,...)"><TextInput value={rooms} onChangeText={setRooms} style={S.input} /></Field>
            <Field label="Notes"><TextInput value={vaastuNotes} onChangeText={setVaastuNotes} style={[S.input, S.textArea]} multiline /></Field>
          </>
        )}
        {tab === "Consult" && (
          <>
            <Field label="Mode">
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["chat","voice","video"] as const).map(m => (
                  <Pressable key={m} onPress={() => setMode(m)} style={[S.chip, { backgroundColor: mode === m ? "#0a9396" : "#e5e7eb" }]}>
                    <Text style={{ color: mode === m ? "white" : "#111827", fontWeight: "700" }}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>
            <ToggleRow label="Consent recording" value={consentRecording} onChange={setConsentRecording} />
            <ToggleRow label="Consent transcription" value={consentTranscription} onChange={setConsentTranscription} />
            <ToggleRow label="Consent memory" value={consentMemory} onChange={setConsentMemory} />
          </>
        )}
        {tab === "Insights" && (
          <>
            <Field label="Insight Tool">
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {(["tarot","numerology","mantra","rashifal","gem"] as const).map(v => (
                  <Pressable key={v} onPress={() => setInsightMode(v)} style={[S.chip, { backgroundColor: insightMode === v ? "#ca6702" : "#e5e7eb" }]}>
                    <Text style={{ color: insightMode === v ? "white" : "#111827", fontWeight: "700" }}>{v}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>
            <Field label={insightMode === "rashifal" || insightMode === "gem" ? "Planet / Sign" : "Primary Input"}>
              <TextInput value={insightInputB} onChangeText={setInsightInputB} style={S.input} />
            </Field>
            <Field label="Question / Intention / Name">
              <TextInput value={insightInputA} onChangeText={setInsightInputA} style={[S.input, S.textArea]} multiline />
            </Field>
          </>
        )}
        {tab === "Matchmaking" && (
          <>
            <Field label="Seeker Birth Date"><TextInput value={birthDate} onChangeText={setBirthDate} style={S.input} /></Field>
            <Field label="Partner Birth Date"><TextInput value={partnerBirthDate} onChangeText={setPartnerBirthDate} style={S.input} /></Field>
          </>
        )}
        {tab === "Panchang" && (
          <>
            <Field label="Date (YYYY-MM-DD)"><TextInput value={panchangDate} onChangeText={setPanchangDate} style={S.input} /></Field>
            <Field label="Muhurta Intent"><TextInput value={muhurtaIntent} onChangeText={setMuhurtaIntent} style={S.input} /></Field>
          </>
        )}

        <Pressable onPress={runCurrentTab} style={S.button} disabled={loading}>
          <Text style={{ color: "white", fontWeight: "700" }}>
            {loading ? "Loading…" : tab === "Home" ? "Run Health Check" : `Run ${tab}`}
          </Text>
        </Pressable>

        {loading && <ActivityIndicator color="#005f73" />}
        {error ? <Text style={S.error}>{error}</Text> : null}
        {result ? (
          <ResultCard
            raw={result}
            tab={tab}
            insightMode={insightMode}
            seekerName="Seeker"
            partnerName="Partner"
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "700", color: "#111827" }}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 }}>
      <Text style={{ color: "#111827", fontWeight: "600" }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  input: { borderRadius: 10, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "white", paddingHorizontal: 10, paddingVertical: 9 },
  textArea: { minHeight: 90, textAlignVertical: "top" as const },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  button: { borderRadius: 12, backgroundColor: "#005f73", paddingHorizontal: 14, paddingVertical: 11, alignItems: "center" as const },
  error: { backgroundColor: "#fee2e2", color: "#991b1b", borderWidth: 1, borderColor: "#fecaca", borderRadius: 10, padding: 10 },
  rawResult: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 10, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12 },

  // cards
  card: { backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, gap: 8, marginTop: 8 },
  cardTitle: { fontSize: 17, fontWeight: "700" as const, color: "#005f73" },
  innerCard: { backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", padding: 10, marginTop: 6 },
  innerCardTitle: { fontWeight: "700" as const, color: "#0c4a6e", marginBottom: 4 },

  // engine banner
  engineBanner: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start" as const },
  engineLive: { backgroundColor: "#dcfce7" },
  engineFallback: { backgroundColor: "#fef9c3" },
  engineText: { fontSize: 12, fontWeight: "600" as const },

  // badge row
  badgeRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6, marginTop: 6 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeOk: { backgroundColor: "#dcfce7" },
  badgeWarn: { backgroundColor: "#fef3c7" },
  badgeMuted: { backgroundColor: "#f1f5f9" },
  badgeLabel: { fontSize: 10, color: "#64748b", textTransform: "capitalize" as const },
  badgeValue: { fontSize: 13, fontWeight: "700" as const, color: "#0f172a" },

  // text
  sectionTitle: { fontSize: 13, fontWeight: "700" as const, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 },
  body: { fontSize: 13, color: "#334155", lineHeight: 20 },
  disclaimer: { fontSize: 11, color: "#94a3b8", fontStyle: "italic" as const, marginTop: 8 },

  // table rows
  tableRow: { flexDirection: "row" as const, paddingVertical: 3 },
  tableCell: { fontSize: 12, color: "#334155", flex: 1 },

  // score
  scoreWrap: { alignItems: "center" as const, paddingVertical: 12 },
  scoreNum: { fontSize: 48, fontWeight: "800" as const },
  scoreLabel: { fontSize: 14, fontWeight: "700" as const },

  // mantra
  mantraBlock: { backgroundColor: "#0f172a", borderRadius: 10, padding: 14, marginTop: 4 },
  mantraText: { color: "#f8fafc", fontSize: 18, textAlign: "center" as const, fontWeight: "700" as const },
};
