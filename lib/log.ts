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
    console.warn("[log] NEXT_PUBLIC_LOG_WEBHOOK_URL 가 비어 있습니다.");
    return;
  }

  console.log("[log] will send to:", WEBHOOK_URL, "data:", data); // ★ 디버그용

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
