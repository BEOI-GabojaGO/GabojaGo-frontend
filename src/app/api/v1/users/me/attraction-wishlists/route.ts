import { proxyAuthorizedRequest } from "@/lib/backend-proxy";

const ENDPOINT = "/api/v1/users/me/attraction-wishlists";

export async function GET(request: Request) {
  return proxyAuthorizedRequest(request, ENDPOINT);
}

export async function POST(request: Request) {
  return proxyAuthorizedRequest(request, ENDPOINT);
}
