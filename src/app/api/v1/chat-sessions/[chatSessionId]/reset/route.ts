import { proxyPostRequest } from "@/lib/backend-proxy";

// 기존 세션을 끝내고 빈 새 세션(201, 세션 생성과 같은 응답)을 받는다. 기존 세션이 없거나 만료돼도 새 세션을 준다.
export async function POST(request: Request, ctx: RouteContext<"/api/v1/chat-sessions/[chatSessionId]/reset">) {
  const { chatSessionId } = await ctx.params;

  return proxyPostRequest(request, `/api/v1/chat-sessions/${encodeURIComponent(chatSessionId)}/reset`);
}
