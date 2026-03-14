import { OpenAI } from "openai";
import { ChromaClient } from "chromadb";
import "dotenv/config";

async function main() {
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

  const count = await collection.count();
  console.log("COLLECTION COUNT:", count);

  const query = `
A pedestrian who was walking in a relaxed state encountered a delivery robot at a crosswalk where the robot stopped to yield to pedestrians.
`.trim();

  console.log("QUERY:", query);

  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding.data[0].embedding],
    nResults: 5,
    include: ["metadatas", "documents", "distances"],
  });

  console.log("RAW RESULTS:");
  console.dir(results, { depth: null });
}

main().catch(console.error);