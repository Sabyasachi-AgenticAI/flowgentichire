import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/server";

// VoBiz sends Twilio-compatible webhooks as application/x-www-form-urlencoded.
// Standard fields: CallSid, CallStatus, CallDuration, To (dialed number), From (trunk number).
//
// CallStatus values: initiated | ringing | in-progress | completed | busy | no-answer | failed

const VOBIZ_STATUSES_FINAL = new Set(["completed", "busy", "no-answer", "failed"]);

// Map VoBiz terminal statuses → our call_status values for fallback updates
const STATUS_MAP: Record<string, string> = {
  completed: "completed",
  busy: "call_failed",
  "no-answer": "voicemail",
  failed: "call_failed",
};

function parsePayload(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const out: Record<string, string> = {};
  params.forEach((v, k) => { out[k] = v; });
  return out;
}

export async function POST(req: NextRequest) {
  // Validate optional shared secret (set VOBIZ_WEBHOOK_SECRET in .env.local)
  const secret = process.env.VOBIZ_WEBHOOK_SECRET;
  if (secret) {
    const incoming = req.headers.get("x-vobiz-signature") ?? req.nextUrl.searchParams.get("secret");
    if (incoming !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: Record<string, string>;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    payload = await req.json();
  } else {
    // form-urlencoded (VoBiz default)
    const raw = await req.text();
    payload = parsePayload(raw);
  }

  const callSid = payload.CallSid ?? payload.call_sid ?? "";
  const callStatus = (payload.CallStatus ?? payload.call_status ?? "").toLowerCase();
  const callDuration = parseInt(payload.CallDuration ?? payload.call_duration ?? "0", 10);
  const toNumber = payload.To ?? payload.to ?? "";

  if (!callStatus) {
    return NextResponse.json({ error: "Missing CallStatus" }, { status: 400 });
  }

  // Only act on final statuses — ignore intermediate in-progress events
  if (!VOBIZ_STATUSES_FINAL.has(callStatus)) {
    return new NextResponse(twiml(), { status: 200, headers: xmlHeaders() });
  }

  const supabase = createServerSupabase();

  // --- 1. Update interview_summaries with call duration and SID ---
  if (toNumber) {
    // Find the most recent interview summary for this phone, in a non-final state
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .eq("phone", toNumber)
      .in("status", ["calling", "done"])
      .order("called_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (candidate) {
      const updateData: Record<string, unknown> = {
        call_sid: callSid || null,
      };
      if (callDuration > 0) {
        updateData.call_duration_seconds = callDuration;
      }

      await supabase
        .from("interview_summaries")
        .update(updateData)
        .eq("candidate_id", candidate.id)
        .order("created_at", { ascending: false })
        .limit(1);

      // --- 2. Fallback: if agent never updated the candidate, do it now ---
      const { data: stillCalling } = await supabase
        .from("candidates")
        .select("id")
        .eq("id", candidate.id)
        .eq("status", "calling")
        .maybeSingle();

      if (stillCalling) {
        const fallbackStatus = STATUS_MAP[callStatus] ?? "call_failed";

        await supabase
          .from("candidates")
          .update({ status: "done" })
          .eq("id", candidate.id);

        // Find the active requirement_candidate row
        const { data: rc } = await supabase
          .from("requirement_candidates")
          .select("id, requirement_id, candidates!inner(id)")
          .eq("candidates.id", candidate.id)
          .eq("call_status", "calling")
          .maybeSingle();

        if (rc) {
          await supabase
            .from("requirement_candidates")
            .update({ call_status: fallbackStatus })
            .eq("id", rc.id);

          await supabase.from("requirement_activity").insert({
            requirement_id: rc.requirement_id,
            message: `VoBiz webhook: ${toNumber} — ${callStatus}${callDuration > 0 ? ` (${callDuration}s)` : ""}`,
            icon: callStatus === "completed" ? "success" : "error",
          });
        }
      }
    }
  }

  // VoBiz/Twilio expects a TwiML response (even an empty one)
  return new NextResponse(twiml(), { status: 200, headers: xmlHeaders() });
}

function twiml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
}

function xmlHeaders(): Record<string, string> {
  return { "Content-Type": "text/xml" };
}
