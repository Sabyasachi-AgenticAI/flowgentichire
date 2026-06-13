type CallStatus = "completed" | "voicemail" | "call_failed" | "calling" | "pending" | "done" | "failed" | "skipped" | string | null;

const CONFIG: Record<string, { label: string; classes: string; dot?: string }> = {
  completed: { label: "Completed", classes: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  done:      { label: "Done",      classes: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  calling:   { label: "Calling…",  classes: "bg-yellow-50 text-yellow-700 ring-yellow-600/20", dot: "animate-pulse" },
  voicemail: { label: "Voicemail", classes: "bg-slate-100 text-slate-600 ring-slate-500/20" },
  call_failed: { label: "Failed",  classes: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  failed:    { label: "Failed",    classes: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  pending:   { label: "Pending",   classes: "bg-slate-100 text-slate-500 ring-slate-400/20" },
  skipped:   { label: "Skipped",   classes: "bg-slate-100 text-slate-400 ring-slate-300/20" },
};

export function StatusBadge({ status }: { status: CallStatus }) {
  const cfg = (status && CONFIG[status]) || {
    label: status ?? "Unknown",
    classes: "bg-slate-100 text-slate-500 ring-slate-400/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cfg.classes}`}
    >
      {cfg.dot && <span className={`w-1.5 h-1.5 rounded-full bg-current ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
}
