import { proxyCurrentUserRequest } from "@/lib/backend-proxy";

export async function GET(request: Request) {
  return proxyCurrentUserRequest(request);
}
