"use client";

import { useState, useEffect, useCallback } from "react";
import { StatsGrid } from "./stats-grid";
import { CandidatesTable } from "./candidates-table";
import { RequirementForm } from "@/components/requirement-form";
import { createSupabaseClient, type CandidateWithSummary } from "@/lib/supabase";

type Tab = "requirement" | "overview";

type ReqCandidate = {
  id: string;
  call_status: string;
  interview_summaries?: Array<{ assessment: string | null }>;
};

type Requirement = {
  id: string;
  title: string;
  location: string | null;
  status: string;
  job_id?: string | null;
  created_at?: string;
  requirement_candidates?: ReqCandidate[];
};

const STATUS_CONFIG: Record<string, { label: string; classes: string; dot?: boolean }> = {
  matching:  { label: "Matching…",  classes: "bg-amber-100 text-amber-700",   dot: true },
  matched:   { label: "Matched",    classes: "bg-indigo-100 text-indigo-700" },
  executing: { label: "Live",       classes: "bg-emerald-100 text-emerald-700", dot: true },
  completed: { label: "Completed",  classes: "bg-slate-100 text-slate-600" },
  paused:    { label: "Paused",     classes: "bg-orange-100 text-orange-700" },
};

function RequirementStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, classes: "bg-slate-100 text-slate-500" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.classes}`}>
      {cfg.dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {cfg.label}
    </span>
  );
}

function ReqStats({ rcs }: { rcs: ReqCandidate[] }) {
  const total = rcs.length;
  const called = rcs.filter((r) =>
    ["completed", "voicemail", "call_failed"].includes(r.call_status)
  ).length;
  const calling = rcs.filter((r) => r.call_status === "calling").length;
  const interested = rcs.filter((r) => {
    const a = r.interview_summaries?.[0]?.assessment?.toLowerCase() ?? "";
    return a.includes("shortlist") || a.includes("hold");
  }).length;

  return (
    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
      <span><strong className="text-slate-700">{total}</strong> matched</span>
      {calling > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
          <strong className="text-sky-700">{calling}</strong> calling
        </span>
      )}
      {called > 0 && <span><strong className="text-slate-700">{called}</strong> called</span>}
      {interested > 0 && <span><strong className="text-emerald-700">{interested}</strong> interested</span>}
    </div>
  );
}

export function MainTabs({
  candidates: initialCandidates,
  matchScores: initialMatchScores,
  requirements: initialRequirements,
}: {
  candidates: CandidateWithSummary[];
  matchScores: Record<string, number>;
  requirements: Requirement[];
}) {
  const [tab, setTab] = useState<Tab>("requirement");
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const supabase = createSupabaseClient();

  const refetchRequirements = useCallback(async () => {
    const { data } = await supabase
      .from("job_requirements")
      .select(`
        id, title, location, status, job_id, created_at,
        requirement_candidates(id, call_status, interview_summaries(assessment))
      `)
      .order("created_at", { ascending: false })
      .limit(12);
    if (data) setRequirements(data as any[]);
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("overview-requirements")
      .on("postgres_changes", { event: "*", schema: "public", table: "job_requirements" }, refetchRequirements)
      .on("postgres_changes", { event: "*", schema: "public", table: "requirement_candidates" }, refetchRequirements)
      .on("postgres_changes", { event: "*", schema: "public", table: "interview_summaries" }, refetchRequirements)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetchRequirements]);

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex justify-center">
        <div className="inline-flex bg-slate-100 rounded-2xl p-1 gap-1">
          <TabButton active={tab === "requirement"} onClick={() => setTab("requirement")}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            New Requirement
          </TabButton>
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            Overview
          </TabButton>
        </div>
      </div>

      {tab === "requirement" && (
        <div className="max-w-2xl mx-auto">
          <RequirementForm embedded />
        </div>
      )}

      {tab === "overview" && (
        <div className="space-y-6">
          <StatsGrid candidates={initialCandidates} />

          {/* Requirements cards */}
          {requirements.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">Requirements</h2>
                <span className="text-xs text-slate-400">{requirements.length} total · live</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {requirements.map((req) => {
                  const rcs: ReqCandidate[] = (req.requirement_candidates as any) ?? [];
                  return (
                    <a
                      key={req.id}
                      href={`/requirements/${req.id}`}
                      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {req.job_id && (
                            <p className="text-xs font-mono text-indigo-500 mb-0.5">{req.job_id}</p>
                          )}
                          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700">
                            {req.title}
                          </p>
                          {req.location && (
                            <p className="text-xs text-slate-400 mt-0.5">{req.location}</p>
                          )}
                        </div>
                        <RequirementStatusBadge status={req.status} />
                      </div>
                      {rcs.length > 0 && <ReqStats rcs={rcs} />}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Candidates table */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">All Candidates</h2>
            <CandidatesTable initialData={initialCandidates} initialMatchScores={initialMatchScores} />
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all
        ${active
          ? "bg-white text-slate-900 shadow-sm shadow-slate-200/80"
          : "text-slate-500 hover:text-slate-700"
        }
      `}
    >
      {children}
    </button>
  );
}
