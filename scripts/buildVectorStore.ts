import path from "path";
import * as XLSX from "xlsx";
import { OpenAI } from "openai";
import { ChromaClient } from "chromadb";
import "dotenv/config";

type SurveyRow = {
  Participant_id: string;
  card_id: string;
  Place: string;
  pedestrian_state: string;
  Scenario_type: string;
  robot_behavior: string;
  robot_motion?: string;
  user_behavior: string;
  user_concern: string;
  user_needs: string;
  design_suggestion: string;
  retrieval_text: string;
};

function safe(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const chroma = new ChromaClient({
    host: "localhost",
    port: 8000,
    ssl: false,
  });

  const collectionName = "survey_cards";

  try {
    await chroma.deleteCollection({ name: collectionName });
    console.log(`Deleted existing collection: ${collectionName}`);
  } catch {
    console.log(`No existing collection to delete: ${collectionName}`);
  }

  const collection = await chroma.getOrCreateCollection({
    name: collectionName,
  });

  const filePath = path.join(process.cwd(), "data", "Survey_data.xlsx");
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<SurveyRow>(sheet);

  console.log("HEADERS:", Object.keys(rows[0] ?? {}));
  console.log("FIRST ROW:", rows[0]);
  console.log(`Loaded rows from Excel: ${rows.length}`);

  const ids: string[] = [];
  const documents: string[] = [];
  const embeddings: number[][] = [];
  const metadatas: Record<string, string>[] = [];

  for (const row of rows) {
    const cardId = safe(row.card_id);
    const retrievalText = safe(row.retrieval_text);

    if (!cardId || !retrievalText) continue;

    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: retrievalText,
    });

    ids.push(cardId);
    documents.push(retrievalText);
    embeddings.push(embedding.data[0].embedding);
    metadatas.push({
      Participant_id: safe(row.Participant_id),
      Place: safe(row.Place),
      pedestrian_state: safe(row.pedestrian_state),
      Scenario_type: safe(row.Scenario_type),
      robot_behavior: safe(row.robot_behavior),
      robot_motion: safe(row.robot_motion),
      user_behavior: safe(row.user_behavior),
      user_concern: safe(row.user_concern),
      user_needs: safe(row.user_needs),
      design_suggestion: safe(row.design_suggestion),
    });
  }

  console.log(`Prepared rows for insert: ${ids.length}`);

  if (ids.length > 0) {
    await collection.add({
      ids,
      documents,
      embeddings,
      metadatas,
    });
  }

  const finalCount = await collection.count();
  console.log(`FINAL COLLECTION COUNT: ${finalCount}`);
}

main().catch(console.error);