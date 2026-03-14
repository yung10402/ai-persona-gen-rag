import { NextResponse } from "next/server";
import { generateScenarioFromRAG } from "@/lib/rag/generateScenario";

type GenerateEhmiBody = {
  location?: string;
  pedestrian_state?: string;
  scenario_type?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateEhmiBody;

    const location = body.location?.trim() ?? "";
    const pedestrian_state = body.pedestrian_state?.trim() ?? "";
    const scenario_type = body.scenario_type?.trim() ?? "";

    if (!location && !pedestrian_state && !scenario_type) {
      return NextResponse.json(
        { error: "At least one input value is required." },
        { status: 400 }
      );
    }

    const result = await generateScenarioFromRAG({
      location,
      pedestrian_state,
      scenario_type,
      k: 3,
    });

    return NextResponse.json(
      {
        input: {
          location,
          pedestrian_state,
          scenario_type,
        },
        query: result.query,
        options: result.options,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("generateEhmi API Error:", err);

    return NextResponse.json(
      { error: "Failed to generate scenario options." },
      { status: 500 }
    );
  }
}