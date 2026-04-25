"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Surface } from "@cortex/ui";
import { apiLogin, saveAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";

const LOGIN_BENEFITS = [
  "Pick up your saved reports instantly.",
  "Keep your verification status and plan in one quiet place.",
  "Move across BabaJi pathways without losing context.",
];

type DemoAccount = {
  email: string;
  password: string;
  display_name: string;
  plan: string;
  role: string;
  note: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/v1/auth/demo-accounts", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ accounts?: DemoAccount[] }>;
      })
      .then((data) => {
        if (!cancelled && data?.accounts?.length) setDemoAccounts(data.accounts);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Enter email and password."); return; }
    setError("");
    setLoading(true);
    try {
      const result = await apiLogin(email, password);
      saveAuth(result);
      toast(`Welcome back, ${result.user.display_name || result.user.email.split("@")[0]}!`);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function loginDemoAccount(account: DemoAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
    setLoading(true);
    try {
      const result = await apiLogin(account.email, account.password);
      saveAuth(result);
      toast(`Signed in as ${account.display_name}.`);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand-header">
          <div className="auth-brand-om">🕉</div>
          <h1 className="auth-brand-title">Welcome back</h1>
          <p className="auth-brand-sub">Sign in to your BabaJi account</p>
        </div>

        <Surface>
          <p className="auth-caption">
            Return to your private workspace and continue where your last reading left off.
          </p>
          <form className="form" onSubmit={handleSubmit}>
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button className="button" type="submit" disabled={loading} style={{ width: "100%", marginTop: 4 }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
            <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#64748b" }}>
              No account?{" "}
              <Link href="/register" style={{ fontWeight: 600, color: "#005f73" }}>Create one free</Link>
            </p>
          </form>
          {demoAccounts.length > 0 ? (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
                Instant Demo Access
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    className="button secondary"
                    style={{ justifyContent: "space-between", textAlign: "left", width: "100%" }}
                    onClick={() => void loginDemoAccount(account)}
                    disabled={loading}
                  >
                    <span>{account.display_name} · {account.plan} · {account.role}</span>
                    <span style={{ color: "#64748b" }}>Sign in</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="auth-support-list">
            {LOGIN_BENEFITS.map((benefit) => (
              <div key={benefit} className="auth-support-item">
                <span className="auth-support-dot">•</span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}
