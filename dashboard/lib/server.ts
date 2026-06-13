import { createClient } from "@supabase/supabase-js";
import { AgentDispatchClient } from "livekit-server-sdk";

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

  const host = process.env.LIVEKIT_URL!.replace("wss://", "https://");
  const client = new AgentDispatchClient(
    host,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  await client.createDispatch(roomName, "flowgentic-hire", {
    metadata: JSON.stringify(candidate),
  });

  return roomName;
}
