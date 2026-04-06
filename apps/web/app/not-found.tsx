import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🔮</div>
      <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 900, color: "#0f172a", margin: "0 0 12px" }}>
        This path doesn&apos;t exist
      </h1>
      <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: 400, margin: "0 auto 32px", lineHeight: 1.7 }}>
        The page you&apos;re looking for has moved, been removed, or never existed. The stars still align elsewhere.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href="/"
          style={{
            background: "linear-gradient(135deg,#005f73,#0a9396)",
            color: "#fff", fontWeight: 700, padding: "12px 28px",
            borderRadius: 999, textDecoration: "none", fontSize: 15,
          }}
        >
          Return home
        </Link>
        <Link
          href="/kundli"
          style={{
            border: "1.5px solid #e2e8f0", color: "#475569", fontWeight: 600, padding: "12px 24px",
            borderRadius: 999, textDecoration: "none", fontSize: 15, background: "#fff",
          }}
        >
          Open Kundli
        </Link>
      </div>

      <div style={{ marginTop: 60 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>Quick links</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { href: "/kundli", label: "🔮 Kundli" },
            { href: "/panchang", label: "📅 Panchang" },
            { href: "/insights", label: "✨ Insights" },
            { href: "/pricing", label: "💳 Pricing" },
            { href: "/faq", label: "❓ FAQ" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "7px 14px", borderRadius: 999, border: "1px solid #e2e8f0",
                fontSize: 13, textDecoration: "none", color: "#475569", background: "#f8fafc",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
