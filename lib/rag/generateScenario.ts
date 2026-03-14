import { OpenAI } from "openai";
import "dotenv/config";
import { retrieveFromSurveyVectorStore } from "./vectorRetriever";

export type GenerateScenarioParams = {
  location?: string;
  pedestrian_state?: string;
  scenario_type?: string;
  k?: number;
};

export type RetrievedEvidence = {
  id: string;
  Participant_id: string;
  Place: string;
  pedestrian_state: string;
  Scenario_type: string;
  robot_behavior: string;
  robot_motion?: string;
  user_behavior: string;
  user_concern: string;
  user_needs: string;
  design_suggestion: string;
};

export type EvidenceSummary = {
  observed_robot_behavior_summary: string;
  pedestrian_response_summary: string;
  concern_need_summary: string;
};

export type ScenarioOption = {
  option_id: string;
  summary: string;
  narrative_scenario: string;
  participant_concerns: string[];
  participant_needs: string[];
  communication_strategy: string[];
  evidence_summary: EvidenceSummary;
  evidence: RetrievedEvidence;
};

export type GeneratedScenarioResult = {
  query: string;
  options: ScenarioOption[];
};

function buildSingleEvidenceBlock(item: RetrievedEvidence) {
  return [
    `Place: ${item.Place}`,
    `Pedestrian state: ${item.pedestrian_state}`,
    `Scenario type: ${item.Scenario_type}`,
    `Robot behavior: ${item.robot_behavior}`,
    item.robot_motion ? `Robot motion: ${item.robot_motion}` : "",
    `User behavior: ${item.user_behavior}`,
    `User concern: ${item.user_concern}`,
    `User needs: ${item.user_needs}`,
    `Design suggestion: ${item.design_suggestion}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function looksMostlyEnglish(text: string) {
  if (!text) return false;
  const koreanMatches = text.match(/[가-힣]/g) ?? [];
  const englishMatches = text.match(/[A-Za-z]/g) ?? [];
  return englishMatches.length > koreanMatches.length;
}

function optionHasTooMuchEnglish(option: Partial<ScenarioOption>) {
  const texts: string[] = [];

  if (option.summary) texts.push(option.summary);
  if (option.narrative_scenario) texts.push(option.narrative_scenario);
  if (option.participant_concerns) texts.push(...option.participant_concerns);
  if (option.participant_needs) texts.push(...option.participant_needs);
  if (option.communication_strategy) texts.push(...option.communication_strategy);
  if (option.evidence_summary?.observed_robot_behavior_summary) {
    texts.push(option.evidence_summary.observed_robot_behavior_summary);
  }
  if (option.evidence_summary?.pedestrian_response_summary) {
    texts.push(option.evidence_summary.pedestrian_response_summary);
  }
  if (option.evidence_summary?.concern_need_summary) {
    texts.push(option.evidence_summary.concern_need_summary);
  }

  return texts.some(looksMostlyEnglish);
}

async function regenerateInKorean(
  openai: OpenAI,
  rawJsonText: string
) {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
당신의 역할은 JSON 값을 모두 자연스러운 한국어로 다시 작성하는 것입니다.
규칙:
- JSON 구조는 절대 바꾸지 마세요.
- 키 이름은 절대 바꾸지 마세요.
- 모든 값만 한국어로 다시 작성하세요.
- 영어 단어, 영어 문장, 영어 표현을 남기지 마세요.
- 내용은 원래 의미를 유지하되, 더 자연스럽고 읽기 좋은 한국어로 다듬으세요.
- JSON만 출력하세요.
`.trim(),
      },
      {
        role: "user",
        content: rawJsonText,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

async function generateOptionFromEvidence(
  openai: OpenAI,
  params: GenerateScenarioParams,
  evidence: RetrievedEvidence,
  optionId: string
): Promise<ScenarioOption> {
  const evidenceBlock = buildSingleEvidenceBlock(evidence);

  const systemPrompt = `
당신은 배송 로봇 상호작용을 위한 디자인 어시스턴트입니다.

주어진 participant evidence만을 근거로, 하나의 디자인 옵션을 생성해야 합니다.

규칙:
- 반드시 evidence를 근거로 사용하세요.
- evidence에 없는 로봇 행동, 사용자 우려, 필요, 맥락 요소를 새로 만들어내지 마세요.
- 읽기 쉽고 장면이 그려지도록 약간 서술적으로 확장할 수는 있지만, 반드시 근거에 충실해야 합니다.
- JSON 안의 모든 값은 반드시 한국어로 작성하세요.
- 영어 단어, 영어 문장, 영어 표현을 사용하지 마세요.
- 디자이너가 읽기 좋은 정돈된 한국어 문장으로 작성하세요.
- "~했습니다", "~나타났습니다", "~필요했습니다"와 같은 서술형 문체를 기본으로 하세요.
- evidence summary는 단순 요약이 아니라 상황이 조금 더 상상되도록 4~6문장 정도로 작성하세요.
- JSON만 출력하세요.
`.trim();

  const userPrompt = `
Designer input:
- Location: ${params.location ?? ""}
- Pedestrian state: ${params.pedestrian_state ?? ""}
- Interaction scenario: ${params.scenario_type ?? ""}

Retrieved participant evidence:
${evidenceBlock}

다음 JSON 구조를 정확히 지켜서 출력하세요:

{
  "summary": "string",
  "narrative_scenario": "string",
  "participant_concerns": ["string"],
  "participant_needs": ["string"],
  "communication_strategy": ["string"],
  "evidence_summary": {
    "observed_robot_behavior_summary": "string",
    "pedestrian_response_summary": "string",
    "concern_need_summary": "string"
  }
}

작성 가이드:

- "summary":
  디자이너가 이 옵션의 핵심을 빠르게 이해할 수 있도록, 한국어 한 문장으로 작성하세요.

- "narrative_scenario":
  디자이너가 장면을 상상할 수 있도록, 상황을 조금 더 서사적으로 묘사한 한국어 시나리오를 4~6문장으로 작성하세요.
  보행자와 로봇이 어떤 맥락에서 마주하고, 로봇이 어떻게 행동하며, 보행자가 이를 어떻게 받아들이는지를 자연스럽게 드러내세요.
  다만 evidence에 없는 사건, 감정, 행동을 새로 만들지는 마세요.

- "participant_concerns":
  evidence에서 드러나는 핵심 우려를 한국어 리스트로 정리하세요.
  너무 짧은 단어 하나보다, 디자이너가 이해하기 쉬운 문장이나 구 형태가 좋습니다.

- "participant_needs":
  evidence에서 드러나는 핵심 필요를 한국어 리스트로 정리하세요.

- "communication_strategy":
  evidence를 바탕으로 가능한 커뮤니케이션 전략을 한국어 리스트로 제안하세요.
  시각적 신호, 메시지, 방향 표시, 정지 상태 표시 등 구체적이고 활용 가능한 형태로 쓰세요.

- "observed_robot_behavior_summary":
  로봇이 어떤 방식으로 움직이거나 멈추고, 주변 상황에 어떻게 반응했는지를 한국어로 4~6문장 정도로 정리하세요.
  단순 정보 나열이 아니라, 장면이 조금 더 그려지도록 묘사형으로 쓰세요.

- "pedestrian_response_summary":
  보행자가 로봇을 어떻게 관찰하고, 어떻게 반응했으며, 어떤 해석 과정을 거쳤는지를 한국어로 4~6문장 정도로 정리하세요.

- "concern_need_summary":
  이 상황에서 드러나는 우려와 필요가 무엇이며, 왜 그런 요구가 생겼는지를 한국어로 4~6문장 정도로 정리하세요.

중요:
- raw evidence를 그대로 복붙하지 말고, 디자이너가 읽기 좋은 방식으로 정리하세요.
- 하지만 evidence에 없는 새로운 사실은 추가하지 마세요.
- 가능하다면 옵션 A/B/C가 완전히 같은 방향으로 수렴하지 않도록, 상호작용 해석이나 커뮤니케이션 강조점을 조금씩 다르게 하세요.
- 모든 출력값은 반드시 한국어여야 합니다.
`.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.65,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  let content = response.choices[0]?.message?.content?.trim() ?? "";
  let parsed = safeJsonParse(content);

  if (!parsed) {
    throw new Error(`Failed to parse JSON for option ${optionId}`);
  }

  let draftOption: Partial<ScenarioOption> = {
    summary: parsed.summary ?? "",
    narrative_scenario: parsed.narrative_scenario ?? "",
    participant_concerns: Array.isArray(parsed.participant_concerns)
      ? parsed.participant_concerns
      : [],
    participant_needs: Array.isArray(parsed.participant_needs)
      ? parsed.participant_needs
      : [],
    communication_strategy: Array.isArray(parsed.communication_strategy)
      ? parsed.communication_strategy
      : [],
    evidence_summary: {
      observed_robot_behavior_summary:
        parsed.evidence_summary?.observed_robot_behavior_summary ?? "",
      pedestrian_response_summary:
        parsed.evidence_summary?.pedestrian_response_summary ?? "",
      concern_need_summary:
        parsed.evidence_summary?.concern_need_summary ?? "",
    },
  };

  // 영어가 많이 섞이면 한국어로 한 번 더 정제
  if (optionHasTooMuchEnglish(draftOption)) {
    const regenerated = await regenerateInKorean(openai, content);
    const reparsed = safeJsonParse(regenerated);

    if (reparsed) {
      draftOption = {
        summary: reparsed.summary ?? draftOption.summary ?? "",
        narrative_scenario:
          reparsed.narrative_scenario ?? draftOption.narrative_scenario ?? "",
        participant_concerns: Array.isArray(reparsed.participant_concerns)
          ? reparsed.participant_concerns
          : draftOption.participant_concerns ?? [],
        participant_needs: Array.isArray(reparsed.participant_needs)
          ? reparsed.participant_needs
          : draftOption.participant_needs ?? [],
        communication_strategy: Array.isArray(reparsed.communication_strategy)
          ? reparsed.communication_strategy
          : draftOption.communication_strategy ?? [],
        evidence_summary: {
          observed_robot_behavior_summary:
            reparsed.evidence_summary?.observed_robot_behavior_summary ??
            draftOption.evidence_summary?.observed_robot_behavior_summary ??
            "",
          pedestrian_response_summary:
            reparsed.evidence_summary?.pedestrian_response_summary ??
            draftOption.evidence_summary?.pedestrian_response_summary ??
            "",
          concern_need_summary:
            reparsed.evidence_summary?.concern_need_summary ??
            draftOption.evidence_summary?.concern_need_summary ??
            "",
        },
      };
    }
  }

  return {
    option_id: optionId,
    summary: draftOption.summary ?? "",
    narrative_scenario: draftOption.narrative_scenario ?? "",
    participant_concerns: draftOption.participant_concerns ?? [],
    participant_needs: draftOption.participant_needs ?? [],
    communication_strategy: draftOption.communication_strategy ?? [],
    evidence_summary: {
      observed_robot_behavior_summary:
        draftOption.evidence_summary?.observed_robot_behavior_summary ?? "",
      pedestrian_response_summary:
        draftOption.evidence_summary?.pedestrian_response_summary ?? "",
      concern_need_summary:
        draftOption.evidence_summary?.concern_need_summary ?? "",
    },
    evidence,
  };
}

export async function generateScenarioFromRAG(
  params: GenerateScenarioParams
): Promise<GeneratedScenarioResult> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const { query, evidence } = await retrieveFromSurveyVectorStore({
    location: params.location,
    pedestrian_state: params.pedestrian_state,
    scenario_type: params.scenario_type,
    k: params.k ?? 3,
  });

  const topEvidence = evidence.slice(0, 3);
  const optionIds = ["A", "B", "C"];

  const options = await Promise.all(
    topEvidence.map((item, idx) =>
      generateOptionFromEvidence(
        openai,
        params,
        item,
        optionIds[idx] ?? `Option-${idx + 1}`
      )
    )
  );

  return {
    query,
    options,
  };
}