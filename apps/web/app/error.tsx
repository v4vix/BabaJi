"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>⚠️</div>
      <h1 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 900, color: "#0f172a", margin: "0 0 12px" }}>
        Something went wrong
      </h1>
      <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: 420, margin: "0 auto 32px", lineHeight: 1.7 }}>
        An unexpected error occurred. This has been logged. Please try again — or contact support if the issue persists.
      </p>
      {error.digest && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 24, fontFamily: "monospace" }}>
          Error ID: {error.digest}
        </div>
      )}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "linear-gradient(135deg,#005f73,#0a9396)", color: "#fff", fontWeight: 700,
            padding: "12px 28px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 15,
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            border: "1.5px solid #e2e8f0", color: "#475569", fontWeight: 600, padding: "12px 24px",
            borderRadius: 999, textDecoration: "none", fontSize: 15, background: "#fff",
          }}
        >
          Return home
        </Link>
      </div>
      <div style={{ marginTop: 32 }}>
        <a href="mailto:support@babaji.app" style={{ fontSize: 13, color: "#0a9396", fontWeight: 600 }}>
          Contact support →
        </a>
      </div>
    </main>
  );
}
