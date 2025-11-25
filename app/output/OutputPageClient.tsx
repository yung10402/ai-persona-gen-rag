"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { sendLog } from "@/lib/log"; // 로그 유틸

type SectionKey = "persona" | "behavior" | "needs" | "pain" | "scenario";

type SectionReviewLog = {
  adopted: boolean;
  rejected: boolean;
  feedback: string;
  sourceClicks: number;
};

type PersonaSessionLog = {
  userInput: {
    serviceType: string;
    serviceCategory: string;
    serviceSummary: string;
    ageRange: string;
    gender: string;
    occupation: string;
    userGoal: string;
  };
  aiPersona: PersonaResult | null;
  sectionReview: Record<SectionKey, SectionReviewLog>;
};

type ReferenceItem = {
  title: string;
  type: string;
  detail: string;
  source: string;
  url: string;
};

// API에서 처음 받아오는 형태(영어)
type PersonaApiResponse = {
  persona: {
    name: string;
    summary: string;
  };
  behavior: string[];
  needs: string[];
  pain: string[];
  scenario: string;
  meta: {
    ageRange: string;
    gender: string;
    occupation: string;
    serviceSummary: string;
  };
};

// 화면에서 쓰는 형태(한국어)
type PersonaResult = {
  persona: {
    name: string;
    summary: string;
  };
  behavior: string[];
  needs: string[];
  pain: string[];
  scenario: string;
  meta: {
    ageRange: string;
    gender: string;
    occupation: string;
    serviceSummary: string;
  };
};

