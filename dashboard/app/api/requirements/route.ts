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

const BATCH_SIZE = 20;

async function matchBatch(
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string,
  experienceLevel: string,
  batch: any[]
): Promise<MatchResult[]> {
  const profiles = batch.map((c) => ({
    id: c.id,
    job_role: c.job_role ?? "",
    skills: c.skills ?? "",
    experience_years: c.experience_years ?? "",
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a recruiter AI. Score each candidate 0–100 for the role. Be generous with partial matches.
Return ONLY valid JSON: {"matches":[{"candidate_id":"<id>","score":<int>,"reason":"<6-10 words>"}]}
Include ALL candidates. Score 0 if irrelevant.`,
      },
      {
        role: "user",
        content: `ROLE: ${jobTitle} | Skills: ${requiredSkills} | Level: ${experienceLevel}
JD: ${jobDescription?.slice(0, 400) ?? ""}

CANDIDATES:
${JSON.stringify(profiles)}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 800,
  });

  const parsed = JSON.parse(response.choices[0].message.content ?? "{}");
  return (parsed.matches ?? []) as MatchResult[];
}

async function matchWithOpenAI(
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string,
  experienceLevel: string,
  candidates: any[]
): Promise<MatchResult[]> {
  // Split into batches and run all in parallel
  const batches: any[][] = [];
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    batches.push(candidates.slice(i, i + BATCH_SIZE));
  }

  const batchResults = await Promise.all(
    batches.map((batch) =>
      matchBatch(jobTitle, jobDescription, requiredSkills, experienceLevel, batch)
    )
  );

  return batchResults.flat();
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
