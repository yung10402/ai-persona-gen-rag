import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export type CardRow = {
  id: string;
  context: string;
  robot_event: string;
  human_state: string;
  scenario: string;
  ehmi_need: string;
  emotion_reason: string;
};

function buildSearchText(card: CardRow) {
  return [
    `Context: ${card.context}`,
    `Robot event: ${card.robot_event}`,
    `Human state: ${card.human_state}`,
    `Scenario: ${card.scenario}`,
    `Emotion reason: ${card.emotion_reason}`,
    `Desired eHMI: ${card.ehmi_need}`,
  ].join("\n");
}

function scoreCard(card: CardRow, query: string) {
  const hay = buildSearchText(card).toLowerCase();
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;
  for (const t of tokens) {
    if (hay.includes(t)) score += 1;
  }
  return score;
}

/**
 * persona.csv에서 query 기준으로 top-k case를 리턴
 * - k는 1~8로 자동 클램프
 */
export function retrieveFromPersonaCsv(params: {
  context?: string;
  robot_event?: string;
  human_state?: string;
  goal?: string;
  k?: number;
}): { query: string; evidence: CardRow[] } {
  const {
    context = "",
    robot_event = "",
    human_state = "",
    goal = "",
    k = 5,
  } = params;

  const query =
    `context: ${context}\nrobot_event: ${robot_event}\n` +
    `human_state: ${human_state}\ngoal: ${goal}`.trim();

  const filePath = path.join(process.cwd(), "data", "persona.csv");
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");

  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  }) as CardRow[];

  if (!rows.length) {
    throw new Error("No rows found in data/persona.csv");
  }

  const ranked = rows
    .map((c) => ({ c, s: scoreCard(c, query) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, Math.max(1, Math.min(k, 8)));

  return { query, evidence: ranked.map(({ c }) => c) };
}