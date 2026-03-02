import { NextResponse } from "next/server";
import OpenAI from "openai";
import { retrieveFromPersonaCsv } from "../../../lib/rag/personaCsvRetriever";

/** 입력 스키마: eHMI */
type GenerateEhmiBody = {
  mobilityType?: string;
  location?: string;
  interaction?: string;
  riskLevel?: "low" | "mid" | "high";
  targetUser?: string[];
  distanceM?: number;
  speedMps?: number;
  constraints?: {
    maxChars?: number;
    tone?: string;
    language?: "ko" | "en";
  };
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log("OPENAI_API_KEY length:", (apiKey ?? "").length);
    console.log("OPENAI_API_KEY prefix:", (apiKey ?? "").slice(0, 7));
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    /** body 파싱 */
    const body = (await req.json()) as GenerateEhmiBody;

    const mobilityType = body.mobilityType ?? "";
    const location = body.location ?? "";
    const interaction = body.interaction ?? "";
    const riskLevel = body.riskLevel ?? "mid";
    const targetUser = body.targetUser ?? [];
    const distanceM = body.distanceM;
    const speedMps = body.speedMps;

    const constraints = body.constraints ?? {};
    const maxChars = constraints.maxChars ?? 30;
    const tone = constraints.tone ?? "firm_polite";
    const language = constraints.language ?? "ko";

    /** RAG retrieval: persona.csv 기반 (임시 매핑) */
    const { query, evidence } = retrieveFromPersonaCsv({
      context: `mobilityType=${mobilityType}, location=${location}, distance=${distanceM ?? "unknown"}m, speed=${speedMps ?? "unknown"}m/s`,
      robot_event: interaction,
      human_state: targetUser.join(", "),
      goal: `riskLevel=${riskLevel}, tone=${tone}, language=${language}, maxChars=${maxChars}`,
      k: 5,
    });

    /** evidence를 프롬프트용 텍스트로 */
    const evidenceText = evidence
      .map((e, i) => {
        return `
[Case ${i + 1} | id=${e.id}]
Context: ${e.context}
Robot event: ${e.robot_event}
Human state: ${e.human_state}
Observed scenario: ${e.scenario}
Emotion reason: ${e.emotion_reason}
Desired eHMI: ${e.ehmi_need}
`.trim();
      })
      .join("\n\n");

    /** 프롬프트 */
    const prompt = `
You generate short eHMI messages for shared mobility robots/vehicles.
Ground the message ONLY on the EVIDENCE CASES below.

DESIGN INPUT:
${query}

CONSTRAINTS:
- maxChars: ${maxChars}
- tone: ${tone}
- language: ${language}

EVIDENCE CASES (from persona.csv):
${evidenceText}

Return ONLY valid JSON with this exact shape:
{
  "message": "string (very short eHMI message, respect maxChars as much as possible)",
  "rationale": "1-2 sentences grounded in evidence cases",
  "citations": [
    { "id": "string", "snippet": "string" }
  ]
}
`.trim();

    /** OpenAI 호출 */
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const content = completion.choices[0].message?.content ?? "{}";

    /** JSON 파싱 + 안전장치 */
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { message: "", rationale: "", citations: [] };
    }

    /** 응답 */
    const result = {
      ...parsed,
      debug: {
        input: {
          mobilityType,
          location,
          interaction,
          riskLevel,
          targetUser,
          distanceM,
          speedMps,
          constraints: { maxChars, tone, language },
        },
        retrieved_count: evidence.length,
        retrieved: evidence,
      },
    };

    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    console.error("eHMI API Error:", err);
    return NextResponse.json({ error: "Failed to generate eHMI message" }, { status: 500 });
  }
}