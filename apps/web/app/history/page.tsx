"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Surface } from "@cortex/ui";
import { getUserToken, getStoredUser } from "../../lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

type ReportItem = {
  id: string;
  user_id: string;
  report_type: string;
  title: string;
  created_at: string;
};

const TYPE_META: Record<string, { emoji: string; color: string }> = {
  kundli:      { emoji: "🔮", color: "#0a9396" },
  vaastu:      { emoji: "🏠", color: "#ca6702" },
  panchang:    { emoji: "📅", color: "#6366f1" },
  matchmaking: { emoji: "💫", color: "#db2777" },
  consult:     { emoji: "💬", color: "#059669" },
};

function SkeletonRows() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
      {[0.9, 0.7, 0.5].map((op, i) => (
        <div key={i} className="skeleton-row" style={{ opacity: op }}>
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <div className="skeleton" style={{ height: 14, width: "52%" }} />
            <div className="skeleton" style={{ height: 12, width: "30%" }} />
          </div>
          <div className="skeleton" style={{ width: 56, height: 30, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getStoredUser();
    const token = getUserToken();
    if (!user || !token) {
      setError("signed-out");
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/v1/reports/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: { reports: ReportItem[] }) => setReports(data.reports ?? []))
      .catch(() => setError("load-failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <Surface title="Report History">
        {loading && <SkeletonRows />}

        {error === "signed-out" && (
          <div className="empty-state">
            <div className="empty-state-icon">🔐</div>
            <h3>Sign in to see your history</h3>
            <p>Your saved reports will appear here after you sign in.</p>
            <Link href="/login" className="button" style={{ fontSize: 14, padding: "9px 24px" }}>
              Sign In
            </Link>
          </div>
        )}

        {error === "load-failed" && (
          <p className="error">Could not load reports. Check your connection and try again.</p>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">✨</div>
            <h3>No reports yet</h3>
            <p>Generate your first reading and it will be saved here automatically.</p>
            <Link href="/kundli" className="button" style={{ fontSize: 14, padding: "9px 24px" }}>
              Generate Free Kundli
            </Link>
          </div>
        )}

        {reports.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {reports.map((r) => {
              const meta = TYPE_META[r.report_type] ?? { emoji: "📄", color: "#64748b" };
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "13px 16px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    background: "white",
                    transition: "border-color 0.15s",
                  }}
                >
                  {/* Emoji icon */}
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 11,
                      background: `${meta.color}12`,
                      border: `1px solid ${meta.color}22`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {meta.emoji}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#1a1a2e",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.title}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: meta.color,
                          textTransform: "capitalize",
                          marginRight: 6,
                        }}
                      >
                        {r.report_type}
                      </span>
                      {new Date(r.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </div>
                  </div>

                  <Link
                    href={`/history/${r.id}`}
                    className="button secondary"
                    style={{ fontSize: 12, padding: "6px 14px", flexShrink: 0 }}
                  >
                    View →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Surface>
    </main>
  );
}
