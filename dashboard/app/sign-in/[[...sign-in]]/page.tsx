"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

/* ── Logo ── */
const Logo = ({ size = 38 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 38 38" fill="none">
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#3730a3" />
      </linearGradient>
    </defs>
    <rect width="38" height="38" rx="10" fill="url(#lg)" />
    <line x1="9" y1="12" x2="29" y2="12" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="13" y1="19" x2="25" y2="19" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="19" cy="27" r="3" fill="white" />
  </svg>
);

/* ── Google icon ── */
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

/* ── Microsoft icon ── */
const MicrosoftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 23 23" fill="none">
    <rect x="1" y="1" width="10" height="10" fill="#F25022" />
    <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
    <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
    <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
  </svg>
);

export default function SignInPage() {
  const clerk = useClerk();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const isLoaded = !!clerk.client;

  /* Google OAuth */
  const handleGoogle = async () => {
    if (!isLoaded) return;
    setGoogleLoading(true);
    try {
      await clerk.client!.signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: "/",
      });
    } catch {
      setGoogleLoading(false);
    }
  };

  /* Email + password */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      const result = await clerk.client!.signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await clerk.setActive({ session: result.createdSessionId });
        router.push("/");
      }
    } catch (err: unknown) {
      const msg =
        (err as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
        "Invalid email or password.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#fff", overflow: "hidden", fontFamily: "Inter, sans-serif" }}>

      {/* ══ LEFT PANEL ══ */}
      <div style={{ flex: "0.9", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-evenly", padding: "36px 40px 44px" }} className="hidden md:flex">

        {/* Blurred bg */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: "url('https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1400&q=85')", backgroundSize: "cover", backgroundPosition: "center 40%", filter: "blur(5px)", transform: "scale(1.06)" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "rgba(255,255,255,0.72)" }} />

        {/* Wordmark */}
        <div style={{ position: "relative", zIndex: 10, width: "100%" }}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Logo size={44} />
              <span style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.8px", lineHeight: 1, whiteSpace: "nowrap" }}>
                Flowgentic <span style={{ color: "#6366f1" }}>HIRE</span>
              </span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#64748b", paddingLeft: 56 }}>
              Where every great <span style={{ color: "#6366f1", fontWeight: 600 }}>HIRE</span> begins
            </p>
          </div>
        </div>

        {/* Centre: badge + headline + subtitle + chips */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0 }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(238,242,255,0.9)", border: "1px solid rgba(199,210,254,0.8)", borderRadius: 40, padding: "8px 18px", fontSize: 13, fontWeight: 600, color: "#4338ca", marginBottom: 28, backdropFilter: "blur(4px)" }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            AI Recruiting · Now live
          </div>

          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#0f172a", letterSpacing: "-1.2px", lineHeight: 1.2, marginBottom: 20, maxWidth: 500 }}>
            Intelligent Sourcing &amp; Screening
            <em style={{ fontStyle: "normal", color: "#6366f1", display: "block" }}>while you build what matters most</em>
          </h1>

          <p style={{ fontSize: 16, color: "#64748b", lineHeight: 1.7, maxWidth: 460 }}>
            Maya, your AI Assistant calls every candidate and screens them live — so your team focuses only on the people who truly matter.
          </p>

          {/* Chips */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 28 }}>
            {[
              { label: "AI outbound calls", d: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" },
              { label: "Live transcript scoring", d: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
              { label: "Auto shortlisting", d: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            ].map((c) => (
              <span key={c.label} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(226,232,240,0.9)", borderRadius: 20, padding: "9px 16px", fontSize: 13, fontWeight: 500, color: "#475569", backdropFilter: "blur(4px)" }}>
                <svg width="12" height="12" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={c.d} /></svg>
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ position: "relative", zIndex: 10, width: "100%", display: "grid", gridTemplateColumns: "repeat(4,1fr)", border: "1px solid rgba(226,232,240,0.8)", borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
          {[
            { val: "10", sup: "×", label: "More candidates screened" },
            { val: "3", sup: " min", label: "Avg. screening call" },
            { val: "90", sup: "%", label: "Reduction in recruiter time" },
            { val: "24", sup: "/7", label: "Candidate availability" },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: "22px 16px", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(226,232,240,0.7)" : "none" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", letterSpacing: -1, lineHeight: 1 }}>
                {s.val}<span style={{ color: "#6366f1", fontSize: s.sup.length > 1 ? 20 : undefined }}>{s.sup}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", marginTop: 5, lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div style={{ width: 420, flexShrink: 0, background: "#fff", borderLeft: "1px solid #f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 42px", boxShadow: "-4px 0 40px rgba(0,0,0,0.04)", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 320 }}>

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
            <Logo size={34} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>
                Flowgentic <span style={{ color: "#6366f1" }}>HIRE</span>
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, letterSpacing: "0.5px" }}>RECRUITER WORKSPACE</div>
            </div>
          </div>

          <h1 style={{ fontSize: 25, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", marginBottom: 5 }}>Welcome back</h1>
          <p style={{ fontSize: 13.5, color: "#64748b", marginBottom: 24, lineHeight: 1.55 }}>
            Sign in to your workspace.<br />Maya&apos;s already on it.
          </p>

          {/* SSO buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <button
              onClick={handleGoogle}
              disabled={!isLoaded || googleLoading}
              style={{ flex: 1, padding: "10px 12px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, color: "#475569", fontSize: 13, fontWeight: 600, fontFamily: "Inter,sans-serif", cursor: isLoaded ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all .18s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#cbd5e1"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; }}
            >
              <GoogleIcon />
              {googleLoading ? "Redirecting…" : "Google"}
            </button>
            <button
              disabled
              style={{ flex: 1, padding: "10px 12px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, color: "#94a3b8", fontSize: 13, fontWeight: 600, fontFamily: "Inter,sans-serif", cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
            >
              <MicrosoftIcon />
              Microsoft
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
            <span style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Work Email</label>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  style={{ width: "100%", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 40px", fontSize: 14, color: "#0f172a", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.09)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  style={{ width: "100%", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 40px", fontSize: 14, color: "#0f172a", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.09)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; e.target.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
                  {showPw ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 10 }}>{error}</p>}

            {/* Remember + forgot */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "5px 0 20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#64748b", cursor: "pointer" }}>
                <input type="checkbox" style={{ width: 15, height: 15, borderRadius: 4, accentColor: "#6366f1" }} />
                Keep me signed in
              </label>
              <a href="#" style={{ fontSize: 13, fontWeight: 500, color: "#6366f1", textDecoration: "none" }}>Forgot password?</a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isLoaded}
              style={{ width: "100%", padding: 13, background: loading ? "linear-gradient(135deg,#818cf8,#6366f1)" : "linear-gradient(135deg,#6366f1,#4338ca)", border: "none", borderRadius: 11, color: "#fff", fontSize: 14.5, fontWeight: 700, fontFamily: "Inter,sans-serif", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 18px rgba(99,102,241,0.32)", transition: "all .18s", opacity: loading ? 0.75 : 1 }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: "spin .7s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" /><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg>
                  Signing in…
                </>
              ) : "Sign in to workspace →"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 12.5, color: "#94a3b8", marginTop: 16 }}>
            New to Flowgentic?{" "}
            <a href="#" style={{ color: "#6366f1", fontWeight: 500, textDecoration: "none" }}>Contact your admin</a>
          </p>
          <p style={{ textAlign: "center", fontSize: 11, color: "#cbd5e1", marginTop: 22 }}>© 2026 Flowgentic Technologies</p>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
