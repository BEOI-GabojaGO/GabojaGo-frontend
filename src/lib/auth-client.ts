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

/** 로그인 후 돌아올 경로를 붙인 로그인 주소. */
export function loginHref(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}

/**
 * 로그인 후 이동할 `next`가 같은 사이트 경로일 때만 돌려준다(오픈 리다이렉트 방지).
 * 문자열 앞부분만 보면 `/\t/evil.com`(브라우저가 탭·줄바꿈을 지워 `//evil.com`이 됨) 같은 우회가 통과하므로,
 * 브라우저와 같은 규칙으로 URL을 해석해 출처가 바뀌지 않는지 확인하고 정규화된 경로만 돌려준다.
 */
export function safeNext(value: string | null | undefined) {
  if (!value?.startsWith("/")) return null;
  const base = "http://same-origin.invalid";
  try {
    const url = new URL(value, base);
    return url.origin === base ? url.pathname + url.search + url.hash : null;
  } catch {
    return null;
  }
}
