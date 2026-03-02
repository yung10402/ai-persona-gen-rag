"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { sendLog } from "@/lib/log";

type EhmiApiResponse = {
  message?: string;
  rationale?: string;
  citations?: Array<{
    id?: string;
    source_id?: string;
    snippet?: string;
    quote?: string;
    score?: number;
  }>;
  debug?: any;
};

type EhmiResult = {
  message: string;
  rationale: string;
  citations: Array<{ id: string; snippet: string }>;
  debug?: any;
};

type RiskLevel = "low" | "mid" | "high";
type Language = "ko" | "en";

function toNumber(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toRiskLevel(value: string | null): RiskLevel {
  if (value === "low" || value === "mid" || value === "high") return value;
  return "high";
}

function toLanguage(value: string | null): Language {
  if (value === "en") return "en";
  return "ko";
}

export default function OutputPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pid = searchParams.get("pid") ?? "";

  // HomePageInner에서 넘어온 eHMI 쿼리
  const mobilityType = searchParams.get("mobilityType") ?? "";
  const location = searchParams.get("location") ?? "";
  const interaction = searchParams.get("interaction") ?? "";
  const riskLevel = toRiskLevel(searchParams.get("riskLevel"));
  const targetUserRaw = searchParams.get("targetUser") ?? "";

  const distanceM = toNumber(searchParams.get("distanceM"), 1.5);
  const speedMps = toNumber(searchParams.get("speedMps"), 1.2);

  const maxChars = toNumber(searchParams.get("maxChars"), 30);
  const tone = searchParams.get("tone") ?? "firm_polite";
  const language = toLanguage(searchParams.get("language"));

  // (옵션) 프로덕트 정보도 같이 넘어오면 로그에만 사용
  const serviceType = searchParams.get("serviceType") ?? "";
  const serviceCategory = searchParams.get("serviceCategory") ?? "";
  const serviceSummary = searchParams.get("serviceSummary") ?? "";

  const [ehmiData, setEhmiData] = useState<EhmiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnyInput = !!(mobilityType || location || interaction || targetUserRaw);

  // query → API body
  const ehmiRequestBody = useMemo(() => {
    const targetUser = targetUserRaw
      ? targetUserRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    return {
      mobilityType: mobilityType || "shared_scooter",
      location: location || "sidewalk",
      interaction: interaction || "yield",
      riskLevel,
      targetUser,
      distanceM,
      speedMps,
      constraints: {
        maxChars,
        tone,
        language,
      },
    };
  }, [
    mobilityType,
    location,
    interaction,
    riskLevel,
    targetUserRaw,
    distanceM,
    speedMps,
    maxChars,
    tone,
    language,
  ]);

  useEffect(() => {
    if (!hasAnyInput) return;

    const fetchEhmi = async () => {
      try {
        setLoading(true);
        setError(null);
        setEhmiData(null);

        const res = await fetch("/api/generateEhmi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ehmiRequestBody),
        });

        if (!res.ok) {
          const msg = await res.text();
          console.error("generateEhmi error:", msg);
          setError("eHMI 메시지 생성에 실패했습니다.");
          return;
        }

        const raw = (await res.json()) as EhmiApiResponse;

        const result: EhmiResult = {
          message: String(raw?.message ?? ""),
          rationale: String(raw?.rationale ?? ""),
          citations: Array.isArray(raw?.citations)
            ? raw.citations.map((c, idx) => ({
                id: String(c?.id ?? c?.source_id ?? `C${idx + 1}`),
                snippet: String(c?.snippet ?? c?.quote ?? ""),
              }))
            : [],
          debug: raw?.debug,
        };

        setEhmiData(result);

        void sendLog({
          pid: pid || undefined,
          page: "output",
          event: "ehmi_generated",
          payload: {
            serviceType,
            serviceCategory,
            serviceSummary,
            ehmiRequestBody,
            ehmi: result,
          },
        });
      } catch (e) {
        console.error(e);
        setError("eHMI 생성 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchEhmi();
  }, [
    hasAnyInput,
    pid,
    serviceType,
    serviceCategory,
    serviceSummary,
    ehmiRequestBody,
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
              <img className="img" src="/img/Dashboard.svg" alt="대시보드 아이콘" />
            </div>
          </nav>
        </div>
      </header>

      <main className="output-main">
        <h2 className="output-title">
          <span className="output-title-blue">eHMI</span> 결과
        </h2>

        {!hasAnyInput && (
          <p>
            입력값이 없습니다. 홈에서 eHMI 상황을 입력한 뒤 생성해주세요.
          </p>
        )}

        {!ehmiData && hasAnyInput && (
          <>
            {loading && <p>AI가 eHMI 메시지를 생성하는 중입니다...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
          </>
        )}

        {ehmiData && (
          <section className="persona-card">
            <div className="persona-main">
              <div className="persona-text">
                <h3 className="persona-name">eHMI 메시지</h3>
                <p className="persona-desc">{ehmiData.message}</p>

                {ehmiData.rationale && (
                  <>
                    <h4 style={{ marginTop: 12 }}>근거</h4>
                    <p className="persona-desc">{ehmiData.rationale}</p>
                  </>
                )}

                {ehmiData.citations.length > 0 && (
                  <>
                    <h4 style={{ marginTop: 12 }}>인용</h4>
                    <ul className="output-list">
                      {ehmiData.citations.map((c) => (
                        <li key={c.id}>
                          – [{c.id}] {c.snippet}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <h4 style={{ marginTop: 12 }}>입력</h4>
                <ul className="output-list">
                  <li>– mobilityType: {ehmiRequestBody.mobilityType}</li>
                  <li>– location: {ehmiRequestBody.location}</li>
                  <li>– interaction: {ehmiRequestBody.interaction}</li>
                  <li>– riskLevel: {ehmiRequestBody.riskLevel}</li>
                  <li>– targetUser: {ehmiRequestBody.targetUser.join(", ") || "(없음)"}</li>
                  <li>– distance: {ehmiRequestBody.distanceM} m</li>
                  <li>– speed: {ehmiRequestBody.speedMps} m/s</li>
                  <li>– maxChars: {ehmiRequestBody.constraints.maxChars}</li>
                  <li>– tone: {ehmiRequestBody.constraints.tone}</li>
                  <li>– language: {ehmiRequestBody.constraints.language}</li>
                </ul>

                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="output-cta"
                    onClick={() => router.push(pid ? `/?pid=${pid}` : "/")}
                  >
                    입력 다시 하기
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}