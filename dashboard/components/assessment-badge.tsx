export function AssessmentBadge({
  assessment,
}: {
  assessment: string | null | undefined;
}) {
  if (!assessment) {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  const lower = assessment.toLowerCase();
  const isShortlist = lower.includes("shortlist");
  const isReject = lower.includes("reject");

  const styles = isShortlist
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
    : isReject
    ? "bg-rose-50 text-rose-700 ring-rose-600/20"
    : "bg-amber-50 text-amber-700 ring-amber-600/20";

  const label = isShortlist ? "Shortlist" : isReject ? "Reject" : "Hold";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  );
}
