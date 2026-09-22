import { proxyGetRequest } from "@/lib/backend-proxy";

// 필터·정렬·페이징 쿼리스트링을 그대로 중계한다. SerpApi를 호출하지 않는다.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/flight-searches/[searchId]/round-trips">,
) {
  const { searchId } = await ctx.params;

  return proxyGetRequest(
    request,
    `/api/v1/flight-searches/${encodeURIComponent(searchId)}/round-trips`,
  );
}
