import { proxyCurrentUserRequest } from "@/lib/backend-proxy";

export async function GET() {
  return proxyCurrentUserRequest();
}
