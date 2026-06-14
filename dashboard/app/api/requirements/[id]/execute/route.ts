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

  // Fetch ALL queued candidates sorted by match_score
  const { data: allQueued } = await supabase
    .from("requirement_candidates")
    .select("*, candidates(*)")
    .eq("requirement_id", requirementId)
    .eq("call_status", "queued")
    .order("match_score", { ascending: false });

  if (!allQueued || allQueued.length === 0) {
    return NextResponse.json({ error: "No candidates to call" }, { status: 400 });
  }

  // Separate selected from non-selected
  let toDispatch = allQueued;
  let toHold: string[] = [];

  if (selectedIds.length > 0) {
    toHold = allQueued.filter((rc) => !selectedIds.includes(rc.id)).map((rc) => rc.id);
    toDispatch = allQueued.filter((rc) => selectedIds.includes(rc.id));
  }

  if (toDispatch.length === 0) {
    return NextResponse.json({ error: "Selected candidates are not queued" }, { status: 400 });
  }

  // Move non-selected to on_hold so they won't be auto-called
  if (toHold.length > 0) {
    await supabase
      .from("requirement_candidates")
      .update({ call_status: "on_hold" })
      .in("id", toHold);
  }

  await supabase
    .from("job_requirements")
    .update({ status: "executing" })
    .eq("id", requirementId);

  // Dispatch only the first (highest match) selected candidate.
  // The agent chains to the next "queued" one when each call ends.
  const first = toDispatch[0];
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
      company: requirement.company || "",
      location: requirement.location || "",
      description: requirement.description || "",
      required_skills: requirement.skills || "",
      experience_level: requirement.experience || "",
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
      message: `Starting calls — ${toDispatch.length} selected, ${toHold.length} on hold`,
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

  return NextResponse.json({ dispatched: 1, queued: toDispatch.length, on_hold: toHold.length });
}
