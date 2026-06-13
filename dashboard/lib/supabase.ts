import { createClient } from "@supabase/supabase-js";

export type Candidate = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  job_role: string | null;
  status: "pending" | "calling" | "done" | "skipped" | "failed";
  created_at: string;
  called_at: string | null;
};

export type InterviewSummary = {
  id: string;
  candidate_id: string;
  confirmed_name: string | null;
  email: string | null;
  current_position: string | null;
  experience_years: string | null;
  skills: string | null;
  notice_period: string | null;
  current_ctc: string | null;
  expected_ctc: string | null;
  assessment: string | null;
  call_status: "completed" | "voicemail" | "call_failed" | null;
  called_at: string;
};

export type CandidateWithSummary = Candidate & {
  interview_summaries: InterviewSummary[];
};

export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for client components
export const supabase = createSupabaseClient();
