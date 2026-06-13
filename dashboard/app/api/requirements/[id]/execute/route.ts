import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, dispatchAgent } from "@/lib/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const requirementId = params.id;

  let selectedIds: string[] = [];
  try {
    const body = await req.json();
    selectedIds = body.selectedIds ?? [];
  } catch {
    // no body — fall back to all queued
  }

  const { data: requirement } = await supabase
    .from("job_requirements")
    .select("*")
    .eq("id", requirementId)
    .single();

  if (!requirement) {
    return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  }

  // Fetch selected (or all queued) candidates, sorted by match_score descending
  let query = supabase
    .from("requirement_candidates")
    .select("*, candidates(*)")
    .eq("requirement_id", requirementId)
    .eq("call_status", "queued")
    .order("match_score", { ascending: false });

  if (selectedIds.length > 0) {
    query = query.in("id", selectedIds);
  }

  const { data: reqCandidates } = await query;

  if (!reqCandidates || reqCandidates.length === 0) {
    return NextResponse.json({ error: "No candidates to call" }, { status: 400 });
  }

  await supabase
    .from("job_requirements")
    .update({ status: "executing" })
    .eq("id", requirementId);

  // Sequential: dispatch only the first (highest match) candidate.
  // The agent will dispatch the next one when each call concludes.
  const first = reqCandidates[0];
  const candidate = first.candidates as any;

  try {
    await dispatchAgent({
      requirement_id: requirementId,
      requirement_candidate_id: first.id,
      candidate_id: candidate.id,
      name: candidate.name,
      phone: candidate.phone,
      email: candidate.email || "",
      job_role: requirement.title,
    });

    await supabase
      .from("requirement_candidates")
      .update({ call_status: "calling", called_at: new Date().toISOString() })
      .eq("id", first.id);

    await supabase
      .from("candidates")
      .update({ status: "calling" })
      .eq("id", candidate.id);

    await supabase.from("requirement_activity").insert({
      requirement_id: requirementId,
      message: `Starting sequential calls — ${reqCandidates.length} candidate${reqCandidates.length > 1 ? "s" : ""} queued`,
      icon: "info",
    });

    await supabase.from("requirement_activity").insert({
      requirement_id: requirementId,
      message: `Calling ${candidate.name}`,
      icon: "calling",
    });
  } catch (err: any) {
    await supabase.from("requirement_activity").insert({
      requirement_id: requirementId,
      message: `Could not reach ${candidate.name}: ${err.message.slice(0, 60)}`,
      icon: "error",
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ dispatched: 1, total: reqCandidates.length });
}
