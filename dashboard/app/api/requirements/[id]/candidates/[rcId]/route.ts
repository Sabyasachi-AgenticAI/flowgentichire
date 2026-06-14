import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, dispatchAgent } from "@/lib/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; rcId: string } }
) {
  const supabase = createServerSupabase();
  const { id: requirementId, rcId } = params;

  const body = await req.json();
  const action: "queue" | "hold" | "retry" = body.action;

  if (!["queue", "hold", "retry"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: rc } = await supabase
    .from("requirement_candidates")
    .select("*, candidates(*)")
    .eq("id", rcId)
    .eq("requirement_id", requirementId)
    .single();

  if (!rc) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const { data: requirement } = await supabase
    .from("job_requirements")
    .select("*")
    .eq("id", requirementId)
    .single();

  if (!requirement) {
    return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  }

  if (action === "hold") {
    await supabase
      .from("requirement_candidates")
      .update({ call_status: "on_hold" })
      .eq("id", rcId);

    await supabase.from("requirement_activity").insert({
      requirement_id: requirementId,
      message: `${rc.candidates.name} moved to on hold`,
      icon: "info",
    });

    return NextResponse.json({ ok: true });
  }

  // "queue" or "retry" — add candidate back to the queue
  await supabase
    .from("requirement_candidates")
    .update({ call_status: "queued" })
    .eq("id", rcId);

  // Check if any call is currently active for this requirement
  const { data: activeCalls } = await supabase
    .from("requirement_candidates")
    .select("id")
    .eq("requirement_id", requirementId)
    .eq("call_status", "calling")
    .limit(1);

  const isCallActive = activeCalls && activeCalls.length > 0;

  if (!isCallActive) {
    // No active call — dispatch this candidate immediately
    const candidate = rc.candidates as any;

    try {
      await dispatchAgent({
        requirement_id: requirementId,
        requirement_candidate_id: rcId,
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
        .eq("id", rcId);

      await supabase
        .from("candidates")
        .update({ status: "calling" })
        .eq("id", candidate.id);

      // Make sure requirement is executing
      await supabase
        .from("job_requirements")
        .update({ status: "executing" })
        .eq("id", requirementId);

      await supabase.from("requirement_activity").insert({
        requirement_id: requirementId,
        message: `Calling ${candidate.name}`,
        icon: "calling",
      });
    } catch (err: any) {
      // Dispatch failed — leave candidate as queued so HR can retry
      await supabase.from("requirement_activity").insert({
        requirement_id: requirementId,
        message: `Could not reach ${candidate.name}: ${err.message.slice(0, 60)}`,
        icon: "error",
      });
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  } else {
    // A call is active — the agent will pick this candidate up via _dispatch_next
    await supabase.from("requirement_activity").insert({
      requirement_id: requirementId,
      message: `${rc.candidates.name} added to queue`,
      icon: "info",
    });
  }

  return NextResponse.json({ ok: true, dispatched: !isCallActive });
}
