"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getStoredUser, clearAuth, getUserToken, syncStoredUser, type User } from "../lib/auth";
import { useToast } from "../lib/toast";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const FEATURE_LINKS = [
  { href: "/kundli",      emoji: "🔮", label: "Kundli",      sub: "Birth chart & AI narrative", tier: null },
  { href: "/vaastu",      emoji: "🏠", label: "Vaastu",      sub: "Space energy analysis",     tier: "Elite" },
  { href: "/matchmaking", emoji: "💫", label: "Matchmaking", sub: "Compatibility studio",       tier: "Pro" },
  { href: "/panchang",    emoji: "📅", label: "Panchang",    sub: "Daily muhurta & tithi",      tier: null },
  { href: "/consult",     emoji: "💬", label: "Consult",     sub: "Live session",               tier: "Elite" },
  { href: "/insights",    emoji: "✨", label: "Insights",    sub: "Tarot, gems & numerology",   tier: null },
  { href: "/transits",   emoji: "🪐", label: "Transits",   sub: "Today's planetary impacts",  tier: null },
];

const COMPANY_LINKS = [
  { href: "/about",       emoji: "🕉",  label: "About",       sub: "Our mission & team" },
  { href: "/pricing",     emoji: "💳",  label: "Pricing",     sub: "Plans & add-ons" },
  { href: "/faq",         emoji: "❓",  label: "FAQ",         sub: "Help & answers" },
  { href: "/astrologers", emoji: "🌟",  label: "Astrologers", sub: "Expert profiles" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [featOpen, setFeatOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const featRef = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLDivElement>(null);
  const firstFeatureRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setUser(getStoredUser());
    void syncStoredUser().then((fresh) => {
      if (fresh) setUser(fresh);
    }).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    setFeatOpen(false);
    setCompanyOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (featRef.current && !featRef.current.contains(e.target as Node)) setFeatOpen(false);
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) setCompanyOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  useEffect(() => {
    if (!featOpen && !companyOpen) return;
    firstFeatureRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setFeatOpen(false); setCompanyOpen(false); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [featOpen, companyOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function handleSignOut() {
    clearAuth();
    setUser(null);
    setMobileOpen(false);
    router.push("/");
  }

  async function handleResendVerification() {
    const token = getUserToken();
    if (!token || resending) return;
    setResending(true);
    try {
      const res = await fetch(`${API_BASE}/v1/auth/resend-verification`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast("Verification email sent — check your inbox.", "success");
      } else {
        toast("Could not send verification email. Try again later.", "error");
      }
    } catch {
      toast("Network error. Try again later.", "error");
    } finally {
      setResending(false);
    }
  }

  const featuresActive = FEATURE_LINKS.some((f) => pathname.startsWith(f.href));
  const companyActive = COMPANY_LINKS.some((c) => pathname.startsWith(c.href));

  const PLAN_BADGE: Record<string, { bg: string; color: string }> = {
    free:  { bg: "#f1f5f9", color: "#64748b" },
    plus:  { bg: "#dbeafe", color: "#1d4ed8" },
    pro:   { bg: "#ede9fe", color: "#6d28d9" },
    elite: { bg: "#fef3c7", color: "#92400e" },
  };
  const badge = user?.plan ? (PLAN_BADGE[user.plan] ?? PLAN_BADGE.free) : null;

  return (
    <>
      <header
        style={{
          borderBottom: "1px solid #d7dde4",
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 200,
        }}
      >
        <nav
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "10px 20px",
            display: "flex",
            gap: 4,
            alignItems: "center",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              fontWeight: 800, fontSize: 17, color: "#1a1a2e",
              textDecoration: "none", letterSpacing: "-0.03em",
              marginRight: 8, display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #005f73, #0a9396)",
                display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15,
              }}
            >
              🕉
            </span>
            BabaJi
          </Link>

          {/* Desktop nav — hidden on mobile */}
          <div className="nav-desktop-links" style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {/* Features dropdown */}
            <div ref={featRef} style={{ position: "relative" }}>
              <button
                className={`nav-features-btn${featuresActive ? " active" : ""}`}
                type="button"
                onClick={() => { setFeatOpen((o) => !o); setCompanyOpen(false); }}
                aria-expanded={featOpen}
                aria-haspopup="menu"
                aria-controls="feature-menu"
              >
                Features {featOpen ? "▲" : "▾"}
              </button>
              {featOpen && (
                <div className="nav-dropdown" id="feature-menu" role="menu">
                  <div className="nav-dropdown-section-label">Modules</div>
                  {FEATURE_LINKS.map(({ href, emoji, label, sub, tier }, idx) => {
                    const active = pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        ref={idx === 0 ? firstFeatureRef : undefined}
                        href={href}
                        className={`nav-dropdown-link${active ? " active-link" : ""}`}
                        role="menuitem"
                        onClick={() => setFeatOpen(false)}
                      >
                        <span className="nav-dropdown-icon" style={{ background: active ? "#e0f2f4" : "#f8fafc" }}>{emoji}</span>
                        <span style={{ flex: 1 }}>
                          <span style={{ display: "block", fontWeight: 600 }}>{label}</span>
                          <span style={{ display: "block", fontSize: 11, color: "#94a3b8" }}>{sub}</span>
                        </span>
                        {tier && (
                          <span style={{ fontSize: 9, fontWeight: 800, background: "#fef3c7", color: "#92400e", padding: "2px 5px", borderRadius: 4 }}>
                            {tier}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Company dropdown */}
            <div ref={companyRef} style={{ position: "relative" }}>
              <button
                className={`nav-features-btn${companyActive ? " active" : ""}`}
                type="button"
                onClick={() => { setCompanyOpen((o) => !o); setFeatOpen(false); }}
                aria-expanded={companyOpen}
                aria-haspopup="menu"
              >
                Company {companyOpen ? "▲" : "▾"}
              </button>
              {companyOpen && (
                <div className="nav-dropdown" role="menu">
                  <div className="nav-dropdown-section-label">Navigate</div>
                  {COMPANY_LINKS.map(({ href, emoji, label, sub }) => {
                    const active = pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`nav-dropdown-link${active ? " active-link" : ""}`}
                        role="menuitem"
                        onClick={() => setCompanyOpen(false)}
                      >
                        <span className="nav-dropdown-icon" style={{ background: active ? "#e0f2f4" : "#f8fafc" }}>{emoji}</span>
                        <span>
                          <span style={{ display: "block", fontWeight: 600 }}>{label}</span>
                          <span style={{ display: "block", fontSize: 11, color: "#94a3b8" }}>{sub}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <Link
              href="/pricing"
              style={{
                fontSize: 13, color: pathname === "/pricing" ? "#0a9396" : "#475569",
                fontWeight: pathname === "/pricing" ? 700 : 500,
                textDecoration: "none", padding: "6px 10px", borderRadius: 8,
              }}
            >
              Pricing
            </Link>
          </div>

          {/* Right side */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <Link
              href="/history"
              className="nav-desktop-only"
              style={{
                fontSize: 13, color: pathname === "/history" ? "#1a1a2e" : "#64748b",
                fontWeight: pathname === "/history" ? 700 : 400,
                textDecoration: "none", padding: "5px 8px",
              }}
            >
              History
            </Link>

            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="nav-desktop-only"
                style={{
                  fontSize: 12, color: "#b45309", fontWeight: 700,
                  textDecoration: "none", padding: "4px 10px", borderRadius: 6,
                  background: "#fef3c7",
                }}
              >
                ⚙️ Admin
              </Link>
            )}

            {user ? (
              <>
                <Link
                  href="/profile"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 10px 4px 4px", borderRadius: 20,
                    border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 600,
                    textDecoration: "none", color: "#1a1a2e",
                    background: pathname === "/profile" ? "#f1f5f9" : "white",
                  }}
                >
                  <span
                    style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}
                  >
                    {(user.display_name || user.email)[0].toUpperCase()}
                  </span>
                  <span className="nav-desktop-only" style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.display_name || user.email.split("@")[0]}
                  </span>
                  {badge && (
                    <span className="nav-desktop-only" style={{ fontSize: 9, fontWeight: 800, background: badge.bg, color: badge.color, padding: "1px 5px", borderRadius: 4 }}>
                      {(user.plan ?? "free").toUpperCase()}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="nav-desktop-only"
                  style={{ fontSize: 12, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "5px 4px" }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="nav-desktop-only" style={{ fontSize: 13, color: "#64748b", textDecoration: "none", padding: "5px 10px" }}>
                  Sign in
                </Link>
                <Link href="/register" className="button nav-desktop-only" style={{ fontSize: 13, padding: "5px 14px" }}>
                  Sign up free
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              className="nav-hamburger-btn"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Open menu"
              style={{
                display: "none", background: "none", border: "1px solid #e2e8f0",
                borderRadius: 8, cursor: "pointer", fontSize: 16, color: "#475569",
                padding: "5px 9px", lineHeight: 1,
              }}
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </nav>
      </header>

      {/* Email verification banner */}
      {user && user.email_verified === false && (
        <div className="verify-banner" role="alert">
          <span>📧 Your email isn&apos;t verified yet.</span>
          <button onClick={handleResendVerification} disabled={resending}>
            {resending ? "Sending…" : "Resend verification email"}
          </button>
        </div>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            zIndex: 250, display: "none",
          }}
          className="mobile-overlay-bg"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`mobile-side-drawer${mobileOpen ? " open" : ""}`}
        style={{
          position: "fixed", top: 0, right: mobileOpen ? 0 : "-320px", width: 300,
          maxWidth: "88vw", height: "100vh", background: "#fff", zIndex: 300,
          overflowY: "auto", boxShadow: "-4px 0 28px rgba(0,0,0,0.15)",
          transition: "right 0.28s ease", display: "none", flexDirection: "column",
        }}
      >
        {/* Drawer header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #f1f5f9" }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", textDecoration: "none", display: "flex", alignItems: "center", gap: 7 }} onClick={() => setMobileOpen(false)}>
            <span style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#005f73,#0a9396)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🕉</span>
            BabaJi
          </Link>
          <button type="button" onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#64748b" }}>✕</button>
        </div>

        {/* User card */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
              {(user.display_name || user.email)[0].toUpperCase()}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{user.display_name || user.email.split("@")[0]}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{user.email}</div>
              {badge && (
                <span style={{ fontSize: 9, fontWeight: 800, background: badge.bg, color: badge.color, padding: "1px 6px", borderRadius: 4 }}>
                  {(user.plan ?? "free").toUpperCase()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Feature links */}
        <div style={{ padding: "8px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#94a3b8", padding: "8px 18px 4px" }}>Features</div>
          {FEATURE_LINKS.map(({ href, emoji, label, tier }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", textDecoration: "none", color: "#334155", fontSize: 14, fontWeight: 500, borderBottom: "1px solid #f8fafc" }}>
              <span style={{ width: 28, textAlign: "center" }}>{emoji}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {tier && <span style={{ fontSize: 9, fontWeight: 800, background: "#fef3c7", color: "#92400e", padding: "2px 5px", borderRadius: 4 }}>{tier}</span>}
            </Link>
          ))}
        </div>

        {/* Company links */}
        <div style={{ padding: "8px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#94a3b8", padding: "8px 18px 4px" }}>Company</div>
          {COMPANY_LINKS.map(({ href, emoji, label }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", textDecoration: "none", color: "#334155", fontSize: 14, fontWeight: 500, borderBottom: "1px solid #f8fafc" }}>
              <span style={{ width: 28, textAlign: "center" }}>{emoji}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>

        {/* Account */}
        <div style={{ padding: "8px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#94a3b8", padding: "8px 18px 4px" }}>Account</div>
          <Link href="/history" onClick={() => setMobileOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", textDecoration: "none", color: "#334155", fontSize: 14, fontWeight: 500, borderBottom: "1px solid #f8fafc" }}>
            <span style={{ width: 28, textAlign: "center" }}>📖</span><span>History</span>
          </Link>
          {user?.role === "admin" && (
            <Link href="/admin" onClick={() => setMobileOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", textDecoration: "none", color: "#b45309", fontSize: 14, fontWeight: 700, borderBottom: "1px solid #f8fafc" }}>
              <span style={{ width: 28, textAlign: "center" }}>⚙️</span><span>Admin Panel</span>
            </Link>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: "16px 18px", marginTop: "auto", borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 8 }}>
          {user ? (
            <>
              <Link href="/profile" className="button" style={{ textAlign: "center" }} onClick={() => setMobileOpen(false)}>My Profile</Link>
              <button type="button" onClick={handleSignOut} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: "10px", borderRadius: 8 }}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/register" className="button" style={{ textAlign: "center" }} onClick={() => setMobileOpen(false)}>Sign up free</Link>
              <Link href="/login" onClick={() => setMobileOpen(false)} style={{ textAlign: "center", color: "#64748b", fontSize: 14, textDecoration: "none", padding: "10px" }}>Sign in</Link>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .nav-desktop-links { display: none !important; }
          .nav-desktop-only { display: none !important; }
          .nav-hamburger-btn { display: block !important; }
          .mobile-overlay-bg { display: block !important; }
          .mobile-side-drawer { display: flex !important; }
        }
        .nav-dropdown-section-label {
          font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;
          color: #94a3b8; padding: 6px 10px 4px;
        }
        .nav-dropdown-link {
          display: flex; align-items: center; gap: 10px; padding: 8px 10px;
          border-radius: 8px; text-decoration: none; color: #334155;
          transition: background 0.12s;
        }
        .nav-dropdown-link:hover { background: #f8fafc; }
        .nav-dropdown-link.active-link { background: #f0fafb; color: #0a9396; }
      `}</style>
    </>
  );
}
