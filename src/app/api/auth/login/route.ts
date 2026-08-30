import { proxyAuthRequest } from "@/lib/backend-proxy";

export async function POST(request: Request) {
  return proxyAuthRequest(request, "/api/auth/login");
}
