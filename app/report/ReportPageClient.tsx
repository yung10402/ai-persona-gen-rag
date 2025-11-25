// app/report/ReportPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type DashboardItem = {
  id: string;
  createdAt: string;
  name: string;
  ageRange: string;
  gender: string;
  occupation: string;
  summary: string;
  full: any; // output에서 저장한 전체 페르소나 데이터
};

export default function ReportPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [item, setItem] = useState<DashboardItem | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const id = searchParams.get("id");
    if (!id) {
      setNotFound(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem("personaDashboardItems");
      if (!raw) {
        setNotFound(true);
        return;
      }

      const list = JSON.parse(raw) as DashboardItem[];
      const found = list.find((p) => p.id === id);

      if (!found) {
        setNotFound(true);
      } else {
        setItem(found);
      }
    } catch (e) {
      console.error("report localStorage 파싱 오류:", e);
      setNotFound(true);
    }
  }, [searchParams]);

  if (notFound) {
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
              onClick={() => router.push("/")}
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
            <span className="output-title-blue">AI 페르소나</span> 레포트
          </h2>
          <p style={{ marginTop: 24 }}>
            해당 ID의 페르소나를 찾을 수 없습니다.
            <br />
            대시보드에서 다시 선택해 주세요.
          </p>
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="screen">
        <header className="frame">
          <div className="header">
            <div className="group">
              <div className="ellipse" />
              <div className="ellipse-2" />
            </div>
            <h1 className="text-wrapper-2">AI Persona Gen</h1>
          </div>
        </header>
        <main className="output-main">
          <p>로딩 중...</p>
        </main>
      </div>
    );
  }

  // full 안에 output에서 저장해 둔 personaData 구조가 들어있다고 가정
  const full = item.full || {};
  const persona = full.persona || {};
  const behavior: string[] = full.behavior || [];
  const needs: string[] = full.needs || [];
  const pain: string[] = full.pain || [];
  const scenario: string = full.scenario || "";

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
            onClick={() => router.push("/")}
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
          <span className="output-title-blue">{item.name}</span> 페르소나 레포트
        </h2>

        {/* 1. 기본 정보 카드 */}
        <section className="persona-card">
          <div className="persona-main">
            <div className="persona-text">
              <h3 className="persona-name">{item.name}</h3>
              <p className="persona-meta">
                {item.ageRange || "나이 미입력"} ·{" "}
                {item.gender || "성별 미입력"} ·{" "}
                {item.occupation || "직업 미입력"}
              </p>
              <p className="persona-desc">
                {item.summary || persona.summary || "요약 정보 없음"}
              </p>
            </div>
          </div>
        </section>

        {/* 2. 행동 / 니즈 / 페인 / 시나리오 카드들 */}
        <section className="output-section-list">
          <article className="output-card">
            <div className="output-card-header">
              <div className="output-card-title-wrap">
                <h3 className="output-card-title">행동 패턴</h3>
                <span className="output-card-sub">Behavioral Patterns</span>
              </div>
            </div>
            <ul className="output-list">
              {behavior.length === 0 && <li>데이터 없음</li>}
              {behavior.map((b, idx) => (
                <li key={idx}>– {b}</li>
              ))}
            </ul>
          </article>

          <article className="output-card">
            <div className="output-card-header">
              <div className="output-card-title-wrap">
                <h3 className="output-card-title">니즈·목표</h3>
                <span className="output-card-sub">Needs / Goals</span>
              </div>
            </div>
            <ul className="output-list">
              {needs.length === 0 && <li>데이터 없음</li>}
              {needs.map((n, idx) => (
                <li key={idx}>– {n}</li>
              ))}
            </ul>
          </article>

          <article className="output-card">
            <div className="output-card-header">
              <div className="output-card-title-wrap">
                <h3 className="output-card-title">페인 포인트</h3>
                <span className="output-card-sub">Pain Points</span>
              </div>
            </div>
            <ul className="output-list">
              {pain.length === 0 && <li>데이터 없음</li>}
              {pain.map((p, idx) => (
                <li key={idx}>– {p}</li>
              ))}
            </ul>
          </article>

          <article className="output-card">
            <div className="output-card-header">
              <div className="output-card-title-wrap">
                <h3 className="output-card-title">유저 시나리오</h3>
                <span className="output-card-sub">User Scenario</span>
              </div>
            </div>
            <p className="output-paragraph">
              {scenario || "시나리오 정보 없음"}
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
