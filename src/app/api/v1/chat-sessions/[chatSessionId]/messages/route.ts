import { proxyPostRequest } from "@/lib/backend-proxy";

// 메시지마다 백엔드가 Groq를 1회 호출한다. 자동 재시도하지 않는다.
export async function POST(request: Request, ctx: RouteContext<"/api/v1/chat-sessions/[chatSessionId]/messages">) {
  const { chatSessionId } = await ctx.params;

  return proxyPostRequest(request, `/api/v1/chat-sessions/${encodeURIComponent(chatSessionId)}/messages`);
}
