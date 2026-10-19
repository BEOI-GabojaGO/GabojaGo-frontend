import { proxyGetRequest } from "@/lib/backend-proxy";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/countries/[countryCode]/attractions">,
) {
  const { countryCode } = await ctx.params;

  return proxyGetRequest(request, `/api/v1/countries/${encodeURIComponent(countryCode)}/attractions`);
}
