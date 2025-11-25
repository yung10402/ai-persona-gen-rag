"use client";

export const dynamic = "force-dynamic";   // ★★ 이 한 줄만 추가하면 Vercel 빌드 성공 ★★

import { Suspense } from "react";
import HomePageInner from "./HomePageInner";

export default function Page() {
  return (
    <Suspense fallback={<div>화면을 불러오는 중입니다...</div>}>
      <HomePageInner />
    </Suspense>
  );
}
