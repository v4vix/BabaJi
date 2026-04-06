"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Surface } from "@cortex/ui";
import { getUserToken, getStoredUser } from "../../../lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getStoredUser();
    const token = getUserToken();
    if (!user || !token) {
      router.push("/login");
      return;
    }
    fetch(`${API_BASE}/v1/reports/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Report not found" : "Failed to load report");
        return r.json() as Promise<Record<string, unknown>>;
      })
      .then(setReport)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return <main><p className="small-muted" style={{ padding: 20 }}>Loading…</p></main>;
  if (error) return <main><p className="error" style={{ padding: 20 }}>{error} · <Link href="/history">← Back</Link></p></main>;
  if (!report) return null;

  const content = report.content as Record<string, unknown> | undefined;
  const narrative = typeof content?.narrative === "string" ? content.narrative : null;
  const reportMarkdown = typeof content?.report_markdown === "string" ? content.report_markdown : null;
  const checklist = Array.isArray(content?.checklist) ? (content.checklist as string[]) : [];
  const disclaimers = Array.isArray(content?.disclaimers) ? (content.disclaimers as string[]) : [];

  return (
    <main>
      <div style={{ marginBottom: 12 }}>
        <Link href="/history" style={{ fontSize: 13, color: "#64748b" }}>← Report History</Link>
      </div>

      <Surface title={`${String(report.report_type ?? "").toUpperCase()} Report`}>
        <p className="small-muted">
          {new Date(String(report.created_at ?? "")).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
        </p>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "8px 0 16px" }}>{String(report.title ?? "")}</h2>

        {/* Narrative / markdown */}
        {narrative && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Reading</h3>
            <p style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{narrative}</p>
          </div>
        )}

        {reportMarkdown && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Analysis</h3>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7 }}>{reportMarkdown}</pre>
          </div>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Checklist</h3>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {checklist.map((item, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimers */}
        {disclaimers.length > 0 && (
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16, lineHeight: 1.5 }}>
            {disclaimers[0]}
          </p>
        )}

        {/* Raw JSON fallback for unexpected report types */}
        {!narrative && !reportMarkdown && (
          <pre style={{ fontSize: 12, background: "#f8fafc", padding: 12, borderRadius: 8, overflow: "auto" }}>
            {JSON.stringify(content ?? report, null, 2)}
          </pre>
        )}
      </Surface>
    </main>
  );
}