export default function OutputPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 참가자 ID (홈에서 ?pid=U01 이런 식으로 들어온다고 가정)
  const pid = searchParams.get("pid") ?? "";

  // 홈에서 온 값
  const ageRange = searchParams.get("ageRange") ?? "";
  const gender = searchParams.get("gender") ?? "";
  const occupation = searchParams.get("occupation") ?? "";
  const serviceSummary = searchParams.get("serviceSummary") ?? "";
  const userGoal = searchParams.get("userGoal") ?? "";
  const serviceType = searchParams.get("serviceType") ?? "";
  const serviceCategory = searchParams.get("serviceCategory") ?? "";

  // 성별 표시 (입력값 기준)
  const displayGenderRaw =
    gender === "male" ? "남성" : gender === "female" ? "여성" : "성별 미입력";

  const [personaData, setPersonaData] = useState<PersonaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 섹션별 채택 / 미채택 / 코멘트 상태
  const [selected, setSelected] = useState<Record<SectionKey, boolean>>({
    persona: false,
    behavior: false,
    needs: false,
    pain: false,
    scenario: false,
  });

  const [rejected, setRejected] = useState<Record<SectionKey, boolean>>({
    persona: false,
    behavior: false,
    needs: false,
    pain: false,
    scenario: false,
  });

  const [feedback, setFeedback] = useState<Record<SectionKey, string>>({
    persona: "",
    behavior: "",
    needs: "",
    pain: "",
    scenario: "",
  });

  // 출처 클릭 횟수
  const [sourceClickCount, setSourceClickCount] = useState<
    Record<SectionKey, number>
  >({
    persona: 0,
    behavior: 0,
    needs: 0,
    pain: 0,
    scenario: 0,
  });

  // 출처 모달 상태
  const [sourceSection, setSourceSection] = useState<SectionKey | null>(null);
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);
  const [references, setReferences] = useState<ReferenceItem[]>([]);

  // ---------- 번역 헬퍼들 ----------

  async function translateText(text: string): Promise<string> {
    if (!text) return "";
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        console.error("translate error:", await res.text());
        return text;
      }

      const data = await res.json();
      return (data.textKo as string) ?? (data.translated as string) ?? text;
    } catch (e) {
      console.error("translate exception:", e);
      return text;
    }
  }

  async function translateList(list?: unknown): Promise<string[]> {
    if (!Array.isArray(list) || list.length === 0) return [];

    const safe = (list as unknown[]).map((v) => String(v ?? ""));

    const translatedArray = await Promise.all(
      safe.map(async (sentence) => {
        const t = await translateText(sentence);
        return t || sentence;
      })
    );

    return translatedArray;
  }

  // ---------- “어떻게 만들어졌는지” 설명 ----------

  function getSourceDescription(
    section: SectionKey,
    meta: PersonaResult["meta"],
    userGoal: string
  ) {
    const genderLabel =
      meta.gender === "male"
        ? "남성"
        : meta.gender === "female"
        ? "여성"
        : meta.gender || "미입력";

    const baseInputs = [
      meta.ageRange && `나이: ${meta.ageRange}`,
      genderLabel && `성별: ${genderLabel}`,
      meta.occupation && `직업: ${meta.occupation}`,
      meta.serviceSummary && `서비스 요약: ${meta.serviceSummary}`,
      userGoal && `사용자 목표: ${userGoal}`,
    ].filter(Boolean) as string[];

    switch (section) {
      case "persona":
        return {
          title: "페르소나 요약은 이렇게 만들어졌습니다",
          lines: [
            "입력한 연령대·성별·직업 정보를 기반으로 생활 맥락과 디지털 리터러시 수준을 가정했습니다.",
            "서비스 한 줄 요약과 사용자 목표에서 드러난 동기·문제를 추출해, 동기·기대·사용 맥락을 한 문단으로 재구성했습니다.",
            ...baseInputs,
          ],
        };
      case "behavior":
        return {
          title: "행동 패턴은 이렇게 만들어졌습니다",
          lines: [
            "서비스 카테고리와 한 줄 요약을 기준으로, 이 사용자가 언제·어디서·무엇을 할 때 서비스를 쓸지 시나리오를 가정했습니다.",
            "연령대와 직업에 따라 자주 사용하는 도구, 협업 방식, 정보 탐색·결정 방식 등을 UX 리서치 관점에서 추론했습니다.",
            ...baseInputs,
          ],
        };
      case "needs":
        return {
          title: "니즈·목표는 이렇게 만들어졌습니다",
          lines: [
            "사용자 목표 필드에 적어준 내용을 중심으로, 이 사용자가 해결하고 싶은 문제와 기대하는 결과를 정리했습니다.",
            "서비스 요약에서 드러난 가치 제안(자동화, 효율, 소통 개선 등)을, ‘무엇을 얻고 싶어 하는지’라는 형식으로 재표현했습니다.",
            ...baseInputs,
          ],
        };
      case "pain":
        return {
          title: "페인 포인트는 이렇게 만들어졌습니다",
          lines: [
            "서비스 카테고리와 요약을 바탕으로 기존 워크플로우에서 자주 발생하는 마찰 지점을 추론했습니다.",
            "시간 낭비, 인지적 부담, 커뮤니케이션 오류, 도구 간 단절 같은 전형적인 UX 문제를 이 페르소나의 맥락에 맞게 구체화했습니다.",
            ...baseInputs,
          ],
        };
      case "scenario":
        return {
          title: "유저 시나리오는 이렇게 만들어졌습니다",
          lines: [
            "앞서 생성된 행동 패턴·니즈·페인 포인트를 한 사람의 하루/특정 상황에 맞게 엮어 이야기 형식으로 재구성했습니다.",
            "어떤 트리거로 서비스를 쓰게 되는지, 어떤 순서로 기능을 사용하고, 어떤 결과와 감정을 경험하는지 단계적으로 풀어냈습니다.",
            ...baseInputs,
          ],
        };
      default:
        return {
          title: "출처 정보",
          lines: baseInputs,
        };
    }
  }

  // ---------- 페르소나 생성 + 번역 ----------

  useEffect(() => {
    if (!ageRange && !gender && !occupation && !serviceSummary && !userGoal) {
      return;
    }

    const fetchPersona = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/generatePersona", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ageRange,
            gender,
            occupation,
            serviceSummary,
            userGoal,
          }),
        });

        if (!res.ok) {
          const msg = await res.text();
          console.error("generatePersona error:", msg);
          setError("AI 페르소나 생성에 실패했습니다.");
          return;
        }

        const raw: PersonaApiResponse = await res.json();

        const [summaryKo, behaviorKo, needsKo, painKo, scenarioKo] =
          await Promise.all([
            translateText(raw.persona.summary),
            translateList(raw.behavior),
            translateList(raw.needs),
            translateList(raw.pain),
            translateText(raw.scenario),
          ]);

        const result: PersonaResult = {
          persona: {
            name: raw.persona.name,
            summary: summaryKo || raw.persona.summary,
          },
          behavior: behaviorKo.length > 0 ? behaviorKo : raw.behavior,
          needs: needsKo.length > 0 ? needsKo : raw.needs,
          pain: painKo.length > 0 ? painKo : raw.pain,
          scenario: scenarioKo || raw.scenario,
          meta: raw.meta,
        };

        setPersonaData(result);

        // ★ 로그: AI 페르소나 생성/번역 완료
        void sendLog({
          pid,
          page: "output",
          event: "persona_generated",
          payload: {
            userInput: {
              serviceType,
              serviceCategory,
              serviceSummary,
              ageRange,
              gender,
              occupation,
              userGoal,
            },
            aiPersona: result,
          },
        });
      } catch (e) {
        console.error(e);
        setError("AI 페르소나 생성 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchPersona();
  }, [
    ageRange,
    gender,
    occupation,
    serviceSummary,
    userGoal,
    pid,
    serviceType,
    serviceCategory,
  ]);

  // ---------- 인터랙션 핸들러 ----------

  const handleAdopt = (key: SectionKey) => {
    const next = !selected[key];

    setSelected((prev) => ({ ...prev, [key]: next }));
    setRejected((prev) => ({ ...prev, [key]: false }));
    setFeedback((prev) => ({ ...prev, [key]: "" }));

    void sendLog({
      pid,
      page: "output",
      event: "section_adopt_toggle",
      payload: {
        section: key,
        adopted: next,
      },
    });
  };

  const handleReject = (key: SectionKey) => {
    const next = !rejected[key];

    setRejected((prev) => ({ ...prev, [key]: next }));
    setSelected((prev) => ({ ...prev, [key]: false }));
    setFeedback((prev) => ({ ...prev, [key]: "" }));

    void sendLog({
      pid,
      page: "output",
      event: "section_reject_toggle",
      payload: {
        section: key,
        rejected: next,
      },
    });
  };

  const handleFeedbackChange = (key: SectionKey, value: string) => {
    // 여기서는 상태만 업데이트하고,
    // 실제로는 "인터뷰 하기" 버튼 눌렀을 때 한 번에 로그 보냄.
    setFeedback((prev) => ({ ...prev, [key]: value }));
  };

  // ---------- 세션 로그 공통 빌더 ----------

  const buildSessionLog = (): PersonaSessionLog | null => {
    if (!personaData) return null;

    return {
      userInput: {
        serviceType,
        serviceCategory,
        serviceSummary:
          personaData.meta.serviceSummary || serviceSummary || "",
        ageRange: personaData.meta.ageRange || ageRange || "",
        gender: personaData.meta.gender || gender || "",
        occupation: personaData.meta.occupation || occupation || "",
        userGoal,
      },
      aiPersona: personaData,
      sectionReview: {
        persona: {
          adopted: selected.persona,
          rejected: rejected.persona,
          feedback: feedback.persona,
          sourceClicks: sourceClickCount.persona ?? 0,
        },
        behavior: {
          adopted: selected.behavior,
          rejected: rejected.behavior,
          feedback: feedback.behavior,
          sourceClicks: sourceClickCount.behavior ?? 0,
        },
        needs: {
          adopted: selected.needs,
          rejected: rejected.needs,
          feedback: feedback.needs,
          sourceClicks: sourceClickCount.needs ?? 0,
        },
        pain: {
          adopted: selected.pain,
          rejected: rejected.pain,
          feedback: feedback.pain,
          sourceClicks: sourceClickCount.pain ?? 0,
        },
        scenario: {
          adopted: selected.scenario,
          rejected: rejected.scenario,
          feedback: feedback.scenario,
          sourceClicks: sourceClickCount.scenario ?? 0,
        },
      },
    };
  };

  // ---------- 대시보드 저장 ----------

  const saveToDashboard = () => {
    if (typeof window === "undefined") return;
    if (!personaData) return;

    const id = Date.now().toString();

    const newItem = {
      id,
      createdAt: new Date().toISOString(),
      name: personaData.persona.name,
      ageRange: personaData.meta.ageRange,
      gender: personaData.meta.gender,
      occupation: personaData.meta.occupation,
      summary: personaData.persona.summary,
      full: personaData, // 전체 결과 저장
    };

    const raw = window.localStorage.getItem("personaDashboardItems");
    const list = raw ? JSON.parse(raw) : [];

    list.push(newItem);
    window.localStorage.setItem("personaDashboardItems", JSON.stringify(list));
  };

  // ---------- CSV용 세션 로그 저장 ----------

  const saveCurrentSessionForExport = () => {
    if (typeof window === "undefined") return;

    const log = buildSessionLog();
    if (!log) return;

    try {
      window.localStorage.setItem(
        "currentPersonaSession",
        JSON.stringify(log)
      );
    } catch (e) {
      console.error("currentPersonaSession 저장 실패:", e);
    }
  };

  // ---------- 출처 버튼 → 모달 + 외부 레퍼런스 호출 ----------

  const handleOpenSource = async (key: SectionKey) => {
    if (!personaData) return;

    const currentCount = sourceClickCount[key] ?? 0;

    void sendLog({
      pid,
      page: "output",
      event: "section_source_open",
      payload: {
        section: key,
        clickIndex: currentCount + 1,
      },
    });

    // 클릭 횟수 카운트
    setSourceClickCount((prev) => ({
      ...prev,
      [key]: (prev[key] ?? 0) + 1,
    }));

    setSourceSection(key);
    setIsSourceOpen(true);
    setRefLoading(true);
    setRefError(null);
    setReferences([]);

    let sectionContent = "";
    switch (key) {
      case "persona":
        sectionContent = `${personaData.persona.name}\n${personaData.persona.summary}`;
        break;
      case "behavior":
        sectionContent = personaData.behavior.join("\n");
        break;
      case "needs":
        sectionContent = personaData.needs.join("\n");
        break;
      case "pain":
        sectionContent = personaData.pain.join("\n");
        break;
      case "scenario":
        sectionContent = personaData.scenario;
        break;
      default:
        sectionContent = "";
    }

    try {
      const res = await fetch("/api/sectionReferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: key,
          content: sectionContent,
          meta: personaData.meta,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        console.error("sectionReferences error:", msg);
        setRefError("외부 참고자료를 불러오지 못했습니다.");
        return;
      }

      const data = await res.json();
      const refs: ReferenceItem[] = Array.isArray(data.references)
        ? data.references
        : [];

      setReferences(refs);
    } catch (e) {
      console.error("sectionReferences exception:", e);
      setRefError("외부 참고자료를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setRefLoading(false);
    }
  };

  // ---------- Chat 이동용 파라미터 ----------

  const chatParams = new URLSearchParams();
  if (personaData) {
    chatParams.set("name", personaData.persona.name);
    chatParams.set("summary", personaData.persona.summary);
    chatParams.set("ageRange", personaData.meta.ageRange || "");
    chatParams.set("gender", personaData.meta.gender || "");
    chatParams.set("occupation", personaData.meta.occupation || "");
    chatParams.set("serviceSummary", personaData.meta.serviceSummary || "");
    chatParams.set("behavior", JSON.stringify(personaData.behavior));
    chatParams.set("needs", JSON.stringify(personaData.needs));
    chatParams.set("pain", JSON.stringify(personaData.pain));
    chatParams.set("scenario", personaData.scenario);
    if (pid) chatParams.set("pid", pid);
  }

  const displayGender =
    personaData?.meta.gender || displayGenderRaw || "성별 미입력";

  // ---------- 인터뷰 시작 핸들러 (여기서 한 번만 텍스트 포함 전체 로그 전송) ----------

  const handleStartInterview = () => {
    if (!personaData) return;

    const sessionLog = buildSessionLog();
    if (sessionLog) {
      // ★ 여기서 한 번만, 사용자가 입력한 텍스트 포함 전체 상태를 깔끔하게 전송
      void sendLog({
        pid,
        page: "output",
        event: "output_submit",
        payload: sessionLog,
      });
    }

    saveToDashboard();
    saveCurrentSessionForExport();
    router.push(`/chat?${chatParams.toString()}`);
  };

  // ---------- JSX ----------

  return (
    <div className="screen">
      {/* 헤더 */}
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
          <span className="output-title-blue">AI 페르소나</span> 결과
        </h2>

        {!personaData && (
          <>
            {loading && <p>AI가 페르소나를 생성하는 중입니다...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
          </>
        )}

        {personaData && (
          <>
            {/* 1. 상단 페르소나 카드 */}
            <section className="persona-card">
              <div className="persona-main">
                <div className="persona-text">
                  <h3 className="persona-name">{personaData.persona.name}</h3>
                  <p className="persona-meta">
                    {personaData.meta.ageRange || "나이 미입력"},{" "}
                    {displayGender},{" "}
                    {personaData.meta.occupation || "직업 미입력"}
                  </p>
                  <p className="persona-desc">{personaData.persona.summary}</p>
                </div>
              </div>

              <div className="output-card-footer">
                <div className="card-actions">
                  <button
                    type="button"
                    className="tag-adopt"
                    aria-pressed={selected.persona}
                    onClick={() => handleAdopt("persona")}
                  >
                    채택
                  </button>
                  <button
                    type="button"
                    className="tag-reject"
                    aria-pressed={rejected.persona}
                    onClick={() => handleReject("persona")}
                  >
                    미채택
                  </button>
                  <button
                    type="button"
                    className="tag-source"
                    onClick={() => handleOpenSource("persona")}
                  >
                    출처 확인
                  </button>
                </div>

                {rejected.persona && (
                  <div className="reject-area">
                    <label className="reject-label">
                      미채택 이유 또는 수정하고 싶은 내용을 적어주세요
                    </label>
                    <textarea
                      className="reject-textarea"
                      value={feedback.persona}
                      onChange={(e) =>
                        handleFeedbackChange("persona", e.target.value)
                      }
                      placeholder="예: 직무 설명이 실제 우리 팀과 맞지 않음, 연령대가 너무 넓게 잡힘 등"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* 2. 섹션 카드 리스트 */}
            <section className="output-section-list">
              {/* 행동 패턴 */}
              <article className="output-card">
                <div className="output-card-header">
                  <div className="output-card-title-wrap">
                    <h3 className="output-card-title">행동 패턴</h3>
                    <span className="output-card-sub">
                      Behavioral Patterns
                    </span>
                  </div>
                </div>

                <ul className="output-list">
                  {personaData.behavior.map((text, idx) => (
                    <li key={idx}>– {text}</li>
                  ))}
                </ul>

                <div className="output-card-footer">
                  <div className="card-actions">
                    <button
                      type="button"
                      className="tag-adopt"
                      aria-pressed={selected.behavior}
                      onClick={() => handleAdopt("behavior")}
                    >
                      채택
                    </button>
                    <button
                      type="button"
                      className="tag-reject"
                      aria-pressed={rejected.behavior}
                      onClick={() => handleReject("behavior")}
                    >
                      미채택
                    </button>
                    <button
                      type="button"
                      className="tag-source"
                      onClick={() => handleOpenSource("behavior")}
                    >
                      출처 확인
                    </button>
                  </div>

                  {rejected.behavior && (
                    <div className="reject-area">
                      <label className="reject-label">
                        이 행동 패턴에서 수정하거나 보완하고 싶은 점
                      </label>
                      <textarea
                        className="reject-textarea"
                        value={feedback.behavior}
                        onChange={(e) =>
                          handleFeedbackChange("behavior", e.target.value)
                        }
                        placeholder="예: 실제로는 리뷰 시간이 더 길고, 자동화는 거의 하지 않음 등"
                      />
                    </div>
                  )}
                </div>
              </article>

              {/* 니즈·목표 */}
              <article className="output-card">
                <div className="output-card-header">
                  <div className="output-card-title-wrap">
                    <h3 className="output-card-title">니즈·목표</h3>
                    <span className="output-card-sub">Needs/Goals</span>
                  </div>
                </div>

                <ul className="output-list">
                  {personaData.needs.map((text, idx) => (
                    <li key={idx}>– {text}</li>
                  ))}
                </ul>

                <div className="output-card-footer">
                  <div className="card-actions">
                    <button
                      type="button"
                      className="tag-adopt"
                      aria-pressed={selected.needs}
                      onClick={() => handleAdopt("needs")}
                    >
                      채택
                    </button>
                    <button
                      type="button"
                      className="tag-reject"
                      aria-pressed={rejected.needs}
                      onClick={() => handleReject("needs")}
                    >
                      미채택
                    </button>
                    <button
                      type="button"
                      className="tag-source"
                      onClick={() => handleOpenSource("needs")}
                    >
                      출처 확인
                    </button>
                  </div>

                  {rejected.needs && (
                    <div className="reject-area">
                      <label className="reject-label">
                        이 니즈·목표에서 수정하거나 보완하고 싶은 점
                      </label>
                      <textarea
                        className="reject-textarea"
                        value={feedback.needs}
                        onChange={(e) =>
                          handleFeedbackChange("needs", e.target.value)
                        }
                        placeholder="예: 자동화 도구보다 커리어 성장/보상에 더 민감함 등"
                      />
                    </div>
                  )}
                </div>
              </article>

              {/* 페인 포인트 */}
              <article className="output-card">
                <div className="output-card-header">
                  <div className="output-card-title-wrap">
                    <h3 className="output-card-title">페인 포인트</h3>
                    <span className="output-card-sub">Pain Points</span>
                  </div>
                </div>

                <ul className="output-list">
                  {personaData.pain.map((text, idx) => (
                    <li key={idx}>– {text}</li>
                  ))}
                </ul>

                <div className="output-card-footer">
                  <div className="card-actions">
                    <button
                      type="button"
                      className="tag-adopt"
                      aria-pressed={selected.pain}
                      onClick={() => handleAdopt("pain")}
                    >
                      채택
                    </button>
                    <button
                      type="button"
                      className="tag-reject"
                      aria-pressed={rejected.pain}
                      onClick={() => handleReject("pain")}
                    >
                      미채택
                    </button>
                    <button
                      type="button"
                      className="tag-source"
                      onClick={() => handleOpenSource("pain")}
                    >
                      출처 확인
                    </button>
                  </div>

                  {rejected.pain && (
                    <div className="reject-area">
                      <label className="reject-label">
                        이 페인 포인트에서 수정하거나 보완하고 싶은 점
                      </label>
                      <textarea
                        className="reject-textarea"
                        value={feedback.pain}
                        onChange={(e) =>
                          handleFeedbackChange("pain", e.target.value)
                        }
                        placeholder="예: 가장 큰 문제는 빌드 시간보다 커뮤니케이션 부족임 등"
                      />
                    </div>
                  )}
                </div>
              </article>

              {/* 유저 시나리오 */}
              <article className="output-card">
                <div className="output-card-header">
                  <div className="output-card-title-wrap">
                    <h3 className="output-card-title">유저 시나리오</h3>
                    <span className="output-card-sub">User Scenario</span>
                  </div>
                </div>

                <p className="output-paragraph">{personaData.scenario}</p>

                <div className="output-card-footer">
                  <div className="card-actions">
                    <button
                      type="button"
                      className="tag-adopt"
                      aria-pressed={selected.scenario}
                      onClick={() => handleAdopt("scenario")}
                    >
                      채택
                    </button>
                    <button
                      type="button"
                      className="tag-reject"
                      aria-pressed={rejected.scenario}
                      onClick={() => handleReject("scenario")}
                    >
                      미채택
                    </button>
                    <button
                      type="button"
                      className="tag-source"
                      onClick={() => handleOpenSource("scenario")}
                    >
                      출처 확인
                    </button>
                  </div>

                  {rejected.scenario && (
                    <div className="reject-area">
                      <label className="reject-label">
                        이 유저 시나리오에서 수정하거나 보완하고 싶은 점
                      </label>
                      <textarea
                        className="reject-textarea"
                        value={feedback.scenario}
                        onChange={(e) =>
                          handleFeedbackChange("scenario", e.target.value)
                        }
                        placeholder="예: 실제로는 업무시간 중에 대부분 작업하며, 주말에는 일을 하지 않음 등"
                      />
                    </div>
                  )}
                </div>
              </article>
            </section>

            {/* 하단 CTA 버튼 */}
            <button
              className="output-cta"
              type="button"
              onClick={handleStartInterview}
            >
              AI 페르소나와 인터뷰 하기
            </button>
          </>
        )}

        {/* 출처 모달 */}
        {isSourceOpen && sourceSection && personaData && (
          <div className="source-modal-backdrop">
            <div className="source-modal">
              {(() => {
                const info = getSourceDescription(
                  sourceSection,
                  personaData.meta,
                  userGoal
                );
                return (
                  <>
                    <h3 className="source-title">{info.title}</h3>

                    <ul className="source-list">
                      {info.lines.map((line, idx) => (
                        <li key={idx}>- {line}</li>
                      ))}
                    </ul>

                    <div className="source-ref-block">
                      <h4 className="source-ref-heading">관련 참고자료</h4>

                      {refLoading && <p>관련 자료를 불러오는 중입니다...</p>}
                      {refError && (
                        <p style={{ color: "red" }}>{refError}</p>
                      )}

                      {!refLoading &&
                        !refError &&
                        references.length === 0 && (
                          <p className="source-ref-empty">
                            현재 이 섹션에 연결된 외부 참고자료가 없습니다.
                            입력한 정보만을 기반으로 생성된 결과입니다.
                          </p>
                        )}

                      {!refLoading && !refError && references.length > 0 && (
                        <ul className="source-ref-list">
                          {references.map((ref, idx) => (
                            <li key={idx} className="source-ref-item">
                              <div className="source-ref-title">
                                {ref.title}
                              </div>
                              <div className="source-ref-meta">
                                <span className="source-ref-type">
                                  {ref.type}
                                </span>
                                <span className="source-ref-source">
                                  {ref.source}
                                </span>
                              </div>
                              <p className="source-ref-detail">
                                {ref.detail}
                              </p>
                              {ref.url && ref.url !== "N/A" && (
                                <a
                                  href={ref.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="source-ref-link"
                                >
                                  링크 열기
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      type="button"
                      className="source-close-btn"
                      onClick={() => setIsSourceOpen(false)}
                    >
                      닫기
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
