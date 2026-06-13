"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

type Requirement = {
  id: string;
  title: string;
  location: string | null;
  experience: string | null;
  status: string;
  job_id: string | null;
  recruiter_name: string | null;
  created_at: string;
};

type MatchedCandidate = {
  id: string;
  requirement_id: string;
  candidate_id: string;
  match_score: number;
  call_status: string;
  match_reason: string | null;
  called_at: string | null;
  candidates: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    job_role: string | null;
  };
  interview_summaries?: Array<{
    assessment: string | null;
    call_status: string | null;
    experience_years: string | null;
    current_position: string | null;
    called_at: string;
  }>;
};

type Activity = {
  id: string;
  message: string;
  icon: string;
  created_at: string;
};

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function MatchScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-50 border-emerald-300 text-emerald-700"
    : score >= 60 ? "bg-amber-50 border-amber-300 text-amber-700"
    : "bg-slate-50 border-slate-200 text-slate-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      {score}%
    </span>
  );
}

function QueueStatusBadge({ rc, queuePos }: { rc: MatchedCandidate; queuePos?: number }) {
  const summary = rc.interview_summaries?.[0];
  const assessment = summary?.assessment?.toLowerCase() || "";

  if (rc.call_status === "calling")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-sky-300 text-sky-700 bg-sky-50">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
        Calling…
      </span>
    );

  if (assessment.includes("shortlist"))
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-400 text-emerald-700 bg-white">
        Shortlisted
      </span>
    );

  if (assessment.includes("reject"))
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-rose-300 text-rose-600 bg-white">
        Rejected
      </span>
    );

  if (rc.call_status === "completed" || summary?.call_status === "completed")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-teal-300 text-teal-700 bg-white">
        Called
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </span>
    );

  if (rc.call_status === "voicemail")
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-amber-300 text-amber-700 bg-amber-50">
        Voicemail
      </span>
    );

  if (rc.call_status === "call_failed")
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-rose-200 text-rose-600 bg-rose-50">
        Failed
      </span>
    );

  if (rc.call_status === "queued" && queuePos !== undefined)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-indigo-200 text-indigo-600 bg-indigo-50">
        <span className="font-bold">#{queuePos}</span>
        in queue
      </span>
    );

  if (rc.call_status === "on_hold")
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-400 bg-slate-50">
        On hold
      </span>
    );

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-400 bg-white">
      Queued
    </span>
  );
}

function ActivityIcon({ icon }: { icon: string }) {
  if (icon === "calling")
    return (
      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
        </svg>
      </div>
    );
  if (icon === "success")
    return (
      <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
    );
  if (icon === "error")
    return (
      <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center shrink-0">
        <svg className="w-3 h-3 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  return (
    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0">
      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    </div>
  );
}

