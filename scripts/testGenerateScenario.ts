import { generateScenarioFromRAG } from "../lib/rag/generateScenario";

async function main() {
  const result = await generateScenarioFromRAG({
    location: "crosswalk",
    pedestrian_state: "relaxed",
    scenario_type: "traffic_stop",
    k: 3,
  });

  console.log("QUERY:");
  console.log(result.query);

  console.log("\nOPTIONS:");
  for (const option of result.options) {
    console.log(`\n===== Option ${option.option_id} =====`);
    console.log("Summary:");
    console.log(option.summary);

    console.log("\nNarrative Scenario:");
    console.log(option.narrative_scenario);

    console.log("\nParticipant Concerns:");
    console.dir(option.participant_concerns, { depth: null });

    console.log("\nParticipant Needs:");
    console.dir(option.participant_needs, { depth: null });

    console.log("\nCommunication Strategy:");
    console.dir(option.communication_strategy, { depth: null });

    console.log("\nEvidence Summary:");
    console.dir(option.evidence_summary, { depth: null });

    console.log("\nRaw Evidence:");
    console.dir(option.evidence, { depth: null });
  }
}

main().catch(console.error);