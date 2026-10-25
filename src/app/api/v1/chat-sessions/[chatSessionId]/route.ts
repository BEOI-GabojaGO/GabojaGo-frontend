import { proxyGetRequest } from "@/lib/backend-proxy";

// 세션 상태·조건 조회(복원용). 메시지 이력은 없다.
export async function GET(request: Request, ctx: RouteContext<"/api/v1/chat-sessions/[chatSessionId]">) {
  const { chatSessionId } = await ctx.params;

  return proxyGetRequest(request, `/api/v1/chat-sessions/${encodeURIComponent(chatSessionId)}`);
}
