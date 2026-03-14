import { OpenAI } from "openai";
import { ChromaClient } from "chromadb";
import "dotenv/config";

export type RetrievedSurveyCard = {
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
  distance?: number;
};

function buildQuery(params: {
  location?: string;
  pedestrian_state?: string;
  scenario_type?: string;
}) {
  const location = params.location ?? "";
  const state = params.pedestrian_state ?? "";
  const scenario = params.scenario_type ?? "";

  // retrieval_text 스타일에 가깝게 query를 서술형으로 맞춤
  return `At ${location}, a pedestrian who was ${state} encountered a delivery robot in a ${scenario} situation.`;
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function rerankEvidence(
  evidence: RetrievedSurveyCard[],
  params: {
    location?: string;
    pedestrian_state?: string;
    scenario_type?: string;
  },
  finalK: number
) {
  const targetScenario = normalize(params.scenario_type ?? "");
  const targetPlace = normalize(params.location ?? "");
  const targetState = normalize(params.pedestrian_state ?? "");

  // scenario / place / state 일치도 기반으로 점수 보정
  const scored = evidence.map((item) => {
    let bonus = 0;

    if (normalize(item.Scenario_type) === targetScenario) bonus += 3;
    if (normalize(item.Place).includes(targetPlace) || targetPlace.includes(normalize(item.Place))) bonus += 2;
    if (
      normalize(item.pedestrian_state).includes(targetState) ||
      targetState.includes(normalize(item.pedestrian_state))
    ) {
      bonus += 1;
    }

    // distance가 작을수록 유리하므로 음수로 반영
    const distanceScore = -(item.distance ?? 999);

    return {
      item,
      score: bonus + distanceScore,
    };
  });

  // 비슷한 카드가 너무 몰리지 않도록 간단 diversity 적용
  const selected: RetrievedSurveyCard[] = [];
  const seenBehaviors = new Set<string>();

  for (const candidate of scored.sort((a, b) => b.score - a.score)) {
    const behaviorKey = normalize(candidate.item.robot_behavior);

    // 완전히 같은 robot_behavior는 가능한 한 중복 방지
    if (seenBehaviors.has(behaviorKey) && selected.length < finalK) {
      continue;
    }

    selected.push(candidate.item);
    seenBehaviors.add(behaviorKey);

    if (selected.length >= finalK) break;
  }

  // 혹시 diversity 때문에 부족하면 그냥 상위 순으로 채움
  if (selected.length < finalK) {
    for (const candidate of scored.sort((a, b) => b.score - a.score)) {
      if (!selected.find((s) => s.id === candidate.item.id)) {
        selected.push(candidate.item);
      }
      if (selected.length >= finalK) break;
    }
  }

  return selected;
}

export async function retrieveFromSurveyVectorStore(params: {
  location?: string;
  pedestrian_state?: string;
  scenario_type?: string;
  k?: number;
}): Promise<{ query: string; evidence: RetrievedSurveyCard[] }> {
  const finalK = Math.max(1, Math.min(params.k ?? 3, 8));
  const rawK = Math.max(finalK, 6); // 후보는 조금 넉넉하게 검색
  const query = buildQuery(params);

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const chroma = new ChromaClient({
    host: "localhost",
    port: 8000,
    ssl: false,
  });

  const collection = await chroma.getCollection({
    name: "survey_cards",
  });

  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const result = await collection.query({
    queryEmbeddings: [queryEmbedding.data[0].embedding],
    nResults: rawK,
    include: ["metadatas", "documents", "distances"],
  });

  const rawEvidence: RetrievedSurveyCard[] = (result.metadatas?.[0] ?? []).map(
    (m, idx) => ({
      id: result.ids?.[0]?.[idx] ?? "",
      Participant_id: String(m?.Participant_id ?? ""),
      Place: String(m?.Place ?? ""),
      pedestrian_state: String(m?.pedestrian_state ?? ""),
      Scenario_type: String(m?.Scenario_type ?? ""),
      robot_behavior: String(m?.robot_behavior ?? ""),
      robot_motion: String(m?.robot_motion ?? ""),
      user_behavior: String(m?.user_behavior ?? ""),
      user_concern: String(m?.user_concern ?? ""),
      user_needs: String(m?.user_needs ?? ""),
      design_suggestion: String(m?.design_suggestion ?? ""),
      distance: result.distances?.[0]?.[idx] ?? undefined,
    })
  );

  const evidence = rerankEvidence(rawEvidence, params, finalK);

  return { query, evidence };
}