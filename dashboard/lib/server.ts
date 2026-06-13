import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";

export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function dispatchAgent(candidate: {
  requirement_id: string;
  requirement_candidate_id: string;
  candidate_id: string;
  name: string;
  phone: string;
  email: string;
  job_role: string;
}): Promise<string> {
  const roomName = `hire-${candidate.candidate_id.slice(0, 8)}-${Date.now()}`;

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );
  at.addGrant({ roomAdmin: true, room: roomName });
  const token = await at.toJwt();

  const host = process.env.LIVEKIT_URL!.replace("wss://", "https://");
  const res = await fetch(
    `${host}/twirp/livekit.AgentDispatch/CreateDispatch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_name: "flowgentic-hire",
        room: roomName,
        metadata: JSON.stringify(candidate),
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LiveKit dispatch failed: ${err}`);
  }

  return roomName;
}
