import { proxyGetRequest } from "@/lib/backend-proxy";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/flight-searches/[searchId]/outbounds/[outboundId]/returns">,
) {
  const { searchId, outboundId } = await ctx.params;

  return proxyGetRequest(
    request,
    `/api/v1/flight-searches/${encodeURIComponent(searchId)}/outbounds/${encodeURIComponent(outboundId)}/returns`,
  );
}
