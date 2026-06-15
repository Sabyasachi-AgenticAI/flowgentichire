"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type IS = {
  id: string;
  confirmed_name: string | null;
  email: string | null;
  current_position: string | null;
  experience_years: string | null;
  skills: string | null;
  notice_period: string | null;
  current_ctc: string | null;
  expected_ctc: string | null;
  assessment: string | null;
  call_status: string | null;
  called_at: string;
};

type RC = {
  id: string;
  call_status: string;
  match_score: number | null;
  called_at: string | null;
  candidates: {
    id: string;
    name: string;
    phone: string;
    job_role: string | null;
    interview_summaries: IS[];
  } | null;
};

type Req = {
  id: string;
  job_id: string | null;
  title: string;
  company: string | null;
  location: string | null;
  status: string;
  created_at: string;
  requirement_candidates: RC[];
};

type Activity = {
  id: string;
  message: string;
  icon: string;
  created_at: string;
  requirement_id: string;
  job_requirements: {
    job_id: string | null;
    title: string;
    company: string | null;
  } | null;
};

type SubTab = "reqs" | "candidates" | "shortlists" | "notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function assessmentTag(assessment: string | null | undefined) {
  const a = assessment?.toLowerCase() ?? "";
  if (a.startsWith("shortlist"))
    return { label: "Shortlisted", cls: "bg-emerald-100 text-emerald-700" };
  if (a.startsWith("hold"))
    return { label: "Hold", cls: "bg-amber-100 text-amber-700" };
  if (a.startsWith("reject"))
    return { label: "Not a fit", cls: "bg-red-100 text-red-700" };
  return null;
}

function callStatusPill(status: string) {
  const styles: Record<string, string> = {
    queued: "bg-slate-100 text-slate-600",
    calling: "bg-sky-100 text-sky-700",
    completed: "bg-emerald-100 text-emerald-700",
    voicemail: "bg-amber-100 text-amber-700",
    call_failed: "bg-red-100 text-red-700",
    incomplete: "bg-orange-100 text-orange-700",
    on_hold: "bg-violet-100 text-violet-700",
  };
  const labels: Record<string, string> = {
    queued: "Queued",
    calling: "Calling…",
    completed: "Done",
    voicemail: "Voicemail",
    call_failed: "Failed",
    incomplete: "Incomplete",
    on_hold: "On Hold",
  };
  return {
    cls: styles[status] ?? "bg-slate-100 text-slate-500",
    label: labels[status] ?? status,
  };
}

function reqStatusConfig(status: string) {
  const map: Record<string, { label: string; cls: string; pulse?: boolean }> = {
    executing: {
      label: "Live",
      cls: "bg-emerald-100 text-emerald-700",
      pulse: true,
    },
    matching: {
      label: "Matching…",
      cls: "bg-amber-100 text-amber-700",
      pulse: true,
    },
    matched: { label: "Ready", cls: "bg-indigo-100 text-indigo-700" },
    paused: { label: "Paused", cls: "bg-orange-100 text-orange-700" },
    completed: { label: "Completed", cls: "bg-slate-100 text-slate-500" },
  };
  return (
    map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500" }
  );
}

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

// ─── Transcript / Summary Modal ───────────────────────────────────────────────

