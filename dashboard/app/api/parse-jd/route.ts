import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let text = "";

    if (file.name.toLowerCase().endsWith(".pdf")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (
      file.name.toLowerCase().endsWith(".docx") ||
      file.name.toLowerCase().endsWith(".doc")
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF or Word document." },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text from file." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Extract job requirement fields from the JD text provided.
Return ONLY valid JSON with these fields:
{
  "title": "concise job title (e.g. Senior DevOps Engineer)",
  "location": "city name, or Remote, or Hybrid (leave empty string if not mentioned)",
  "description": "2-3 sentence summary of the role and responsibilities",
  "required_skills": "comma-separated list of key technical skills",
  "experience_level": "one of: Junior (0-2 yrs) | Mid (3-5 yrs) | Senior (5-8 yrs) | Lead (8+ yrs) | Any"
}`,
        },
        {
          role: "user",
          content: text.slice(0, 5000),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const parsed = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("parse-jd error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
