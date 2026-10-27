import { proxyPostRequest } from "@/lib/backend-proxy";

// 채팅 API는 익명 사용 가능해 토큰 쿠키를 붙이지 않는다(docs/CHAT-FRONTEND-HANDOFF.md).
export async function POST(request: Request) {
  return proxyPostRequest(request, "/api/v1/chat-sessions");
}
