import { proxyLoginRequest } from "@/lib/backend-proxy";

export async function POST(request: Request) {
  return proxyLoginRequest(request);
}
