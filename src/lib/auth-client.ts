import type { ErrorResponse } from "@/lib/api-types";

export async function readErrorMessage(response: Response): Promise<string> {
  const fallback = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await response.json()) as Partial<ErrorResponse> &
        Record<string, unknown>;
      const message = body.message ?? body.error;

      return typeof message === "string" && message.trim() ? message : fallback;
    } catch {
      return fallback;
    }
  }

  // 서버 오류 페이지(HTML)를 그대로 보여 주지 않는다.
  if (contentType.includes("text/html")) return fallback;

  const text = await response.text();
  return text.trim() || fallback;
}
