import { createSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentBadge } from "@/components/assessment-badge";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value || "—"}</dd>
    </div>
  );
}

export default async function CandidateDetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseClient();

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!candidate) notFound();

  const { data: summaries } = await supabase
    .from("interview_summaries")
    .select("*")
    .eq("candidate_id", params.id)
    .order("called_at", { ascending: false });

  const summary = summaries?.[0] ?? null;
  const callDate = candidate.called_at
    ? new Date(candidate.called_at).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Dashboard
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <span className="text-indigo-700 font-semibold text-xl">
            {candidate.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 truncate">{candidate.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{candidate.job_role ?? "—"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={summary?.call_status ?? candidate.status} />
          {summary?.assessment && <AssessmentBadge assessment={summary.assessment} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Contact Details</h2>
          <dl className="space-y-4">
            <Field label="Phone" value={candidate.phone} />
            <Field label="Email" value={candidate.email} />
            <Field label="Called At" value={callDate} />
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={candidate.status} />
              </dd>
            </div>
          </dl>
        </div>

        {/* Interview results */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Interview Results</h2>

          {!summary ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium">Interview pending</p>
              <p className="text-xs mt-1">Run the caller to screen this candidate.</p>
            </div>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Confirmed Name" value={summary.confirmed_name} />
              <Field label="Email" value={summary.email} />
              <Field label="Current Role" value={summary.current_position} />
              <Field label="Experience" value={summary.experience_years} />
              <Field label="Notice Period" value={summary.notice_period} />
              <Field label="Current CTC" value={summary.current_ctc} />
              <Field label="Expected CTC" value={summary.expected_ctc} />
              <div className="sm:col-span-2">
                <Field label="Skills" value={summary.skills} />
              </div>
            </dl>
          )}
        </div>
      </div>

      {/* Assessment card */}
      {summary?.assessment && (
        <div
          className={`rounded-xl border p-6 ${
            summary.assessment.toLowerCase().includes("shortlist")
              ? "bg-emerald-50 border-emerald-200"
              : summary.assessment.toLowerCase().includes("reject")
              ? "bg-rose-50 border-rose-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <h2 className="text-sm font-semibold text-slate-700 mb-2">AI Assessment</h2>
          <p className="text-sm text-slate-800 leading-relaxed">{summary.assessment}</p>
        </div>
      )}

      {/* Previous attempts */}
      {summaries && summaries.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Previous Call Attempts ({summaries.length})
          </h2>
          <div className="space-y-3">
            {summaries.slice(1).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-500">
                  {new Date(s.called_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <StatusBadge status={s.call_status} />
                <AssessmentBadge assessment={s.assessment} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
