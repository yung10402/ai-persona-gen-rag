"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendLog } from "@/lib/log";

type RiskLevel = "low" | "mid" | "high";
type Language = "ko" | "en";

export default function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pid = searchParams.get("pid") ?? "";

  // 프로덕트 정보(그대로 유지)
  const [serviceType, setServiceType] = useState<"appweb" | "product" | null>(
    null
  );
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceSummary, setServiceSummary] = useState("");

  // eHMI 입력
  const [mobilityType, setMobilityType] = useState("shared_scooter");
  const [location, setLocation] = useState("sidewalk");
  const [interaction, setInteraction] = useState("yield");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("high");
  const [targetUser, setTargetUser] = useState("elderly");

  const [distanceM, setDistanceM] = useState<number>(1.5);
  const [speedMps, setSpeedMps] = useState<number>(1.2);

  const [maxChars, setMaxChars] = useState<number>(30);
  const [tone, setTone] = useState("firm_polite");
  const [language, setLanguage] = useState<Language>("ko");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams({
      // 기존 프로덕트 정보(옵션)
      serviceType: serviceType ?? "",
      serviceCategory,
      serviceSummary,

      // eHMI 정보
      mobilityType,
      location,
      interaction,
      riskLevel,
      targetUser,
      distanceM: String(distanceM),
      speedMps: String(speedMps),
      maxChars: String(maxChars),
      tone,
      language,
    });

    if (pid) params.set("pid", pid);

    // 로그
    sendLog({
      pid: pid || undefined,
      page: "home",
      event: "home_submit_ehmi",
      payload: {
        serviceType: serviceType ?? "",
        serviceCategory,
        serviceSummary,
        mobilityType,
        location,
        interaction,
        riskLevel,
        targetUser,
        distanceM,
        speedMps,
        constraints: { maxChars, tone, language },
      },
    });

    router.push(`/output?${params.toString()}`);
  };

  return (
    <div className="screen">
      <header className="frame">
        <div className="header">
          <div className="rectangle"></div>
          <h1 className="text-wrapper-2">AI Persona Gen</h1>
          <div className="group">
            <div className="ellipse"></div>
            <div className="ellipse-2"></div>
          </div>

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

      <main>
        <form onSubmit={handleSubmit}>
          <section aria-labelledby="product-info-heading">
            <h2 className="div">
              <span className="text-wrapper">프로덕트 정보</span>
              <span className="span">를 입력해주세요.</span>
            </h2>

            <h3 className="text-wrapper-3">프로덕트 정보</h3>

            <div className="form-group">
              <label htmlFor="service-type" className="text-wrapper-10">
                서비스 타입
              </label>

              <div className="service-type-options">
                <div className="group-wrapper">
                  <button
                    type="button"
                    className="group-3"
                    aria-pressed={serviceType === "appweb"}
                    onClick={() => setServiceType("appweb")}
                  >
                    <span className="text-wrapper-11">앱/웹</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="group-4"
                  aria-pressed={serviceType === "product"}
                  onClick={() => setServiceType("product")}
                >
                  <span className="text-wrapper-12">제품</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="service-category" className="text-wrapper-5">
                서비스 카테고리
              </label>

              <input
                type="text"
                id="service-category"
                className="rectangle-2"
                placeholder="공유 모빌리티, 로봇, 자율주행, eHMI…"
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="service-summary" className="text-wrapper-4">
                서비스 한 줄 요약
              </label>

              <input
                type="text"
                id="service-summary"
                className="rectangle-3"
                placeholder="ex) 보행자와의 상호작용을 위한 공유 모빌리티 eHMI 메시지 생성"
                value={serviceSummary}
                onChange={(e) => setServiceSummary(e.target.value)}
              />
            </div>
          </section>

          {/* eHMI 입력 섹션 */}
          <section aria-labelledby="ehmi-info-heading">
            <h2 className="AI">
              <span className="text-wrapper">eHMI 상황 정보</span>
              <span className="span">를 입력해주세요.</span>
            </h2>

            <div className="form-group">
              <label className="text-wrapper-8">모빌리티 타입</label>
              <input
                type="text"
                className="rectangle-4"
                placeholder="shared_scooter, shared_bike, shuttle..."
                value={mobilityType}
                onChange={(e) => setMobilityType(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="text-wrapper-8">장소/맥락</label>
              <input
                type="text"
                className="rectangle-4"
                placeholder="sidewalk, crosswalk, hallway..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="text-wrapper-8">상호작용 타입</label>
              <input
                type="text"
                className="rectangle-4"
                placeholder="yield, warning, stop, passing..."
                value={interaction}
                onChange={(e) => setInteraction(e.target.value)}
              />
            </div>

            <fieldset className="form-group">
              <legend className="text-wrapper-7">위험도</legend>
              <div className="gender-options">
                <button
                  type="button"
                  className="gender"
                  aria-pressed={riskLevel === "low"}
                  onClick={() => setRiskLevel("low")}
                >
                  <span className="text-wrapper-17">low</span>
                </button>
                <button
                  type="button"
                  className="gender-2"
                  aria-pressed={riskLevel === "mid"}
                  onClick={() => setRiskLevel("mid")}
                >
                  <span className="text-wrapper-17">mid</span>
                </button>
                <button
                  type="button"
                  className="gender-2"
                  aria-pressed={riskLevel === "high"}
                  onClick={() => setRiskLevel("high")}
                >
                  <span className="text-wrapper-17">high</span>
                </button>
              </div>
            </fieldset>

            <div className="form-group">
              <label className="text-wrapper-9">대상 보행자</label>
              <textarea
                className="rectangle-5"
                rows={3}
                placeholder="elderly, child, group, phone user..."
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="text-wrapper-8">거리 (m)</label>
              <input
                type="number"
                step="0.1"
                className="rectangle-4"
                value={distanceM}
                onChange={(e) => setDistanceM(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="text-wrapper-8">속도 (m/s)</label>
              <input
                type="number"
                step="0.1"
                className="rectangle-4"
                value={speedMps}
                onChange={(e) => setSpeedMps(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="text-wrapper-8">최대 글자수</label>
              <input
                type="number"
                className="rectangle-4"
                value={maxChars}
                onChange={(e) => setMaxChars(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="text-wrapper-8">톤</label>
              <input
                type="text"
                className="rectangle-4"
                placeholder="firm_polite, polite, calm..."
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              />
            </div>

            <fieldset className="form-group">
              <legend className="text-wrapper-7">언어</legend>
              <div className="gender-options">
                <button
                  type="button"
                  className="gender"
                  aria-pressed={language === "ko"}
                  onClick={() => setLanguage("ko")}
                >
                  <span className="text-wrapper-17">ko</span>
                </button>
                <button
                  type="button"
                  className="gender-2"
                  aria-pressed={language === "en"}
                  onClick={() => setLanguage("en")}
                >
                  <span className="text-wrapper-17">en</span>
                </button>
              </div>
            </fieldset>
          </section>

          <button type="submit" className="frame-2">
            <span className="text-wrapper-16">eHMI 메시지 생성하기</span>
          </button>
        </form>
      </main>
    </div>
  );
}