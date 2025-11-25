"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendLog } from "@/lib/log";

export default function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // UT 링크에서 ?pid=U01 이런 식으로 들어오는 참가자 ID
  const pid = searchParams.get("pid") ?? "";

  // 상태들
  const [serviceType, setServiceType] = useState<"appweb" | "product" | null>(
    null
  );
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceSummary, setServiceSummary] = useState("");
  const [ageRange, setAgeRange] = useState<string | null>(null); // 기본값 null
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [occupation, setOccupation] = useState("");
  const [userGoal, setUserGoal] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams({
      serviceType: serviceType ?? "",
      serviceCategory,
      serviceSummary,
      ageRange: ageRange ?? "",
      gender: gender ?? "",
      occupation,
      userGoal,
      // pid도 같이 넘기고 싶으면 주석 해제
      // pid: pid ?? "",
    });

    // 1) 홈 제출 시점 로그 한 줄 쏘기
    sendLog({
      pid: pid || undefined, // 없으면 undefined
      page: "home",
      event: "home_submit",
      payload: {
        serviceType: serviceType ?? "",
        serviceCategory,
        serviceSummary,
        ageRange: ageRange ?? "",
        gender: gender ?? "",
        occupation,
        userGoal,
      },
    });

    // 2) output 페이지로 이동
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

          {/* 홈 아이콘: / 로 이동 */}
          <nav
            className="home"
            aria-label="홈으로 이동"
            onClick={() => router.push("/")}
          >
            <div className="material-symbols">
              <img className="vector" src="/img/Home.svg" alt="홈 아이콘" />
            </div>
          </nav>

          {/* 대시보드 아이콘: /dashboard 로 이동 */}
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

      {/* 전체를 form으로 감싸기 */}
      <main>
        <form onSubmit={handleSubmit}>
          <section aria-labelledby="product-info-heading">
            <h2 className="div">
              <span className="text-wrapper">프로덕트 정보</span>
              <span className="span">를 입력해주세요.</span>
            </h2>

            <h3 className="text-wrapper-3">프로덕트 정보</h3>

            {/* 서비스 타입 */}
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

            {/* 서비스 카테고리 */}
            <div className="form-group">
              <label htmlFor="service-category" className="text-wrapper-5">
                서비스 카테고리
              </label>

              <input
                type="text"
                id="service-category"
                className="rectangle-2"
                placeholder="생산성 도구, 이커머스, 헬스케어, 교육, 금융, 소셜 플랫폼…"
                aria-describedby="service-category-hint"
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
              />

              <span id="service-category-hint" className="p"></span>
            </div>

            {/* 서비스 한 줄 요약 */}
            <div className="form-group">
              <label htmlFor="service-summary" className="text-wrapper-4">
                서비스 한 줄 요약
              </label>

              <input
                type="text"
                id="service-summary"
                className="rectangle-3"
                placeholder="ex) 회의 메모를 자동으로 요약하고 액션 아이템을 추출하는 협업 도구"
                aria-describedby="service-summary-hint"
                value={serviceSummary}
                onChange={(e) => setServiceSummary(e.target.value)}
              />

              <span
                id="service-summary-hint"
                className="text-wrapper-15"
              ></span>
            </div>
          </section>

          {/* AI 페르소나 정보 */}
          <section aria-labelledby="persona-info-heading">
            <h2 className="AI">
              <span className="text-wrapper">AI 페르소나 정보</span>
              <span className="span">를 입력해주세요.</span>
            </h2>

            {/* 나이 */}
            <fieldset className="form-group">
              <legend className="text-wrapper-6">나이</legend>

              <div className="age-options">
                <button
                  type="button"
                  className="frame-3"
                  aria-pressed={ageRange === "10-19"}
                  onClick={() => setAgeRange("10-19")}
                >
                  <span className="text-wrapper-18">10-19</span>
                </button>

                <button
                  type="button"
                  className="element-wrapper"
                  aria-pressed={ageRange === "20-29"}
                  onClick={() => setAgeRange("20-29")}
                >
                  <span className="element">20-29</span>
                </button>

                <button
                  type="button"
                  className="div-wrapper"
                  aria-pressed={ageRange === "30-39"}
                  onClick={() => setAgeRange("30-39")}
                >
                  <span className="element-2">30-39</span>
                </button>

                <button
                  type="button"
                  className="group-2"
                  aria-pressed={ageRange === "40-49"}
                  onClick={() => setAgeRange("40-49")}
                >
                  <span className="element-3">40-49</span>
                </button>
              </div>
            </fieldset>

            {/* 성별 */}
            <fieldset className="form-group">
              <legend className="text-wrapper-7">성별</legend>

              <div className="gender-options">
                <button
                  type="button"
                  className="gender"
                  aria-pressed={gender === "male"}
                  onClick={() => setGender("male")}
                >
                  <span className="text-wrapper-17">남자</span>
                </button>

                <button
                  type="button"
                  className="gender-2"
                  aria-pressed={gender === "female"}
                  onClick={() => setGender("female")}
                >
                  <span className="text-wrapper-17">여자</span>
                </button>
              </div>
            </fieldset>

            {/* 직업 */}
            <div className="form-group">
              <label htmlFor="occupation" className="text-wrapper-8">
                직업
              </label>

              <input
                type="text"
                id="occupation"
                className="rectangle-4"
                placeholder="마케터, 대학생, 개발자…"
                aria-describedby="occupation-hint"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              />

              <span id="occupation-hint" className="text-wrapper-13"></span>
            </div>

            {/* 사용자 특성 입력 */}
            <div className="form-group">
              <label htmlFor="user-goal" className="text-wrapper-9">
                사용자 특성 입력
              </label>

              <textarea
                id="user-goal"
                className="rectangle-5"
                placeholder="AI 페르소나의 주요 특성을 입력하세요 (취미, 성향 등)"
                aria-describedby="user-goal-hint"
                rows={5}
                value={userGoal}
                onChange={(e) => setUserGoal(e.target.value)}
              ></textarea>

              <span id="user-goal-hint" className="text-wrapper-14"></span>
            </div>
          </section>

          {/* 제출 버튼 */}
          <button type="submit" className="frame-2">
            <span className="text-wrapper-16">AI 페르소나 생성하기</span>
          </button>
        </form>
      </main>
    </div>
  );
}
