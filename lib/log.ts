// lib/log.ts
const WEBHOOK_URL = process.env.NEXT_PUBLIC_LOG_WEBHOOK_URL;

type LogPayload = {
  event: string;
  page?: string;
  pid?: string;
  payload?: any;
};

export async function sendLog(data: LogPayload) {
  if (!WEBHOOK_URL) {
    // 로컬에서 웹훅 안 쓸 때도 있으니까 에러 말고 조용히 넘기고 싶으면 warn 유지
    console.warn("[log] NEXT_PUBLIC_LOG_WEBHOOK_URL 가 비어 있습니다.");
    return;
  }

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        ts: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("[log] failed to fetch:", err);
  }
}