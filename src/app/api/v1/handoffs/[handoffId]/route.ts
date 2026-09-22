import { proxyGetRequest } from "@/lib/backend-proxy";

// 판매처 자동 제출 HTML을 그대로 중계한다. handoffId는 1회용이다.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/handoffs/[handoffId]">,
) {
  const { handoffId } = await ctx.params;

  return proxyGetRequest(request, `/api/v1/handoffs/${encodeURIComponent(handoffId)}`);
}
