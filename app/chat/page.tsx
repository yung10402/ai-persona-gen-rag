"use client";

export const dynamic = "force-dynamic";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendLog } from "@/lib/log"; // ★ 로그 유틸 추가

type Message = {
  id: number;
  role: "user" | "ai";
  text: string;
  time: string;
};

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
  aiPersona: any;
  sectionReview: Record<SectionKey, SectionReviewLog>;
};

type FeedbackState = {
  rejected: boolean;
  feedback: string;
};

// CSV 다운로드 유틸
function downloadCsv(filename: string, rows: string[][]) {
  const escapeCell = (value: string) => {
    const v = value ?? "";
    const escaped = v.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const csvContent = rows
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ★ pid도 같이 가져오기 (output에서 넘겨줌)
  const pid = searchParams.get("pid") ?? "";

  // output → chat 에서 넘어오는 값들
  const name = searchParams.get("name") ?? "사용자";
  const ageRange = searchParams.get("ageRange") ?? "나이 정보 없음";
  const personaGender = searchParams.get("gender") ?? "성별 정보 없음";
  const job = searchParams.get("occupation") ?? "직업 정보 없음";
  const serviceSummary =
    searchParams.get("serviceSummary") ??
    "웹/앱 기반 서비스를 사용하는 페르소나입니다.";

  const summary = searchParams.get("summary") ?? "";
  const scenario = searchParams.get("scenario") ?? "";

  const behaviorRaw = searchParams.get("behavior") ?? "[]";
  const needsRaw = searchParams.get("needs") ?? "[]";
  const painRaw = searchParams.get("pain") ?? "[]";

  let behavior: string[] = [];
  let needs: string[] = [];
  let pain: string[] = [];

  try {
    behavior = JSON.parse(behaviorRaw);
  } catch {
    behavior = [];
  }
  try {
    needs = JSON.parse(needsRaw);
  } catch {
    needs = [];
  }
  try {
    pain = JSON.parse(painRaw);
  } catch {
    pain = [];
  }

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedbackByMsg, setFeedbackByMsg] = useState<
    Record<number, FeedbackState>
  >({});

  // 전체 로그(세션 + 채팅)를 localStorage에 누적 저장
  const saveFullLogToLocal = (session: PersonaSessionLog | null) => {
    if (typeof window === "undefined") return;
    if (!session) return;

    const logEntry = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      session, // Output에서 저장한 userInput + aiPersona + sectionReview
      chatMessages: messages,
      chatFeedback: feedbackByMsg,
    };

    try {
      const raw = window.localStorage.getItem("personaLogs");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(logEntry);
      window.localStorage.setItem("personaLogs", JSON.stringify(arr));
      console.log("full log saved:", logEntry);
    } catch (e) {
      console.error("full log save failed:", e);
    }
  };

  // 채팅 전송
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const time = new Date().toLocaleTimeString("ko-KR", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // 현재까지 메시지 개수 기준으로 index 계산
    const baseIndex = messages.length;

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      text: trimmed,
      time,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // ★ 로그: 유저 메세지
    void sendLog({
      pid,
      page: "chat",
      event: "chat_user_message",
      payload: {
        index: baseIndex, // 대화 순서
        text: trimmed,
        time,
      },
    });

    try {
      const apiMessages = [
        {
          role: "system" as const,
          content: `
너는 UX 리서치용 AI 페르소나이다.
다음 정보를 가진 한 사람처럼 일관된 1인칭 말투로 답변해라.

[기본 프로필]
- 이름: ${name}
- 연령대: ${ageRange}
- 성별: ${personaGender}
- 직업: ${job}
- 사용 중인 서비스 요약: ${serviceSummary}

[페르소나 요약]
${summary || "(요약 정보 없음)"}

[행동 패턴 예시]
${
  behavior.length
    ? behavior
        .slice(0, 5)
        .map((b, i) => `${i + 1}. ${b}`)
        .join("\n")
    : "(행동 패턴 없음)"
}

[니즈·목표 예시]
${
  needs.length
    ? needs
        .slice(0, 5)
        .map((n, i) => `${i + 1}. ${n}`)
        .join("\n")
    : "(니즈 정보 없음)"
}

[페인 포인트 예시]
${
  pain.length
    ? pain
        .slice(0, 5)
        .map((p, i) => `${i + 1}. ${p}`)
        .join("\n")
    : "(페인 포인트 없음)"
}

[유저 시나리오 요약]
${scenario ? scenario.slice(0, 600) : "(시나리오 없음)"}

규칙:
- 네 자신을 "나는"으로 지칭하고, 실제 사람처럼 자연스럽게 답하라.
- 질문에 직접적으로 답하되, 설정된 페르소나와 모순되지 않게 유지하라.
- UX 리서치 인터뷰 상황을 가정하되, 너무 길게 장황하게 말하지 말고 3~6문장 정도로 답변하라.
        `,
        },
        ...messages.map((m) =>
          m.role === "user"
            ? ({ role: "user", content: m.text } as const)
            : ({ role: "assistant", content: m.text } as const)
        ),
        { role: "user" as const, content: trimmed },
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        console.error("chat api error:", await res.text());
        const errMsg: Message = {
          id: Date.now() + 2,
          role: "ai",
          text: "지금은 인터뷰 응답을 생성할 수 없습니다. 잠시 후 다시 시도해 주세요.",
          time,
        };
        setMessages((prev) => [...prev, errMsg]);

        // ★ 에러도 로그로 남겨두고 싶으면 여기에 sendLog 추가 가능
        return;
      }

      const data = await res.json();
      const aiText = data.reply ?? "(응답 없음)";

      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "ai",
        text: aiText,
        time: new Date().toLocaleTimeString("ko-KR", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // ★ 로그: AI 메세지
      void sendLog({
        pid,
        page: "chat",
        event: "chat_ai_message",
        payload: {
          index: baseIndex + 1, // 유저 바로 다음
          text: aiText,
        },
      });
    } catch (error) {
      console.error("채팅 API 호출 실패:", error);
      const errMsg: Message = {
        id: Date.now() + 3,
        role: "ai",
        text: "네트워크 오류로 응답을 불러오지 못했습니다.",
        time,
      };
      setMessages((prev) => [...prev, errMsg]);
    }
  };

  const toggleBad = (id: number) => {
    setFeedbackByMsg((prev) => {
      const current = prev[id];
      const nextRejected = !(current?.rejected ?? false);

      const next = {
        ...prev,
        [id]: {
          rejected: nextRejected,
          feedback: nextRejected ? current?.feedback ?? "" : "",
        },
      };

      // ★ 토글할 때도 간단히 로그 남겨두기
      void sendLog({
        pid,
        page: "chat",
        event: "chat_feedback_toggle",
        payload: {
          messageId: id,
          rejected: nextRejected,
        },
      });

      return next;
    });
  };

  const handleFeedbackChange = (id: number, value: string) => {
    setFeedbackByMsg((prev) => {
      const next = {
        ...prev,
        [id]: {
          rejected: true,
          feedback: value,
        },
      };

      return next;
    });
    // 실제 텍스트는 아래 “로그 보내기” 버튼 눌렀을 때 한 번에 서버로 전송
  };

  // 현재 채팅 + 피드백 구조화
  const buildChatPayload = () => {
    return {
      messages: messages.map((m, idx) => {
        const fb = feedbackByMsg[m.id];
        return {
          index: idx,
          id: m.id,
          role: m.role,
          text: m.text,
          time: m.time,
          aiRejected: m.role === "ai" ? !!fb?.rejected : undefined,
          userFeedback: m.role === "ai" ? fb?.feedback ?? "" : undefined,
        };
      }),
    };
  };

  // ★ 버튼 눌렀을 때: 세션 + 채팅 + 피드백 한 번에 서버로 로그 전송
  const handleSendChatLog = () => {
    if (typeof window === "undefined") return;

    let session: PersonaSessionLog | null = null;
    try {
      const raw = window.localStorage.getItem("currentPersonaSession");
      if (raw) {
        session = JSON.parse(raw) as PersonaSessionLog;
      }
    } catch (e) {
      console.error("세션 로그 읽기 실패:", e);
    }

    if (!session) {
      alert(
        "세션 로그를 찾을 수 없습니다. Output 화면에서 다시 인터뷰를 시작해 주세요."
      );
      return;
    }

    const chatPayload = buildChatPayload();

    void sendLog({
      pid,
      page: "chat",
      event: "chat_session_log",
      payload: {
        session,
        chat: chatPayload,
      },
    });

    alert("이번 인터뷰 로그를 서버에 저장했습니다.");
  };

  // CSV 내보내기 (+ 전체 로그 localStorage 누적)
  const handleExportCsv = () => {
    if (typeof window === "undefined") return;

    let session: PersonaSessionLog | null = null;
    try {
      const raw = window.localStorage.getItem("currentPersonaSession");
      if (raw) {
        session = JSON.parse(raw) as PersonaSessionLog;
      }
    } catch (e) {
      console.error("세션 로그 읽기 실패:", e);
    }

    if (!session) {
      alert(
        "세션 로그를 찾을 수 없습니다. Output 화면에서 다시 인터뷰를 시작해 주세요."
      );
      return;
    }

    // 전체 로그 localStorage에 누적 저장
    saveFullLogToLocal(session);

    // 1) 사용자 입력
    const u = session.userInput;
    const rowsUser: string[][] = [
      ["field", "value"],
      ["serviceType", u.serviceType || ""],
      ["serviceCategory", u.serviceCategory || ""],
      ["serviceSummary", u.serviceSummary || ""],
      ["ageRange", u.ageRange || ""],
      ["gender", u.gender || ""],
      ["occupation", u.occupation || ""],
      ["userGoal", u.userGoal || ""],
    ];

    // 2) AI 생성 값
    const ai = session.aiPersona || {};
    const rowsAi: string[][] = [["section", "index", "text"]];

    if (ai.persona?.summary) {
      rowsAi.push(["persona_summary", "0", ai.persona.summary]);
    }
    (ai.behavior || []).forEach((t: string, idx: number) => {
      rowsAi.push(["behavior", String(idx), t]);
    });
    (ai.needs || []).forEach((t: string, idx: number) => {
      rowsAi.push(["needs", String(idx), t]);
    });
    (ai.pain || []).forEach((t: string, idx: number) => {
      rowsAi.push(["pain", String(idx), t]);
    });
    if (ai.scenario) {
      rowsAi.push(["scenario", "0", ai.scenario]);
    }

    // 3) 섹션 채택/미채택 + 출처 클릭
    const rowsReview: string[][] = [
      ["section", "adopted", "rejected", "feedback", "sourceClicks"],
    ];

    (["persona", "behavior", "needs", "pain", "scenario"] as SectionKey[]).forEach(
      (key) => {
        const r = session!.sectionReview[key];
        rowsReview.push([
          key,
          r?.adopted ? "1" : "0",
          r?.rejected ? "1" : "0",
          r?.feedback || "",
          String(r?.sourceClicks ?? 0),
        ]);
      }
    );

    // 4) 인터뷰 로그 (현재 채팅 + per-message feedback)
    const rowsChat: string[][] = [
      ["time", "role", "text", "aiRejected", "userFeedback"],
    ];

    messages.forEach((m) => {
      const fb = m.role === "ai" ? feedbackByMsg[m.id] : undefined;
      rowsChat.push([
        m.time,
        m.role,
        m.text,
        fb?.rejected ? "1" : "0",
        fb?.feedback || "",
      ]);
    });

    // CSV 네 개 다운로드
    downloadCsv("1_user_input.csv", rowsUser);
    downloadCsv("2_ai_persona.csv", rowsAi);
    downloadCsv("3_section_review.csv", rowsReview);
    downloadCsv("4_interview_log.csv", rowsChat);
  };

  return (
    <div className="screen">
      {/* 헤더 */}
      <header className="frame">
        <div className="header">
          <div className="rectangle" />
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

      <main>
        <div className="chat-container">
          {/* 상단 요약 */}
          <h2 className="chat-title">AI 페르소나 정보 요약</h2>

          <section
            className="chat-summary-card"
            aria-label="AI 페르소나 정보 요약"
          >
            <div className="chat-summary-header">
              <div className="chat-summary-col">이름</div>
              <div className="chat-summary-col">연령대</div>
              <div className="chat-summary-col">직업</div>
            </div>
            <div className="chat-summary-row">
              <div className="chat-summary-col">{name}</div>
              <div className="chat-summary-col">{ageRange}</div>
              <div className="chat-summary-col">{job}</div>
            </div>
          </section>

          {/* 버튼들 */}
          <section
            className="chat-messages-header"
            aria-label="인터뷰 로그 저장/내보내기"
          >
            <button
              type="button"
              className="chat-export-btn"
              onClick={handleSendChatLog}
            >
              이번 인터뷰 로그 서버로 보내기
            </button>
            <button
              type="button"
              className="chat-export-btn"
              onClick={handleExportCsv}
            >
              CSV로 로그 저장하기
            </button>
          </section>

          {/* 채팅 영역 */}
          <section
            className="chat-messages"
            aria-label="AI 페르소나와의 채팅 메세지"
          >
            {messages.map((msg) => {
              const fb = feedbackByMsg[msg.id];
              const isRejected = fb?.rejected ?? false;

              return (
                <div
                  key={msg.id}
                  className={
                    msg.role === "ai"
                      ? "chat-message-row chat-message-ai"
                      : "chat-message-row chat-message-user"
                  }
                >
                  <div className="chat-bubble-wrapper">
                    <div className="chat-bubble">{msg.text}</div>
                    <div className="chat-time">{msg.time}</div>

                    {msg.role === "ai" && (
                      <div className="chat-feedback">
                        <button
                          type="button"
                          className="chat-bad-btn"
                          aria-pressed={isRejected}
                          onClick={() => toggleBad(msg.id)}
                        >
                          <img
                            src="/img/thumb-down.svg"
                            alt="응답이 적절하지 않음"
                            className="chat-bad-icon"
                          />
                          <span className="chat-bad-label">
                            응답이 맞지 않음
                          </span>
                        </button>

                        {isRejected && (
                          <div className="chat-feedback-area">
                            <label className="chat-feedback-label">
                              이 응답이 맞지 않는 이유를 적어주세요
                            </label>
                            <textarea
                              className="chat-feedback-textarea"
                              value={fb?.feedback ?? ""}
                              onChange={(e) =>
                                handleFeedbackChange(msg.id, e.target.value)
                              }
                              placeholder="예: 실제 사용자 행동과 다름, 페르소나 설정과 맞지 않음 등"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          {/* 입력창 */}
          <form className="chat-input-bar" onSubmit={handleSubmit}>
            <textarea
              className="chat-input"
              placeholder="AI 페르소나와 인터뷰를 진행해보세요."
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="chat-send-btn"
              aria-label="메세지 보내기"
            >
              <span className="chat-send-icon">➤</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="chat-loading">채팅 화면을 불러오는 중입니다...</div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
