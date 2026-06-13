"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import ScoutLiveView from "@/components/scout-live-view";

type JDFormData = {
  recruiter_name: string;
  title: string;
  location: string;
  description: string;
  required_skills: string;
  experience_level: string;
};

type Phase = "form" | "matched";

const EXPERIENCE_LEVELS = [
  "Junior (0-2 yrs)",
  "Mid (3-5 yrs)",
  "Senior (5-8 yrs)",
  "Lead (8+ yrs)",
  "Any",
];

function UploadZone({
  onParsed,
  disabled,
}: {
  onParsed: (fields: Partial<JDFormData>) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "doc", "docx"].includes(ext || "")) {
        setError("Only PDF or Word documents are supported.");
        return;
      }
      setUploading(true);
      setError(null);
      setFileName(file.name);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/parse-jd", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Parse failed");
        onParsed(data);
      } catch (err: any) {
        setError(err.message);
        setFileName(null);
      } finally {
        setUploading(false);
      }
    },
    [onParsed]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && !uploading && inputRef.current?.click()}
      className={`
        relative rounded-xl border-2 border-dashed transition-all cursor-pointer select-none
        ${dragging ? "border-indigo-400 bg-indigo-50/60" : "border-slate-200 bg-slate-50/40 hover:border-indigo-300 hover:bg-indigo-50/30"}
        ${disabled || uploading ? "pointer-events-none opacity-60" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
      />
      <div className="flex flex-col items-center justify-center gap-2 py-7 px-4">
        {uploading ? (
          <>
            <svg className="animate-spin w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-indigo-600">Reading {fileName}…</p>
            <p className="text-xs text-slate-400">AI is extracting job details</p>
          </>
        ) : fileName ? (
          <>
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-emerald-700">{fileName}</p>
            <p className="text-xs text-slate-400">Fields populated — edit below if needed</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">Drop your JD here</p>
              <p className="text-xs text-slate-400 mt-0.5">
                PDF · Word document &nbsp;·&nbsp;
                <span className="text-indigo-500 font-medium">browse files</span>
              </p>
            </div>
          </>
        )}
      </div>
      {error && (
        <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-rose-500">{error}</p>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-colors";

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
      {label}
      {required && <span className="text-indigo-400 ml-0.5">*</span>}
    </label>
  );
}

export function RequirementForm({ embedded = false }: { embedded?: boolean }) {
  const [phase, setPhase] = useState<Phase>("form");
  const [matchedCandidates, setMatchedCandidates] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [requirement, setRequirement] = useState<any>(null);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<JDFormData>({
    recruiter_name: "",
    title: "",
    location: "",
    description: "",
    required_skills: "",
    experience_level: "Mid (3-5 yrs)",
  });

  const set =
    (k: keyof JDFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleParsed = (fields: Partial<JDFormData>) =>
    setForm((f) => ({ ...f, ...fields }));

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatching(true);
    setError(null);
    try {
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Matching failed");
      window.history.replaceState({}, "", `/requirements/${data.id}`);
      await loadRequirementData(data.id);
      setPhase("matched");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMatching(false);
    }
  };

  const loadRequirementData = async (id: string) => {
    const supabase = createSupabaseClient();
    const [{ data: rawCands }, { data: acts }, { data: req }] = await Promise.all([
      supabase
        .from("requirement_candidates")
        .select("*, candidates(*, interview_summaries(*))")
        .eq("requirement_id", id)
        .order("match_score", { ascending: false }),
      supabase
        .from("requirement_activity")
        .select("*")
        .eq("requirement_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("job_requirements").select("*").eq("id", id).single(),
    ]);

    if (rawCands) {
      setMatchedCandidates(
        rawCands.map((rc: any) => ({
          ...rc,
          interview_summaries: rc.candidates?.interview_summaries || [],
          candidates: {
            id: rc.candidates?.id,
            name: rc.candidates?.name,
            phone: rc.candidates?.phone,
            email: rc.candidates?.email,
            job_role: rc.candidates?.job_role,
          },
        }))
      );
    }
    if (acts) setActivities(acts);
    if (req) setRequirement(req);
  };

  const resetForm = () => {
    setPhase("form");
    setMatchedCandidates([]);
    setActivities([]);
    setRequirement(null);
    window.history.replaceState({}, "", "/");
  };

  return (
    <div className="space-y-5">
      {/* Back link — standalone page only */}
      {!embedded && phase === "form" && (
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Dashboard
        </Link>
      )}

      {/* ── FORM PHASE ── */}
      {phase === "form" && (
        <form onSubmit={handleMatch}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
            {/* Recruiter identity */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">Initiated by</p>
                <input
                  required
                  value={form.recruiter_name}
                  onChange={set("recruiter_name")}
                  placeholder="Recruiter Name"
                  className="w-full text-sm font-medium text-slate-900 bg-transparent border-0 border-b border-dashed border-slate-200 focus:outline-none focus:border-indigo-400 pb-0.5 placeholder-slate-300"
                />
              </div>
            </div>

            <UploadZone onParsed={handleParsed} disabled={matching} />

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-slate-100" />
              <span className="mx-3 text-xs text-slate-400">or fill manually</span>
              <div className="flex-grow border-t border-slate-100" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FieldLabel label="Job Title" required />
                <input
                  required
                  value={form.title}
                  onChange={set("title")}
                  placeholder="e.g. Senior DevOps Engineer"
                  className={inputCls}
                />
              </div>

              <div>
                <FieldLabel label="Location" />
                <input
                  value={form.location}
                  onChange={set("location")}
                  placeholder="e.g. Bengaluru / Remote"
                  className={inputCls}
                />
              </div>

              <div>
                <FieldLabel label="Experience Level" />
                <select value={form.experience_level} onChange={set("experience_level")} className={inputCls}>
                  {EXPERIENCE_LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <FieldLabel label="Required Skills" required />
                <input
                  required
                  value={form.required_skills}
                  onChange={set("required_skills")}
                  placeholder="e.g. Kubernetes, Terraform, AWS, CI/CD"
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel label="Job Description" required />
                <textarea
                  required
                  rows={5}
                  value={form.description}
                  onChange={set("description")}
                  placeholder="Describe the role, team, responsibilities…"
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={matching}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              {matching ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analysing candidates…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Find Matching Candidates
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ── MATCHED PHASE ── */}
      {phase === "matched" && requirement && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{requirement.title}</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {[requirement.location, requirement.experience].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              onClick={resetForm}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 mt-1 inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New
            </button>
          </div>

          {matchedCandidates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-12 text-center">
              <p className="text-slate-500 font-medium">No matching candidates found</p>
              <p className="text-sm text-slate-400 mt-1">Try broadening the skills or experience level.</p>
              <button
                onClick={resetForm}
                className="mt-4 text-sm text-indigo-600 hover:underline font-medium"
              >
                Adjust requirement →
              </button>
            </div>
          ) : (
            <ScoutLiveView
              requirement={requirement}
              candidates={matchedCandidates}
              activities={activities}
              inline
            />
          )}
        </>
      )}
    </div>
  );
}
