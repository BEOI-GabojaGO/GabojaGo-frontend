import { proxyPostRequest } from "@/lib/backend-proxy";

export async function POST(request: Request) {
  return proxyPostRequest(request, "/api/v1/flight-searches/round-trips");
}
