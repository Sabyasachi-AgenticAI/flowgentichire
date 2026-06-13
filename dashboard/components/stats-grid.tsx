import type { CandidateWithSummary } from "@/lib/supabase";

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-6 py-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${accent ?? "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

export function StatsGrid({ candidates }: { candidates: CandidateWithSummary[] }) {
  const total = candidates.length;
  const summaries = candidates.flatMap((c) => c.interview_summaries ?? []);
  const shortlisted = summaries.filter((s) =>
    s.assessment?.toLowerCase().includes("shortlist")
  ).length;
  const hold = summaries.filter((s) =>
    s.assessment?.toLowerCase().includes("hold")
  ).length;
  const rejected = summaries.filter((s) =>
    s.assessment?.toLowerCase().includes("reject")
  ).length;
  const voicemail = summaries.filter((s) => s.call_status === "voicemail").length;
  const pending = candidates.filter((c) => c.status === "pending").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <Stat label="Total" value={total} />
      <Stat label="Shortlisted" value={shortlisted} accent="text-emerald-600" />
      <Stat label="On Hold" value={hold} accent="text-amber-600" />
      <Stat label="Rejected" value={rejected} accent="text-rose-600" />
      <Stat label="Voicemail" value={voicemail} accent="text-slate-500" />
      <Stat label="Pending" value={pending} accent="text-indigo-600" />
    </div>
  );
}
