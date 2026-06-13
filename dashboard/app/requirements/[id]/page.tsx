import { createServerSupabase } from "@/lib/server";
import { notFound } from "next/navigation";
import ScoutLiveView from "@/components/scout-live-view";

export const dynamic = "force-dynamic";

export default async function RequirementPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabase();

  const { data: requirement } = await supabase
    .from("job_requirements")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!requirement) notFound();

  const { data: rawCandidates } = await supabase
    .from("requirement_candidates")
    .select("*, candidates(*, interview_summaries(*))")
    .eq("requirement_id", params.id)
    .order("match_score", { ascending: false });

  const candidates = (rawCandidates || []).map((rc: any) => ({
    ...rc,
    interview_summaries: rc.candidates?.interview_summaries || [],
    candidates: {
      id: rc.candidates?.id,
      name: rc.candidates?.name,
      phone: rc.candidates?.phone,
      email: rc.candidates?.email,
      job_role: rc.candidates?.job_role,
    },
  }));

  const { data: activities } = await supabase
    .from("requirement_activity")
    .select("*")
    .eq("requirement_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <ScoutLiveView
      requirement={requirement}
      candidates={candidates}
      activities={activities || []}
    />
  );
}
