export function AssessmentBadge({
  assessment,
}: {
  assessment: string | null | undefined;
}) {
  if (!assessment) {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  const lower = assessment.toLowerCase();
  const isInterested = lower.includes("shortlist") || lower.includes("hold");
  const isNotInterested = lower.includes("reject");

  const styles = isInterested
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
    : isNotInterested
    ? "bg-rose-50 text-rose-700 ring-rose-600/20"
    : "bg-slate-100 text-slate-500 ring-slate-400/20";

  const label = isInterested ? "Interested" : isNotInterested ? "Not Interested" : "Pending";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  );
}