function SummaryModal({
  is,
  name,
  onClose,
}: {
  is: IS;
  name: string;
  onClose: () => void;
}) {
  const atag = assessmentTag(is.assessment);
  const assessmentBody = is.assessment
    ?.replace(/^(Shortlist|Hold|Reject):\s*/i, "")
    .trim();

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-slate-100">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
              AI Interview Summary
            </p>
            <h3 className="text-base font-bold text-slate-900">
              {is.confirmed_name || name}
            </h3>
            {is.current_position && (
              <p className="text-sm text-slate-500 mt-0.5">
                {is.current_position}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Assessment verdict */}
          {atag && (
            <div
              className={`rounded-xl p-4 ${
                atag.cls.includes("emerald")
                  ? "bg-emerald-50 border border-emerald-200"
                  : atag.cls.includes("amber")
                  ? "bg-amber-50 border border-amber-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${atag.cls}`}
              >
                {atag.label}
              </p>
              {assessmentBody && (
                <p
                  className={`text-sm leading-relaxed ${
                    atag.cls.split(" ")[1]
                  }`}
                >
                  {assessmentBody}
                </p>
              )}
            </div>
          )}

          {/* Key fields grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {(
              [
                [
                  "Experience",
                  is.experience_years ? `${is.experience_years} yrs` : null,
                ],
                ["Notice period", is.notice_period],
                ["Current CTC", is.current_ctc],
                ["Expected CTC", is.expected_ctc],
                ["Email", is.email],
                [
                  "Called at",
                  is.called_at
                    ? new Date(is.called_at).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : null,
                ],
              ] as [string, string | null][]
            )
              .filter(([, v]) => !!v)
              .map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-slate-400 font-medium">{label}</p>
                  <p className="text-sm text-slate-800 font-semibold mt-0.5 break-words">
                    {value}
                  </p>
                </div>
              ))}
          </div>

          {/* Skills */}
          {is.skills && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">
                Skills mentioned
              </p>
              <div className="flex flex-wrap gap-1.5">
                {is.skills
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((sk) => (
                    <span
                      key={sk}
                      className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-medium"
                    >
                      {sk}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RecruiterDashboard() {
  const supabase = createSupabaseClient();

  const [subTab, setSubTab] = useState<SubTab>("reqs");
  const [reqs, setReqs] = useState<Req[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<{
    is: IS;
    name: string;
  } | null>(null);
  const [filterReqId, setFilterReqId] = useState<string>("all");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [shortlistSort, setShortlistSort] = useState<"score" | "recent">("score");
  const [shortlistFilterReqId, setShortlistFilterReqId] = useState<string>("all");

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchReqs = useCallback(async () => {
    const { data } = await supabase
      .from("job_requirements")
      .select(
        `
        id, job_id, title, location, company, status, created_at,
        requirement_candidates(
          id, call_status, match_score, called_at,
          candidates(
            id, name, phone, job_role,
            interview_summaries(
              id, confirmed_name, email, current_position, experience_years,
              skills, notice_period, current_ctc, expected_ctc, assessment,
              call_status, called_at
            )
          )
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setReqs(data as unknown as Req[]);
    setLoading(false);
  }, []);

  const fetchActivities = useCallback(async () => {
    const { data } = await supabase
      .from("requirement_activity")
      .select(
        `id, message, icon, created_at, requirement_id,
         job_requirements(job_id, title, company)`
      )
      .order("created_at", { ascending: false })
      .limit(60);
    if (data) setActivities(data as unknown as Activity[]);
  }, []);

  useEffect(() => {
    fetchReqs();
    fetchActivities();
  }, [fetchReqs, fetchActivities]);

  // Real-time subscriptions
  useEffect(() => {
    const ch = supabase
      .channel("recruiter-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_requirements" },
        fetchReqs
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requirement_candidates" },
        fetchReqs
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interview_summaries" },
        fetchReqs
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requirement_activity" },
        fetchActivities
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchReqs, fetchActivities]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const allRCs = useMemo(
    () => reqs.flatMap((r) => r.requirement_candidates ?? []),
    [reqs]
  );

  const todayStr = useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  );

  // Pick the latest completed summary; only completed calls count
  const bestSummary = useCallback((rc: RC): IS | undefined => {
    const completed = (rc.candidates?.interview_summaries ?? [])
      .filter((s) => s.call_status === "completed")
      .sort((a, b) => new Date(b.called_at).getTime() - new Date(a.called_at).getTime());
    return completed[0];
  }, []);

  const stats = useMemo(() => {
    const callsToday = allRCs.filter((rc) =>
      rc.called_at?.startsWith(todayStr)
    ).length;
    const interested = allRCs.filter((rc) => {
      const a = bestSummary(rc)?.assessment?.toLowerCase() ?? "";
      return a.startsWith("shortlist") || a.startsWith("hold");
    }).length;
    const shortlisted = allRCs.filter((rc) =>
      bestSummary(rc)?.assessment?.toLowerCase().startsWith("shortlist")
    ).length;
    const awaitingReview = reqs.filter(
      (r) =>
        (r.status === "paused" || r.status === "matched") &&
        (r.requirement_candidates?.length ?? 0) > 0
    ).length;
    return { callsToday, interested, shortlisted, awaitingReview };
  }, [allRCs, reqs, todayStr, bestSummary]);

  const scoutActive = useMemo(
    () => allRCs.filter((rc) => rc.call_status === "calling").length,
    [allRCs]
  );

  // Shortlist groups — per requirement, with sort + filter
  const shortlistGroups = useMemo(() => {
    return reqs
      .filter((req) =>
        shortlistFilterReqId === "all" || req.id === shortlistFilterReqId
      )
      .map((req) => {
        let candidates = (req.requirement_candidates ?? []).filter((rc) =>
          bestSummary(rc)?.assessment?.toLowerCase().startsWith("shortlist")
        );
        if (shortlistSort === "score") {
          candidates = [...candidates].sort(
            (a, b) => (b.match_score ?? 0) - (a.match_score ?? 0)
          );
        } else {
          candidates = [...candidates].sort((a, b) =>
            (b.called_at ?? "").localeCompare(a.called_at ?? "")
          );
        }
        return { req, candidates };
      })
      .filter((g) => g.candidates.length > 0);
  }, [reqs, shortlistSort, shortlistFilterReqId]);

  // All candidate rows flattened, for candidates tab
  const allCandidateRows = useMemo(
    () => reqs.flatMap((req) => (req.requirement_candidates ?? []).map((rc) => ({ rc, req }))),
    [reqs]
  );

  const filteredCandidates = useMemo(() => {
    return allCandidateRows.filter(({ rc, req }) => {
      if (filterReqId !== "all" && req.id !== filterReqId) return false;
      if (candidateSearch) {
        const name = rc.candidates?.name?.toLowerCase() ?? "";
        if (!name.includes(candidateSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [allCandidateRows, filterReqId, candidateSearch]);

  // Notifications filter
  const filteredActivities = useMemo(
    () =>
      activities.filter(
        (a) => filterReqId === "all" || a.requirement_id === filterReqId
      ),
    [activities, filterReqId]
  );

  // Unread = within last hour
  const unreadCount = useMemo(
    () =>
      activities.filter(
        (a) => Date.now() - new Date(a.created_at).getTime() < 3_600_000
      ).length,
    [activities]
  );

  // ── Sub-tab button ────────────────────────────────────────────────────────

  function SubTabBtn({
    id,
    label,
    badge,
  }: {
    id: SubTab;
    label: string;
    badge?: number;
  }) {
    return (
      <button
        onClick={() => setSubTab(id)}
        className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
          subTab === id
            ? "border-indigo-600 text-indigo-700"
            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
        }`}
      >
        {label}
        {!!badge && badge > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center">
            {badge}
          </span>
        )}
      </button>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            My Requisitions
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {scoutActive > 0
              ? `Scout is running — ${scoutActive} call${scoutActive > 1 ? "s" : ""} live right now`
              : "Welcome back — here's everything Scout has done"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Scout status badge */}
          {scoutActive > 0 ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Scout active · {scoutActive} live
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 text-sm text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Scout idle
            </div>
          )}
          {/* New requisition — opens existing RequirementForm page */}
          <Link
            href="/requirements/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New requisition
          </Link>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Calls today", val: stats.callsToday, cls: "text-slate-900" },
          { label: "Interested", val: stats.interested, cls: "text-slate-900" },
          { label: "Shortlisted", val: stats.shortlisted, cls: "text-emerald-600" },
          { label: "Awaiting review", val: stats.awaitingReview, cls: "text-amber-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3"
          >
            <p className="text-xs text-slate-400 font-medium mb-1">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.cls}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* ── Sub-tab nav ── */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto -mx-1 px-1">
        <SubTabBtn id="reqs" label="My Requisitions" />
        <SubTabBtn id="candidates" label="Candidates" />
        <SubTabBtn
          id="shortlists"
          label="Shortlists"
          badge={stats.shortlisted}
        />
        <SubTabBtn
          id="notifications"
          label="Notifications"
          badge={unreadCount}
        />
      </div>

      {/* ══════════════════════════════════════════════════
          TAB 1 — MY REQUISITIONS
      ══════════════════════════════════════════════════ */}
      {subTab === "reqs" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-slate-700">
              Active requisitions
            </h2>
            <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">
              {reqs.length}
            </span>
          </div>

          {reqs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-sm mb-2">No requisitions yet.</p>
              <Link
                href="/requirements/new"
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Create your first requisition →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reqs.map((req) => {
                const rcs = req.requirement_candidates ?? [];
                const total = rcs.length;
                const called = rcs.filter((rc) =>
                  ["completed", "voicemail", "call_failed", "incomplete"].includes(
                    rc.call_status
                  )
                ).length;
                const queued = rcs.filter(
                  (rc) => rc.call_status === "queued"
                ).length;
                const sl = rcs.filter((rc) =>
                  bestSummary(rc)?.assessment?.toLowerCase().startsWith("shortlist")
                ).length;
                const progress =
                  total > 0 ? Math.round((called / total) * 100) : 0;
                const sconf = reqStatusConfig(req.status);

                return (
                  <Link
                    key={req.id}
                    href={`/requirements/${req.id}`}
                    className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        {req.job_id && (
                          <p className="text-[11px] font-mono text-indigo-400 font-semibold mb-1 tracking-wider">
                            {req.job_id}
                          </p>
                        )}
                        <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                          {req.title}
                        </p>
                        {(req.company || req.location) && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {[req.company, req.location]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${sconf.cls}`}
                      >
                        {sconf.pulse && (
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        )}
                        {sconf.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          req.status === "completed"
                            ? "bg-violet-400"
                            : "bg-gradient-to-r from-indigo-500 to-cyan-500"
                        }`}
                        style={{
                          width: `${
                            req.status === "completed" ? 100 : progress
                          }%`,
                        }}
                      />
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span>
                        <strong className="text-slate-700">{called}</strong>{" "}
                        called
                      </span>
                      {queued > 0 && (
                        <span>
                          <strong className="text-slate-700">{queued}</strong>{" "}
                          queued
                        </span>
                      )}
                      {sl > 0 && (
                        <span>
                          <strong className="text-emerald-600">{sl}</strong>{" "}
                          shortlisted
                        </span>
                      )}
                      {total > 0 && (
                        <span className="ml-auto text-slate-400">
                          {progress}%
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 2 — CANDIDATES
      ══════════════════════════════════════════════════ */}
      {subTab === "candidates" && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[180px]">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                placeholder="Search candidate…"
                className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-8 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
              />
            </div>
            <select
              value={filterReqId}
              onChange={(e) => setFilterReqId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[200px]"
            >
              <option value="all">All requisitions</option>
              {reqs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.job_id ? `${r.job_id} — ` : ""}
                  {r.title}
                  {r.company ? ` · ${r.company}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_0.8fr_0.8fr] gap-3 px-4 py-2.5 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <div>Candidate</div>
              <div>Requisition</div>
              <div>Outcome</div>
              <div>Score</div>
              <div>Called</div>
            </div>

            {filteredCandidates.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No candidates yet
              </div>
            ) : (
              filteredCandidates.map(({ rc, req }) => {
                const cand = rc.candidates;
                const summary = bestSummary(rc);
                const atag = assessmentTag(summary?.assessment);
                const { cls: scls, label: slabel } = callStatusPill(
                  rc.call_status
                );
                const score = rc.match_score;
                const scoreCls =
                  score != null && score >= 75
                    ? "text-emerald-600"
                    : score != null && score >= 55
                    ? "text-amber-600"
                    : "text-slate-400";

                return (
                  <div
                    key={rc.id}
                    className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1fr_0.8fr_0.8fr] gap-2 sm:gap-3 px-4 py-3 border-b border-slate-100 last:border-0 items-center text-sm hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Candidate */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(
                          cand?.name ?? "?"
                        )}`}
                      >
                        {initials(cand?.name ?? "?")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {cand?.name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {cand?.job_role ?? "—"}
                        </p>
                      </div>
                    </div>

                    {/* Requisition */}
                    <div className="min-w-0">
                      {req.job_id && (
                        <p className="text-[11px] font-mono text-indigo-500 font-semibold">
                          {req.job_id}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 truncate">
                        {req.company ?? req.title}
                      </p>
                    </div>

                    {/* Outcome */}
                    <div>
                      {atag ? (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${atag.cls}`}
                        >
                          {atag.label}
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scls}`}
                        >
                          {slabel}
                        </span>
                      )}
                    </div>

                    {/* Score */}
                    <div className={`font-bold text-sm ${scoreCls}`}>
                      {score != null ? `${score}/100` : "—"}
                    </div>

                    {/* Called at */}
                    <div className="text-xs text-slate-400">
                      {rc.called_at
                        ? new Date(rc.called_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 3 — SHORTLISTS
      ══════════════════════════════════════════════════ */}
      {subTab === "shortlists" && (
        <div>
          {/* Filter + sort bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={shortlistFilterReqId}
              onChange={(e) => setShortlistFilterReqId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[260px]"
            >
              <option value="all">All requisitions</option>
              {reqs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.job_id ? `${r.job_id} — ` : ""}
                  {r.title}
                  {r.company ? ` · ${r.company}` : ""}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setShortlistSort("score")}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  shortlistSort === "score"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                Sort: Score (high→low)
              </button>
              <button
                onClick={() => setShortlistSort("recent")}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  shortlistSort === "recent"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                Sort: Most recent
              </button>
            </div>
          </div>

          {shortlistGroups.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              No shortlisted candidates yet. Scout will shortlist candidates
              automatically as calls complete.
            </div>
          ) : (
            <div className="space-y-8">
              {shortlistGroups.map(({ req, candidates }) => (
                <div key={req.id}>
                  {/* Group header — matches screenshot layout */}
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      {req.title}
                    </h3>
                    {req.job_id && (
                      <span className="text-[11px] font-mono bg-indigo-50 border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded font-semibold tracking-wider">
                        {req.job_id}
                      </span>
                    )}
                    {(req.company || req.location) && (
                      <span className="text-sm text-slate-400">
                        ·{req.company ? ` ${req.company}` : ""}
                        {req.location ? ` · ${req.location}` : ""}
                      </span>
                    )}
                    <span className="ml-auto text-sm font-bold text-emerald-600">
                      {candidates.length} shortlisted
                    </span>
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {candidates.map((rc) => {
                      const cand = rc.candidates;
                      const summary = bestSummary(rc);
                      const name = cand?.name ?? "Unknown";
                      const roleLine = [
                        summary?.current_position ?? cand?.job_role,
                        summary?.experience_years
                          ? `${summary.experience_years}yr`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");

                      return (
                        <div
                          key={rc.id}
                          className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all"
                        >
                          {/* Avatar + name + score */}
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(name)}`}
                            >
                              {initials(name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {name}
                              </p>
                              {roleLine && (
                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                  {roleLine}
                                </p>
                              )}
                            </div>
                            {rc.match_score != null && (
                              <div className="text-center shrink-0">
                                <p className="text-2xl font-extrabold text-emerald-500 leading-none">
                                  {rc.match_score}
                                </p>
                                <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest mt-0.5">
                                  SCORE
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Notice + CTC */}
                          {summary && (
                            <div className="space-y-1.5 mb-4">
                              {summary.notice_period && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                  Notice: {summary.notice_period}
                                </div>
                              )}
                              {summary.expected_ctc && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <line x1="12" y1="1" x2="12" y2="23" />
                                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                                  </svg>
                                  Expects {summary.expected_ctc}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                summary &&
                                setSelectedSummary({ is: summary, name })
                              }
                              disabled={!summary}
                              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              View transcript
                            </button>
                            <button
                              className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                              title="Coming soon"
                            >
                              Send to client
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 4 — NOTIFICATIONS
      ══════════════════════════════════════════════════ */}
      {subTab === "notifications" && (
        <div>
          {/* Filter */}
          <div className="mb-4">
            <select
              value={filterReqId}
              onChange={(e) => setFilterReqId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="all">All requisitions</option>
              {reqs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.job_id ? `${r.job_id} — ` : ""}
                  {r.title}
                </option>
              ))}
            </select>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              No activity yet
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredActivities.map((a) => {
                const isNew =
                  Date.now() - new Date(a.created_at).getTime() < 3_600_000;

                const iconCfg: Record<
                  string,
                  { bg: string; stroke: string }
                > = {
                  success: { bg: "bg-emerald-50", stroke: "#059669" },
                  error: { bg: "bg-red-50", stroke: "#DC2626" },
                  calling: { bg: "bg-amber-50", stroke: "#D97706" },
                  info: { bg: "bg-indigo-50", stroke: "#4F46E5" },
                };
                const { bg, stroke } =
                  iconCfg[a.icon] ?? {
                    bg: "bg-slate-100",
                    stroke: "#64748B",
                  };

                return (
                  <div
                    key={a.id}
                    className={`bg-white rounded-xl border flex items-start gap-3 px-4 py-3 ${
                      isNew
                        ? "border-l-[3px] border-l-indigo-500 border-slate-100"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}
                    >
                      {a.icon === "success" && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={stroke}
                          strokeWidth={2.5}
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {a.icon === "error" && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={stroke}
                          strokeWidth={2.5}
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                      {a.icon === "calling" && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={stroke}
                          strokeWidth={2}
                        >
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.03 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                        </svg>
                      )}
                      {a.icon === "info" && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={stroke}
                          strokeWidth={2}
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      )}
                      {!["success", "error", "calling", "info"].includes(
                        a.icon
                      ) && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={stroke}
                          strokeWidth={2}
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <p className="text-sm text-slate-800 flex-1 leading-snug">
                          {a.message}
                        </p>
                        <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                          {timeAgo(a.created_at)}
                        </span>
                      </div>
                      {a.job_requirements && (
                        <div className="flex items-center gap-2 mt-1.5">
                          {a.job_requirements.job_id && (
                            <span className="text-[11px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded font-semibold">
                              {a.job_requirements.job_id}
                            </span>
                          )}
                          {a.job_requirements.company && (
                            <span className="text-xs text-slate-400">
                              {a.job_requirements.company}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Summary modal ── */}
      {selectedSummary && (
        <SummaryModal
          is={selectedSummary.is}
          name={selectedSummary.name}
          onClose={() => setSelectedSummary(null)}
        />
      )}
    </div>
  );
}
