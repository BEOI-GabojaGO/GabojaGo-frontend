export async function readErrorMessage(response: Response): Promise<string> {
  const fallback = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await response.json()) as Record<string, unknown>;
      const message = body.message ?? body.error;

      return typeof message === "string" && message.trim() ? message : fallback;
    } catch {
      return fallback;
    }
  }

  const text = await response.text();
  return text.trim() || fallback;
}
