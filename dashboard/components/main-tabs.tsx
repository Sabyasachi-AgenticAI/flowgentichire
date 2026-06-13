"use client";

import { useState } from "react";
import { StatsGrid } from "./stats-grid";
import { CandidatesTable } from "./candidates-table";
import { RequirementForm } from "@/components/requirement-form";
import type { CandidateWithSummary } from "@/lib/supabase";

type Tab = "requirement" | "overview";

export function MainTabs({
  candidates,
  matchScores,
  requirements,
}: {
  candidates: CandidateWithSummary[];
  matchScores: Record<string, number>;
  requirements: Array<{ id: string; title: string; location: string | null; status: string }>;
}) {
  const [tab, setTab] = useState<Tab>("requirement");

  return (
    <div className="space-y-6">
      {/* Centered tab switcher */}
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

      {/* Tab content */}
      {tab === "requirement" && (
        <div className="max-w-2xl mx-auto">
          <RequirementForm embedded />
        </div>
      )}

      {tab === "overview" && (
        <div className="space-y-6">
          <StatsGrid candidates={candidates} />

          {requirements.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Active Requirements</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {requirements.map((req) => (
                  <a
                    key={req.id}
                    href={`/requirements/${req.id}`}
                    className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700">
                          {req.title}
                        </p>
                        {req.location && <p className="text-xs text-slate-500 mt-0.5">{req.location}</p>}
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                          req.status === "executing"
                            ? "bg-emerald-100 text-emerald-700"
                            : req.status === "matched"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {req.status === "executing" ? "Live" : req.status}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">All Candidates</h2>
            <CandidatesTable initialData={candidates} initialMatchScores={matchScores} />
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
