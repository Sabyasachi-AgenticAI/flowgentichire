import { createSupabaseClient, type CandidateWithSummary } from "@/lib/supabase";
import { createServerSupabase } from "@/lib/server";
import { MainTabs } from "@/components/main-tabs";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = createSupabaseClient();
  const serverSupabase = createServerSupabase();

  const [{ data }, { data: matchData }, { data: requirements }] = await Promise.all([
    supabase
      .from("candidates")
      .select("*, interview_summaries(*)")
      .order("created_at", { ascending: false }),
    serverSupabase
      .from("requirement_candidates")
      .select("candidate_id, match_score")
      .order("match_score", { ascending: false }),
    serverSupabase
      .from("job_requirements")
      .select("id, title, location, status")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const candidates = (data ?? []) as CandidateWithSummary[];

  const matchScores: Record<string, number> = {};
  for (const m of (matchData ?? []) as Array<{ candidate_id: string; match_score: number }>) {
    if (!matchScores[m.candidate_id] || m.match_score > matchScores[m.candidate_id]) {
      matchScores[m.candidate_id] = m.match_score;
    }
  }

  return (
    <MainTabs
      candidates={candidates}
      matchScores={matchScores}
      requirements={requirements ?? []}
    />
  );
}
