"use client";

import { SignIn } from "@clerk/nextjs";

const LogoSvg = ({ size = 38 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="38" height="38" rx="10" fill="url(#lgLogin)"/>
    <defs>
      <linearGradient id="lgLogin" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366f1"/>
        <stop offset="100%" stopColor="#3730a3"/>
      </linearGradient>
    </defs>
    <line x1="9" y1="12" x2="29" y2="12" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
    <line x1="13" y1="19" x2="25" y2="19" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
    <circle cx="19" cy="27" r="3" fill="white"/>
  </svg>
);

export default function SignInPage() {
  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">

      {/* ══ LEFT PANEL ══ */}
      <div className="flex-1 relative overflow-hidden hidden md:flex flex-col items-center justify-evenly px-8 py-10">
        {/* Blurred background photo */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1400&q=85')",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
            filter: "blur(5px)",
            transform: "scale(1.06)",
          }}
        />
        <div
          className="absolute inset-0 z-10"
          style={{ background: "rgba(255,255,255,0.72)" }}
        />

        {/* TOP: Wordmark */}
        <div className="relative z-20 w-full">
          <div className="inline-flex flex-col items-start gap-1">
            <div className="flex items-center gap-3">
              <LogoSvg size={44} />
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                Flowgentic <span className="text-indigo-500">HIRE</span>
              </span>
            </div>
            <p className="text-[13px] font-medium text-slate-500 pl-14">
              Where every great <span className="text-indigo-500 font-semibold">HIRE</span> begins
            </p>
          </div>
        </div>

        {/* CENTER: Badge + Headline + Subtitle + Chips */}
        <div className="relative z-20 flex flex-col items-center text-center max-w-xl">
          <div className="inline-flex items-center gap-1.5 bg-indigo-50/90 border border-indigo-200/80 rounded-full px-4 py-2 mb-7">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#4338ca" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
            <span className="text-[13px] font-semibold text-indigo-700">AI Recruiting · Now live</span>
          </div>

          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-snug mb-5">
            Intelligent Sourcing &amp; Screening
            <em className="not-italic text-indigo-500 block">while you build what matters most</em>
          </h1>

          <p className="text-base text-slate-500 leading-relaxed max-w-md">
            Maya, your AI Assistant calls every candidate and screens them live — so your team focuses only on the people who truly matter.
          </p>

          {/* Feature chips */}
          <div className="flex flex-wrap justify-center gap-2.5 mt-7">
            {[
              {
                label: "AI outbound calls",
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>,
              },
              {
                label: "Live transcript scoring",
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>,
              },
              {
                label: "Auto shortlisting",
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>,
              },
            ].map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 bg-white/88 border border-slate-200/90 rounded-full px-4 py-2 text-[13px] font-medium text-slate-600 backdrop-blur-sm"
              >
                <svg className="text-indigo-500" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  {chip.icon}
                </svg>
                {chip.label}
              </span>
            ))}
          </div>
        </div>

        {/* BOTTOM: Stats row */}
        <div className="relative z-20 w-full grid grid-cols-4 border border-slate-200/80 rounded-2xl overflow-hidden bg-white/82 backdrop-blur-md shadow-sm">
          {[
            { val: "10×", label: "More candidates screened" },
            { val: "3 min", label: "Avg. screening call" },
            { val: "90%", label: "Reduction in recruiter time" },
            { val: "24/7", label: "Candidate availability" },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`py-5 px-4 text-center ${i < 3 ? "border-r border-slate-200/70" : ""}`}
            >
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {s.val.includes("×") ? (
                  <>{s.val.replace("×", "")}<span className="text-indigo-500">×</span></>
                ) : s.val.includes("%") ? (
                  <>{s.val.replace("%", "")}<span className="text-indigo-500">%</span></>
                ) : s.val.includes("/") ? (
                  <>24<span className="text-xl">/7</span></>
                ) : (
                  <>{s.val.replace(" min", "")} <span className="text-xl font-semibold">min</span></>
                )}
              </p>
              <p className="text-[11px] font-medium text-slate-400 mt-1 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div className="w-full md:w-[420px] shrink-0 bg-white border-l border-slate-100 flex flex-col items-center justify-center px-10 py-12 shadow-[-4px_0_40px_rgba(0,0,0,0.04)] overflow-y-auto">
        <div className="w-full max-w-xs">
          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-7">
            <LogoSvg size={34} />
            <div>
              <p className="text-base font-extrabold text-slate-900 leading-tight">
                Flowgentic <span className="text-indigo-500">HIRE</span>
              </p>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                Recruiter Workspace
              </p>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">
            Welcome back
          </h1>
          <p className="text-[13.5px] text-slate-500 mb-6 leading-relaxed">
            Sign in to your workspace.<br />
            Maya&apos;s already on it.
          </p>

          {/* Clerk SignIn — handles Google OAuth + email/password */}
          <SignIn
            appearance={{
              variables: {
                colorPrimary: "#6366f1",
                colorForeground: "#0f172a",
                colorNeutral: "#64748b",
                colorBackground: "#ffffff",
                borderRadius: "10px",
                fontFamily: "Inter, sans-serif",
                fontSize: "14px",
              },
              elements: {
                rootBox: "w-full",
                card: "shadow-none p-0 border-0 bg-transparent w-full",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                header: "hidden",
                socialButtonsBlockButton:
                  "border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-700 font-semibold text-sm rounded-[10px] transition-all hover:shadow-sm",
                socialButtonsBlockButtonText: "font-semibold text-[13px]",
                dividerLine: "bg-slate-100",
                dividerText: "text-slate-400 text-xs",
                formFieldLabel: "text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide",
                formFieldInput:
                  "bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-[10px] text-sm text-slate-900 placeholder:text-slate-400",
                formButtonPrimary:
                  "bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-bold text-[14.5px] rounded-[11px] py-3 shadow-[0_4px_18px_rgba(99,102,241,0.32)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.42)] transition-all",
                footerActionLink: "text-indigo-500 font-medium hover:text-indigo-700",
                footerActionText: "text-slate-400 text-xs",
                identityPreviewEditButton: "text-indigo-500",
                alertText: "text-red-600 text-xs",
                formFieldErrorText: "text-red-500 text-xs",
              },
            }}
          />

          <p className="text-center text-[11px] text-slate-300 mt-6">
            © 2026 Flowgentic Technologies
          </p>
        </div>
      </div>
    </div>
  );
}
