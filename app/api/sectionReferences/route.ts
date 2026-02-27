// app/api/sectionReferences/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

type SectionKey = "persona" | "behavior" | "needs" | "pain" | "scenario";

type SectionReferencesBody = {
  sectionKey: SectionKey;
  sectionText: string[] | string; // behavior/needs/pain이면 배열, persona/scenario면 string
  meta: {
    ageRange?: string;
    gender?: string;
    occupation?: string;
    serviceSummary?: string;
    userGoal?: string;
  };
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }
    const openai = new OpenAI({ apiKey });

    const { sectionKey, sectionText, meta } =
      (await req.json()) as SectionReferencesBody;

    const sectionLabel =
      sectionKey === "persona"
        ? "persona summary"
        : sectionKey === "behavior"
        ? "behavior patterns"
        : sectionKey === "needs"
        ? "needs and goals"
        : sectionKey === "pain"
        ? "pain points"
        : "usage scenario";

    const textForPrompt =
      Array.isArray(sectionText) ? sectionText.join("\n- ") : sectionText;

    const prompt = `
You are an HCI/UX researcher.
The system has generated the following ${sectionLabel} for a user persona.

Persona meta:
- Age range: ${meta.ageRange || "unknown"}
- Gender: ${meta.gender || "unknown"}
- Occupation: ${meta.occupation || "unknown"}
- Service summary: ${meta.serviceSummary || "unknown"}
- User goal: ${meta.userGoal || "unknown"}

Section content:
${textForPrompt}

Task:
Based on the above, generate 5-6 REALISTIC references (not fake theory).
Each reference about persona must explain where such assumptions commonly come from
(e.g., blog post, stat, industry_report, behavioral data, survey).

Return ONLY JSON with this exact shape:

{
  "references": [
    {
      "title": "string (title of paper/report/article/dataset)",
      "type": "string (e.g., blog post, stat, industry_report, behavioral data, survey, etc.)",
      "detail": "1–2 sentence explanation of how this reference supports or motivates the section content",
      "source": "string (organization / journal / conference / author)",
      "url": "string (URL, or \\"\\" if unknown)"
    }
  ]
}

- If you are not sure about the exact URL, use a generic but plausible homepage
  (e.g., "https://nngroup.com") instead of inventing a deep link.
- Do NOT add any explanation outside the JSON.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const content = completion.choices[0].message?.content ?? "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("SectionReferences API Error:", err);
    return NextResponse.json(
      { error: "Failed to generate references" },
      { status: 500 }
    );
  }
}