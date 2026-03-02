import { NextResponse } from "next/server";
import OpenAI from "openai";
import { retrieveFromPersonaCsv } from "@/lib/rag/personaCsvRetriever";

type RagRequest = {
  context?: string;
  robot_event?: string;
  human_state?: string;
  goal?: string;
  k?: number;
  constraints?: {
    maxChars?: number;
    tone?: string; // e.g., "firm_polite"
    language?: "ko" | "en";
  };
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    const body = (await req.json()) as RagRequest;
    const {
      context = "",
      robot_event = "",
      human_state = "",
      goal = "",
      k = 5,
      constraints = {},
    } = body;

    const maxChars = constraints.maxChars ?? 30;
    const tone = constraints.tone ?? "firm_polite";
    const language = constraints.language ?? "ko";

    /** 1) Retrieval: persona.csv에서 evidence 가져오기 (공통 모듈 사용) */
    const { query, evidence } = retrieveFromPersonaCsv({
      context,
      robot_event,
      human_state,
      goal,
      k,
    });

    /** 2) evidence를 프롬프트용 텍스트로 */
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

    /** 3) 프롬프트: eHMI 메시지 1개 + 근거 */
    const prompt = `
You are helping an eHMI/HRI designer.
Generate ONE short eHMI message for shared mobility based on the DESIGN INPUT.
Ground your decision ONLY on the EVIDENCE CASES below.

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
  "rationale": "1-2 sentences, explicitly grounded in evidence cases",
  "citations": [
    { "id": "string", "snippet": "string" }
  ]
}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const content = completion.choices[0].message?.content ?? "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { message: "", rationale: "", citations: [] };
    }

    /** 4) payload */
    const payload = {
      mode: "rag_ehmi",
      query,
      retrieved_count: evidence.length,
      evidence, // 디버깅용: 나중에 숨겨도 됨
      ...parsed,
    };

    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    console.error("RAG API Error:", err);
    return NextResponse.json({ error: "RAG generation failed" }, { status: 500 });
  }
}