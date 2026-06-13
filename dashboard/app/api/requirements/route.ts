import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// OpenAI semantic matching
// ---------------------------------------------------------------------------

interface MatchResult {
  candidate_id: string;
  score: number;
  reason: string;
}

async function matchWithOpenAI(
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string,
  experienceLevel: string,
  candidates: any[]
): Promise<MatchResult[]> {
  const candidateProfiles = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    job_role: c.job_role,
    location: c.location ?? null,
    current_position: c.current_position ?? null,
    skills: c.skills ?? null,
    experience_years: c.experience_years ?? null,
  }));

  const systemPrompt = `You are a technical recruiter AI. Given a job requirement and a list of candidates, score each candidate from 0–100 based on how well they match the role. Be semantic and generous — partial skill matches, adjacent technologies, and transferable experience should earn partial credit.

Return ONLY valid JSON in this exact format:
{
  "matches": [
    { "candidate_id": "<uuid>", "score": <0-100 integer>, "reason": "<concise 6-10 word reason>" }
  ]
}

Include ALL candidates in the response. Score 0 for completely irrelevant candidates.`;

  const userPrompt = `JOB REQUIREMENT:
Title: ${jobTitle}
Required Skills: ${requiredSkills}
Experience Level: ${experienceLevel}
Description: ${jobDescription?.slice(0, 800) ?? ""}

CANDIDATES:
${JSON.stringify(candidateProfiles, null, 2)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const parsed = JSON.parse(response.choices[0].message.content ?? "{}");
  return (parsed.matches ?? []) as MatchResult[];
}

// ---------------------------------------------------------------------------

async function generateJobId(supabase: ReturnType<typeof createServerSupabase>): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("job_requirements")
    .select("*", { count: "exact", head: true });
  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `HIRE-${year}-${seq}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, location, description, required_skills, experience_level, recruiter_name } = body;

    const supabase = createServerSupabase();

    const jobId = await generateJobId(supabase);

    // 1. Save requirement (DB columns: skills, experience)
    const { data: requirement, error: reqError } = await supabase
      .from("job_requirements")
      .insert({
        title,
        location,
        description,
        skills: required_skills,
        experience: experience_level,
        recruiter_name: recruiter_name || "Recruiter",
        job_id: jobId,
        status: "matching",
      })
      .select()
      .single();

    if (reqError) throw reqError;

    // 2. Fetch all candidates with their latest interview summary
    const { data: candidates } = await supabase
      .from("candidates")
      .select("id, name, job_role, location, skills, experience_years, current_position")
      .neq("status", "skipped");

    if (!candidates || candidates.length === 0) {
      await supabase.from("job_requirements").update({ status: "matched" }).eq("id", requirement.id);
      return NextResponse.json({ id: requirement.id, matched: 0 });
    }

    // 3. Run OpenAI semantic matching
    const matches = await matchWithOpenAI(
      title,
      description,
      required_skills,
      experience_level,
      candidates
    );

    // 4. Filter below 40% and sort descending
    const qualified = matches
      .filter((m) => m.score >= 40)
      .sort((a, b) => b.score - a.score);

    // 5. Save matches to requirement_candidates
    if (qualified.length > 0) {
      await supabase.from("requirement_candidates").insert(
        qualified.map((m) => ({
          requirement_id: requirement.id,
          candidate_id: m.candidate_id,
          match_score: m.score,
          call_status: "queued",
          match_reason: m.reason,
        }))
      );
    }

    // 6. Mark requirement as matched
    await supabase.from("job_requirements").update({ status: "matched" }).eq("id", requirement.id);

    return NextResponse.json({ id: requirement.id, matched: qualified.length });
  } catch (err: any) {
    console.error("requirements POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("job_requirements")
    .select("*, requirement_candidates(count)")
    .order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}
