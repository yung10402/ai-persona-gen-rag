import { generateScenarioFromRAG } from "../lib/rag/generateScenario";

async function main() {
  const result = await generateScenarioFromRAG({
    location: "crosswalk",
    pedestrian_state: "relaxed",
    scenario_type: "traffic_stop",
    k: 5,
  });

  console.log("QUERY:");
  console.log(result.query);

  console.log("\nRETRIEVED EVIDENCE:");
  console.dir(result.retrieved_evidence, { depth: null });

  console.log("\nGENERATED RESULT:");
  console.dir(result.generated, { depth: null });
}

main().catch(console.error);