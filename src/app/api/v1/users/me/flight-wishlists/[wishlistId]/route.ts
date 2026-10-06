import { proxyAuthorizedRequest } from "@/lib/backend-proxy";

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/v1/users/me/flight-wishlists/[wishlistId]">,
) {
  const { wishlistId } = await ctx.params;

  return proxyAuthorizedRequest(
    request,
    `/api/v1/users/me/flight-wishlists/${encodeURIComponent(wishlistId)}`,
  );
}
