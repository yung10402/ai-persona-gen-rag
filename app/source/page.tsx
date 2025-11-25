// app/source/page.tsx

import { Suspense } from "react";
import SourcePageClient from "./SourcePageClient";

export default function SourcePage() {
  return (
    <Suspense fallback={<div>출처를 불러오는 중입니다...</div>}>
      <SourcePageClient />
    </Suspense>
  );
}
