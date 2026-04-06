"use client";

import Link from "next/link";
import { Surface } from "@cortex/ui";

export default function BillingCancelPage() {
  return (
    <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 16px" }}>
      <Surface title="Checkout Cancelled">
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🕉️</div>
          <h2 style={{ margin: "0 0 8px", color: "#334155" }}>No changes made</h2>
          <p style={{ color: "#64748b", margin: "0 0 24px", lineHeight: 1.6 }}>
            Your checkout was cancelled. Your current plan is unchanged.
            Whenever you&apos;re ready, you can upgrade from the billing page.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/business">
              <button className="button" type="button">
                View Plans
              </button>
            </Link>
            <Link href="/">
              <button className="button secondary" type="button">
                Go to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </Surface>
    </main>
  );
}
