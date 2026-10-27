import { proxyGetRequest, proxyPostRequest } from "@/lib/backend-proxy";

type Ctx = RouteContext<"/api/v1/chat-sessions/[chatSessionId]/search">;

const endpoint = async (ctx: Ctx) => `/api/v1/chat-sessions/${encodeURIComponent((await ctx.params).chatSessionId)}/search` as const;

// 승인된 조건으로 실제 검색(SerpApi). 동기 응답이며, 불명확하면 재POST하지 말고 GET으로 확인한다.
export async function POST(request: Request, ctx: Ctx) {
  return proxyPostRequest(request, await endpoint(ctx));
}

// 최신 검색 작업 상태와 결과(data.result).
export async function GET(request: Request, ctx: Ctx) {
  return proxyGetRequest(request, await endpoint(ctx));
}
