"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { sendLog } from "@/lib/log";

type ScenarioEvidence = {
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

type EvidenceSummary = {
  observed_robot_behavior_summary: string;
  pedestrian_response_summary: string;
  concern_need_summary: string;
};

type ScenarioOption = {
  option_id: string;
  summary: string;
  narrative_scenario: string;
  participant_concerns: string[];
  participant_needs: string[];
  communication_strategy: string[];
  evidence_summary: EvidenceSummary;
  evidence: ScenarioEvidence;
};

type ScenarioApiResponse = {
  input?: {
    location?: string;
    pedestrian_state?: string;
    scenario_type?: string;
  };
  query?: string;
  options?: ScenarioOption[];
  error?: string;
};

type ScenarioResult = {
  input: {
    location: string;
    pedestrian_state: string;
    scenario_type: string;
  };
  query: string;
  options: ScenarioOption[];
};

function OptionCard({ option }: { option: ScenarioOption }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="persona-card" style={{ marginBottom: 24 }}>
      <div className="persona-main">
        <div className="persona-text">
          <h3 className="persona-name">Option {option.option_id}</h3>

          <h4 style={{ marginTop: 12 }}>Scenario Summary</h4>
          <p className="persona-desc">{option.summary}</p>

          {option.narrative_scenario && (
            <>
              <h4 style={{ marginTop: 12 }}>Narrative Scenario</h4>
              <p className="persona-desc">{option.narrative_scenario}</p>
            </>
          )}

          {option.participant_concerns?.length > 0 && (
            <>
              <h4 style={{ marginTop: 12 }}>Concerns</h4>
              <ul className="output-list">
                {option.participant_concerns.map((item, idx) => (
                  <li key={`concern-${option.option_id}-${idx}`}>– {item}</li>
                ))}
              </ul>
            </>
          )}

          {option.participant_needs?.length > 0 && (
            <>
              <h4 style={{ marginTop: 12 }}>Needs</h4>
              <ul className="output-list">
                {option.participant_needs.map((item, idx) => (
                  <li key={`need-${option.option_id}-${idx}`}>– {item}</li>
                ))}
              </ul>
            </>
          )}

          {option.communication_strategy?.length > 0 && (
            <>
              <h4 style={{ marginTop: 12 }}>Communication Strategy</h4>
              <ul className="output-list">
                {option.communication_strategy.map((item, idx) => (
                  <li key={`strategy-${option.option_id}-${idx}`}>– {item}</li>
                ))}
              </ul>
            </>
          )}

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="output-cta"
              onClick={() => setOpen((prev) => !prev)}
            >
              {open ? "근거 닫기" : "근거 보기"}
            </button>
          </div>

          {open && (
            <div style={{ marginTop: 16 }}>
              <h4>Evidence Summary</h4>

              <h4 style={{ marginTop: 12 }}>Observed Robot Behavior</h4>
              <p className="persona-desc">
                {option.evidence_summary?.observed_robot_behavior_summary}
              </p>

              <h4 style={{ marginTop: 12 }}>Pedestrian Response</h4>
              <p className="persona-desc">
                {option.evidence_summary?.pedestrian_response_summary}
              </p>

              <h4 style={{ marginTop: 12 }}>Concern / Need</h4>
              <p className="persona-desc">
                {option.evidence_summary?.concern_need_summary}
              </p>

              <hr style={{ margin: "20px 0" }} />

              <h4>Retrieved Participant Evidence</h4>

              <ul className="output-list">
                <li>
                  <strong>Place:</strong> {option.evidence.Place}
                </li>
                <li>
                  <strong>Pedestrian state:</strong>{" "}
                  {option.evidence.pedestrian_state}
                </li>
                <li>
                  <strong>Scenario type:</strong>{" "}
                  {option.evidence.Scenario_type}
                </li>
              </ul>

              <h4 style={{ marginTop: 12 }}>Robot Behavior</h4>
              <p className="persona-desc">{option.evidence.robot_behavior}</p>

              {option.evidence.robot_motion && (
                <>
                  <h4 style={{ marginTop: 12 }}>Robot Motion</h4>
                  <p className="persona-desc">{option.evidence.robot_motion}</p>
                </>
              )}

              <h4 style={{ marginTop: 12 }}>Pedestrian Response</h4>
              <p className="persona-desc">{option.evidence.user_behavior}</p>

              <h4 style={{ marginTop: 12 }}>Participant Concern</h4>
              <p className="persona-desc">{option.evidence.user_concern}</p>

              <h4 style={{ marginTop: 12 }}>Participant Need</h4>
              <p className="persona-desc">{option.evidence.user_needs}</p>

              <h4 style={{ marginTop: 12 }}>Design Suggestion</h4>
              <p className="persona-desc">
                {option.evidence.design_suggestion}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function OutputPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pid = searchParams.get("pid") ?? "";

  const location = searchParams.get("location") ?? "";
  const pedestrian_state = searchParams.get("pedestrian_state") ?? "";
  const scenario_type = searchParams.get("scenario_type") ?? "";

  const serviceType = searchParams.get("serviceType") ?? "";
  const serviceCategory = searchParams.get("serviceCategory") ?? "";
  const serviceSummary = searchParams.get("serviceSummary") ?? "";

  const [scenarioData, setScenarioData] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnyInput = !!(location || pedestrian_state || scenario_type);

  const requestBody = useMemo(() => {
    return {
      location,
      pedestrian_state,
      scenario_type,
    };
  }, [location, pedestrian_state, scenario_type]);

  useEffect(() => {
    if (!hasAnyInput) return;

    const fetchScenarioOptions = async () => {
      try {
        setLoading(true);
        setError(null);
        setScenarioData(null);

        const res = await fetch("/api/generateEhmi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const msg = await res.text();
          console.error("generate scenario error:", msg);
          setError("디자인 옵션 생성에 실패했습니다.");
          return;
        }

        const raw = (await res.json()) as ScenarioApiResponse;

        if (raw.error) {
          setError(raw.error);
          return;
        }

        const result: ScenarioResult = {
          input: {
            location: String(raw.input?.location ?? ""),
            pedestrian_state: String(raw.input?.pedestrian_state ?? ""),
            scenario_type: String(raw.input?.scenario_type ?? ""),
          },
          query: String(raw.query ?? ""),
          options: Array.isArray(raw.options) ? raw.options : [],
        };

        setScenarioData(result);

        void sendLog({
          pid: pid || undefined,
          page: "output",
          event: "scenario_options_generated",
          payload: {
            serviceType,
            serviceCategory,
            serviceSummary,
            requestBody,
            result,
          },
        });
      } catch (e) {
        console.error(e);
        setError("디자인 옵션 생성 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchScenarioOptions();
  }, [
    hasAnyInput,
    pid,
    serviceType,
    serviceCategory,
    serviceSummary,
    requestBody,
  ]);

  return (
    <div className="screen">
      <header className="frame">
        <div className="header">
          <div className="group">
            <div className="ellipse" />
            <div className="ellipse-2" />
          </div>

          <h1 className="text-wrapper-2">AI Persona Gen</h1>

          <nav
            className="home"
            aria-label="홈으로 이동"
            onClick={() => router.push(pid ? `/?pid=${pid}` : "/")}
          >
            <div className="material-symbols">
              <img className="vector" src="/img/Home.svg" alt="홈 아이콘" />
            </div>
          </nav>

          <nav
            className="dashboard"
            aria-label="대시보드로 이동"
            onClick={() => router.push("/dashboard")}
          >
            <div className="material-symbols">
              <img
                className="img"
                src="/img/Dashboard.svg"
                alt="대시보드 아이콘"
              />
            </div>
          </nav>
        </div>
      </header>

      <main className="output-main">
        <h2 className="output-title">
          <span className="output-title-blue">Design Options</span> 결과
        </h2>

        {!hasAnyInput && (
          <p>입력값이 없습니다. 홈에서 interaction context를 입력해주세요.</p>
        )}

        {!scenarioData && hasAnyInput && (
          <>
            {loading && <p>AI가 디자인 옵션을 생성하는 중입니다...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
          </>
        )}

        {scenarioData && (
          <>
            <section className="persona-card" style={{ marginBottom: 24 }}>
              <div className="persona-main">
                <div className="persona-text">
                  <h3 className="persona-name">Interaction Context</h3>
                  <ul className="output-list">
                    <li>– location: {scenarioData.input.location}</li>
                    <li>
                      – pedestrian_state: {scenarioData.input.pedestrian_state}
                    </li>
                    <li>
                      – scenario_type: {scenarioData.input.scenario_type}
                    </li>
                  </ul>

                  {scenarioData.query && (
                    <>
                      <h4 style={{ marginTop: 12 }}>Query</h4>
                      <p className="persona-desc">{scenarioData.query}</p>
                    </>
                  )}
                </div>
              </div>
            </section>

            {scenarioData.options.length > 0 ? (
              scenarioData.options.map((option) => (
                <OptionCard key={option.option_id} option={option} />
              ))
            ) : (
              <p>생성된 옵션이 없습니다.</p>
            )}

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button
                type="button"
                className="output-cta"
                onClick={() => router.push(pid ? `/?pid=${pid}` : "/")}
              >
                입력 다시 하기
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}