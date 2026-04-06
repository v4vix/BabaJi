"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Surface } from "@cortex/ui";
import { apiRegister, saveAuth } from "../../lib/auth";

const REGISTER_BENEFITS = [
  "Save reports and revisit them over time.",
  "Keep your account private, verified, and portable.",
  "Turn one reading into a longer-term personal practice.",
];

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Enter email and password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError("");
    setLoading(true);
    try {
      const result = await apiRegister(email, password, displayName);
      saveAuth(result);
      setDone(true);
      setTimeout(() => router.push("/"), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand-header">
          <div className="auth-brand-om">🕉</div>
          <h1 className="auth-brand-title">Create your account</h1>
          <p className="auth-brand-sub">Free forever · No credit card required</p>
        </div>

        <Surface>
          {done ? (
            <div className="auth-success">
              <div className="auth-success-icon">✓</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>You&apos;re in!</h2>
              <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 4px" }}>
                We&apos;ve sent a verification email to <strong>{email}</strong>.
              </p>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Redirecting you now…</p>
            </div>
          ) : (
            <form className="form" onSubmit={handleSubmit}>
              <div className="field">
                <label>Name <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
                <input
                  className="input"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                />
              </div>
              {error ? <p className="error">{error}</p> : null}
              <button className="button" type="submit" disabled={loading} style={{ width: "100%", marginTop: 4 }}>
                {loading ? "Creating account…" : "Create Free Account"}
              </button>
              <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#64748b" }}>
                Already have an account?{" "}
                <Link href="/login" style={{ fontWeight: 600, color: "#005f73" }}>Sign in</Link>
              </p>
            </form>
          )}
          {!done ? (
            <div className="auth-support-list">
              {REGISTER_BENEFITS.map((benefit) => (
                <div key={benefit} className="auth-support-item">
                  <span className="auth-support-dot">•</span>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          ) : null}
        </Surface>
      </div>
    </div>
  );
}