export default function ScoutLiveView({
  requirement: initialReq,
  candidates: initialCandidates,
  activities: initialActivities,
  inline = false,
}: {
  requirement: Requirement;
  candidates: MatchedCandidate[];
  activities: Activity[];
  inline?: boolean;
}) {
  const [requirement, setRequirement] = useState(initialReq);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [activities, setActivities] = useState(initialActivities);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialCandidates.map((c) => c.id))
  );
  const [executing, setExecuting] = useState(false);
  const [justLaunched, setJustLaunched] = useState(false);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [time, setTime] = useState("");
  const supabase = createSupabaseClient();

  const loadData = useCallback(async () => {
    const [{ data: cands }, { data: acts }, { data: req }] = await Promise.all([
      supabase
        .from("requirement_candidates")
        .select("*, candidates(*, interview_summaries(*))")
        .eq("requirement_id", initialReq.id)
        .order("match_score", { ascending: false }),
      supabase
        .from("requirement_activity")
        .select("*")
        .eq("requirement_id", initialReq.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("job_requirements").select("*").eq("id", initialReq.id).single(),
    ]);
    if (cands) {
      setCandidates(
        (cands as any[]).map((rc) => ({
          ...rc,
          interview_summaries: rc.candidates?.interview_summaries || [],
          candidates: rc.candidates,
        }))
      );
    }
    if (acts) setActivities(acts);
    if (req) setRequirement(req);
  }, [initialReq.id]);

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) + " IST"
      );
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel(`scout-${initialReq.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "requirement_candidates" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "requirement_activity" }, loadData)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "interview_summaries" }, loadData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "candidates" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [initialReq.id, loadData]);

  const handleExecute = async () => {
    if (selected.size === 0) return;
    setExecuting(true);
    try {
      const res = await fetch(`/api/requirements/${requirement.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed to execute");
        return;
      }
      setJustLaunched(true);
      await loadData();
      setTimeout(() => setJustLaunched(false), 1500);
    } finally {
      setExecuting(false);
    }
  };

  const handleQueueAction = async (rcId: string, action: "queue" | "hold" | "retry") => {
    setActionLoading((prev) => new Set(prev).add(rcId));
    try {
      const res = await fetch(
        `/api/requirements/${requirement.id}/candidates/${rcId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Action failed");
        return;
      }
      await loadData();
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev);
        next.delete(rcId);
        return next;
      });
    }
  };

  const toggleAll = () =>
    setSelected(
      selected.size === candidates.length ? new Set() : new Set(candidates.map((c) => c.id))
    );

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const isPreExecute = requirement.status === "matched" || requirement.status === "matching";
  const isLive = !isPreExecute;

  // Compute queue positions (only for "queued" candidates, ordered by match_score desc)
  const queuedRcs = candidates.filter((c) => c.call_status === "queued");
  const queuePositionMap = new Map(queuedRcs.map((rc, i) => [rc.id, i + 1]));

  const total = candidates.length;
  const called = candidates.filter((c) => c.interview_summaries?.[0] || c.call_status === "calling").length;
  const shortlisted = candidates.filter((c) =>
    c.interview_summaries?.[0]?.assessment?.toLowerCase().includes("shortlist")
  ).length;
  const interested = candidates.filter((c) => {
    const a = c.interview_summaries?.[0]?.assessment?.toLowerCase() || "";
    return a.includes("shortlist") || a.includes("hold");
  }).length;
  const onHoldCount = candidates.filter((c) => c.call_status === "on_hold").length;
  const progress = total > 0 ? Math.round((called / total) * 100) : 0;

  return (
    <div className={inline ? "space-y-3" : "max-w-2xl mx-auto space-y-3"}>
      {!inline && (
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Dashboard
        </Link>
      )}

      {/* ── PRE-EXECUTE: selection ── */}
      {isPreExecute && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-up">

          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {requirement.job_id && (
                    <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                      {requirement.job_id}
                    </span>
                  )}
                  <h2 className="text-sm font-semibold text-slate-900 truncate">{requirement.title}</h2>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                  {requirement.location && <span>{requirement.location}</span>}
                  {requirement.experience && <span>{requirement.experience}</span>}
                  {requirement.recruiter_name && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      {requirement.recruiter_name}
                    </span>
                  )}
                </div>
              </div>
              <span className="shrink-0 text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg font-medium">
                {candidates.length} matched
              </span>
            </div>
          </div>

          {/* Select-all bar */}
          {candidates.length > 0 && (
            <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/70 border-b border-slate-100">
              <button onClick={toggleAll} className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  selected.size === candidates.length ? "bg-indigo-600 border-indigo-600"
                  : selected.size > 0 ? "bg-indigo-100 border-indigo-400"
                  : "border-slate-300 bg-white"}`}>
                  {selected.size === candidates.length && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                  {selected.size > 0 && selected.size < candidates.length && (
                    <div className="w-2 h-0.5 bg-indigo-600 rounded" />
                  )}
                </div>
                {selected.size === candidates.length ? "Deselect all" : "Select all"}
              </button>
              <span className="text-xs text-slate-400">
                <span className="font-semibold text-slate-700">{selected.size}</span> of {candidates.length} selected
              </span>
            </div>
          )}

          {/* Candidate rows */}
          <div className="divide-y divide-slate-50">
            {candidates.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-400 text-sm">No matching candidates found.</div>
            ) : (
              candidates.map((rc, i) => (
                <div
                  key={rc.id}
                  onClick={() => toggleOne(rc.id)}
                  className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors select-none ${
                    selected.has(rc.id) ? "bg-indigo-50/50 hover:bg-indigo-50/70" : "hover:bg-slate-50/60"
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-all ${
                    selected.has(rc.id) ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"}`}>
                    {selected.has(rc.id) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>

                  {/* Rank */}
                  <span className="w-5 text-xs font-semibold text-slate-300 shrink-0 text-right">#{i + 1}</span>

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${avatarColor(rc.candidates.name)}`}>
                    {rc.candidates.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{rc.candidates.name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {[rc.candidates.job_role, rc.match_reason].filter(Boolean).join(" · ")}
                    </p>
                  </div>

                  <MatchScoreBadge score={rc.match_score} />
                </div>
              ))
            )}
          </div>

          {/* Execute footer */}
          {candidates.length > 0 && (
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/40">
              <button
                onClick={handleExecute}
                disabled={executing || selected.size === 0}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-all"
              >
                {executing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Dispatching calls…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                    Execute Selected ({selected.size})
                    {selected.size < candidates.length && (
                      <span className="text-indigo-300 text-xs font-normal">
                        · {candidates.length - selected.size} on hold
                      </span>
                    )}
                  </>
                )}
              </button>
              {selected.size === 0 && (
                <p className="text-center text-xs text-slate-400 mt-2">Select at least one candidate to call</p>
              )}
              {selected.size > 0 && selected.size < candidates.length && (
                <p className="text-center text-xs text-slate-400 mt-2">
                  Non-selected candidates will be on hold — you can queue them anytime during the run
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── LIVE VIEW ── */}
      {isLive && (
        <div key="live" className="space-y-3">
          {/* Main card */}
          <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${justLaunched ? "animate-fade-up" : ""}`}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shrink-0 animate-scale-in">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  SCOUT LIVE
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {requirement.job_id && (
                      <span className="text-xs font-mono text-indigo-500 shrink-0">{requirement.job_id}</span>
                    )}
                    <p className="text-sm font-semibold text-slate-900 truncate">{requirement.title}</p>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {[requirement.location, requirement.recruiter_name].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400 shrink-0 tabular-nums">{time}</span>
            </div>

            {/* Hint bar when queue is paused */}
            {onHoldCount > 0 && queuedRcs.length === 0 && !candidates.some((c) => c.call_status === "calling") && (
              <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-xs text-amber-700 font-medium">
                  Queue paused — {onHoldCount} candidate{onHoldCount > 1 ? "s" : ""} on hold. Click "+ Queue" to continue.
                </span>
              </div>
            )}

            {/* Candidate rows */}
            <div className="divide-y divide-slate-50">
              {candidates.map((rc, i) => {
                const summary = rc.interview_summaries?.[0];
                const subtitle = [
                  rc.candidates.job_role,
                  summary?.experience_years ? `${summary.experience_years}yr` : null,
                  requirement.location,
                ].filter(Boolean).join(" · ");

                const isLoading = actionLoading.has(rc.id);
                const canQueue = rc.call_status === "on_hold" || rc.call_status === "voicemail" || rc.call_status === "call_failed";
                const canHold = rc.call_status === "queued";
                const isCalling = rc.call_status === "calling";

                return (
                  <div
                    key={rc.id}
                    className="flex items-center gap-3 px-5 py-3.5 animate-fade-up"
                    style={{ animationDelay: `${i * 70}ms`, opacity: 0, animationFillMode: "forwards" }}
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${avatarColor(rc.candidates.name)}`}>
                      {rc.candidates.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{rc.candidates.name}</p>
                      {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
                    </div>

                    {/* Status badge */}
                    <QueueStatusBadge rc={rc} queuePos={queuePositionMap.get(rc.id)} />

                    {/* Action button */}
                    {!isCalling && (
                      <div className="shrink-0 ml-1">
                        {canQueue && (
                          <button
                            onClick={() => handleQueueAction(rc.id, rc.call_status === "on_hold" ? "queue" : "retry")}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50 disabled:opacity-40 transition-colors"
                          >
                            {isLoading ? (
                              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            )}
                            {rc.call_status === "on_hold" ? "Queue" : "Retry"}
                          </button>
                        )}
                        {canHold && (
                          <button
                            onClick={() => handleQueueAction(rc.id, "hold")}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                          >
                            {isLoading ? (
                              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                              </svg>
                            )}
                            Hold
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            {total > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 animate-slide-down" style={{ animationDelay: "200ms", opacity: 0, animationFillMode: "forwards" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-700">Outreach progress</span>
                  <span className="text-sm font-bold text-amber-500">{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6366f1 0%, #f59e0b 100%)" }}
                  />
                </div>
                <div className="flex items-center gap-5 mt-2.5 text-xs text-slate-500 flex-wrap">
                  <span><strong className="text-slate-700">{called}</strong> called</span>
                  <span><strong className="text-slate-700">{queuedRcs.length}</strong> queued</span>
                  {onHoldCount > 0 && (
                    <span><strong className="text-slate-500">{onHoldCount}</strong> on hold</span>
                  )}
                  <span><strong className="text-slate-700">{interested}</strong> interested</span>
                  <span><strong className="text-slate-700">{shortlisted}</strong> shortlisted</span>
                </div>
              </div>
            )}
          </div>

          {/* Activity log */}
          {activities.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-up" style={{ animationDelay: "300ms", opacity: 0, animationFillMode: "forwards" }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">Scout activity log</span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {activities.map((act, i) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 px-5 py-3 animate-fade-up"
                    style={{ animationDelay: `${350 + i * 60}ms`, opacity: 0, animationFillMode: "forwards" }}
                  >
                    <ActivityIcon icon={act.icon} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">{act.message}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(act.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
