// app/report/page.tsx
import { Suspense } from "react";
import ReportPageClient from "./ReportPageClient";

export default function ReportPage() {
  return (
    <Suspense fallback={<div>레포트를 불러오는 중입니다...</div>}>
      <ReportPageClient />
    </Suspense>
  );
}
