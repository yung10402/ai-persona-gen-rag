import { NextResponse } from "next/server";
import OpenAI from "openai";

type GeneratePersonaBody = {
  ageRange?: string;
  gender?: string;
  occupation?: string;
  serviceSummary?: string;
  userGoal?: string;
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

    const {
      ageRange = "",
      gender = "",
      occupation = "",
      serviceSummary = "",
      userGoal = "",
    } = (await req.json()) as GeneratePersonaBody;

    const prompt = `
You are an AI persona generator for UX research.
Using the following inputs, create ONE realistic product user persona.

- Age range: ${ageRange || "unknown"}
- Gender: ${gender || "unknown"}
- Occupation: ${occupation || "unknown"}
- Service summary: ${serviceSummary || "unknown"}
- User Character: ${userGoal || "unknown"}

Return ONLY a valid JSON object with EXACTLY this shape (no explanation, no markdown):
{
  "persona": {
    "name": "a realistic Korean full name written in Hangul (e.g., \\"김민준\\")",
    "summary": "A 4-5 sentence synthesis capturing this persona’s motivations, context, digital literacy level, and product-relevant behaviors."
  },
  "behavior": [],
  "needs": [],
  "pain": [],
  "scenario": ""
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = completion.choices[0].message?.content ?? "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json({
      ...parsed,
      meta: {
        ageRange,
        gender,
        occupation,
        serviceSummary,
      },
    });
  } catch (err) {
    console.error("Persona API Error:", err);
    return NextResponse.json(
      { error: "Failed to generate persona" },
      { status: 500 }
    );
  }
}