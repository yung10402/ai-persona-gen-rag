"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendLog } from "@/lib/log";

export default function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pid = searchParams.get("pid") ?? "";

  // product info
  const [serviceType, setServiceType] = useState<"appweb" | "product" | null>(
    null
  );
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceSummary, setServiceSummary] = useState("");

  // designer input for RAG
  const [location, setLocation] = useState("crosswalk");
  const [pedestrianState, setPedestrianState] = useState("relaxed");
  const [scenarioType, setScenarioType] = useState("traffic_stop");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams({
      serviceType: serviceType ?? "",
      serviceCategory,
      serviceSummary,
      location,
      pedestrian_state: pedestrianState,
      scenario_type: scenarioType,
    });

    if (pid) params.set("pid", pid);

    sendLog({
      pid: pid || undefined,
      page: "home",
      event: "home_submit_rag_design",
      payload: {
        serviceType: serviceType ?? "",
        serviceCategory,
        serviceSummary,
        location,
        pedestrian_state: pedestrianState,
        scenario_type: scenarioType,
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
                placeholder="예: delivery robot, shared mobility, eHMI"
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
                placeholder="예: 보행자–로봇 상호작용을 위한 디자인 탐색 도구"
                value={serviceSummary}
                onChange={(e) => setServiceSummary(e.target.value)}
              />
            </div>
          </section>

          <section aria-labelledby="interaction-context-heading">
            <h2 className="AI">
              <span className="text-wrapper">Interaction Context</span>
              <span className="span">를 입력해주세요.</span>
            </h2>

            <div className="form-group">
              <label htmlFor="location" className="text-wrapper-8">
                Place
              </label>
              <input
                type="text"
                id="location"
                className="rectangle-4"
                placeholder="crosswalk, sidewalk, hallway..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="pedestrian-state" className="text-wrapper-8">
                Pedestrian State
              </label>
              <select
                id="pedestrian-state"
                className="rectangle-4"
                value={pedestrianState}
                onChange={(e) => setPedestrianState(e.target.value)}
              >
                <option value="relaxed">relaxed</option>
                <option value="distracted">distracted</option>
                <option value="rushing">rushing</option>
                <option value="carrying_items">carrying_items</option>
                <option value="elderly">elderly</option>
                <option value="group_walking">group_walking</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="scenario-type" className="text-wrapper-8">
                Interaction Scenario
              </label>
              <select
                id="scenario-type"
                className="rectangle-4"
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value)}
              >
                <option value="normal_navigation">normal_navigation</option>
                <option value="robot_yielding">robot_yielding</option>
                <option value="path_conflict">path_conflict</option>
                <option value="traffic_stop">traffic_stop</option>
                <option value="delivery_interaction">delivery_interaction</option>
                <option value="navigation_issue">navigation_issue</option>
              </select>
            </div>
          </section>

          <button type="submit" className="frame-2">
            <span className="text-wrapper-16">디자인 옵션 생성하기</span>
          </button>
        </form>
      </main>
    </div>
  );
}