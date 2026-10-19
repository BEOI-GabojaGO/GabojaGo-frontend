import { proxyAuthorizedRequest } from "@/lib/backend-proxy";

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/v1/users/me/food-wishlists/[wishlistId]">,
) {
  const { wishlistId } = await ctx.params;

  return proxyAuthorizedRequest(
    request,
    `/api/v1/users/me/food-wishlists/${encodeURIComponent(wishlistId)}`,
  );
}
