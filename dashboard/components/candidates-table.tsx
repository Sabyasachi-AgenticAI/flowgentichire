"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, type CandidateWithSummary } from "@/lib/supabase";
import { AssessmentBadge } from "./assessment-badge";
import { StatusBadge } from "./status-badge";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MatchBadge({ score }: { score: number | undefined }) {
  if (!score) return <span className="text-slate-300 text-xs">—</span>;

  const color =
    score >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : score >= 60
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-50 text-slate-500 border-slate-200";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {score}%
    </span>
  );
}

export function CandidatesTable({
  initialData,
  initialMatchScores = {},
}: {
  initialData: CandidateWithSummary[];
  initialMatchScores?: Record<string, number>;
}) {
  const [candidates, setCandidates] = useState<CandidateWithSummary[]>(initialData);
  const [matchScores, setMatchScores] = useState<Record<string, number>>(initialMatchScores);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAssessment, setFilterAssessment] = useState("all");

  async function refetch() {
    const [{ data: cands }, { data: matches }] = await Promise.all([
      supabase
        .from("candidates")
        .select("*, interview_summaries(*)")
        .order("created_at", { ascending: false }),
      supabase
        .from("requirement_candidates")
        .select("candidate_id, match_score")
        .order("match_score", { ascending: false }),
    ]);

    if (cands) setCandidates(cands as CandidateWithSummary[]);
    if (matches) {
      const scores: Record<string, number> = {};
      for (const m of matches as Array<{ candidate_id: string; match_score: number }>) {
        if (!scores[m.candidate_id] || m.match_score > scores[m.candidate_id]) {
          scores[m.candidate_id] = m.match_score;
        }
      }
      setMatchScores(scores);
    }
  }

  useEffect(() => {
    const channel = supabase
      .channel("realtime-hire")
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "interview_summaries" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "requirement_candidates" }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = candidates.filter((c) => {
    const summary = c.interview_summaries?.[0];
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.job_role ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchAssessment =
      filterAssessment === "all" ||
      (summary?.assessment ?? "").toLowerCase().includes(filterAssessment);
    return matchSearch && matchStatus && matchAssessment;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Filter bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search name, role, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="calling">Calling</option>
          <option value="done">Done</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </select>
        <select
          value={filterAssessment}
          onChange={(e) => setFilterAssessment(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All assessments</option>
          <option value="shortlist">Interested</option>
          <option value="hold">Hold</option>
          <option value="reject">Not Interested</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Candidate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Job Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Match %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Call Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Assessment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Called At</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                  No candidates match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const summary = c.interview_summaries?.[0];
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-indigo-700 text-xs font-semibold">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{c.email ?? c.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{c.job_role ?? "—"}</td>
                    <td className="px-6 py-4">
                      <MatchBadge score={matchScores[c.id]} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={summary?.call_status ?? c.status} />
                    </td>
                    <td className="px-6 py-4">
                      <AssessmentBadge assessment={summary?.assessment} />
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {fmt(c.called_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/candidates/${c.id}`}
                        className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
        {filtered.length} of {candidates.length} candidates · updates in real time
      </div>
    </div>
  );
}
