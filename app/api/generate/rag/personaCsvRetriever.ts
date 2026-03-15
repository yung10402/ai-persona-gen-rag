import "dotenv/config";
import { OpenAI } from "openai";
import { CloudClient } from "chromadb";

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
};

function buildQuery(params: {
  location?: string;
  pedestrian_state?: string;
  scenario_type?: string;
}) {
  const location = params.location ?? "";
  const state = params.pedestrian_state ?? "";
  const scenario = params.scenario_type ?? "";

  return [
    `Location: ${location}`,
    `Pedestrian state: ${state}`,
    `Interaction scenario: ${scenario}`,
  ].join("\n");
}

export async function retrieveFromSurveyVectorStore(params: {
  location?: string;
  pedestrian_state?: string;
  scenario_type?: string;
  k?: number;
}): Promise<{ query: string; evidence: RetrievedSurveyCard[] }> {
  const query = buildQuery(params);
  const k = Math.max(1, Math.min(params.k ?? 5, 8));

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const chroma = new CloudClient({
    apiKey: process.env.CHROMA_API_KEY,
    tenant: process.env.CHROMA_TENANT,
    database: process.env.CHROMA_DATABASE,
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
    nResults: k,
    include: ["metadatas", "documents", "distances"],
  });

  const evidence: RetrievedSurveyCard[] = (result.metadatas?.[0] ?? []).map(
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
    })
  );

  return { query, evidence };
}