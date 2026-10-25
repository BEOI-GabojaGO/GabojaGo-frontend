import { proxyPostRequest } from "@/lib/backend-proxy";

export async function POST(request: Request, ctx: RouteContext<"/api/v1/chat-sessions/[chatSessionId]/confirmation">) {
  const { chatSessionId } = await ctx.params;

  return proxyPostRequest(request, `/api/v1/chat-sessions/${encodeURIComponent(chatSessionId)}/confirmation`);
}
