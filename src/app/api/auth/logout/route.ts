import { createLogoutResponse } from "@/lib/backend-proxy";

export async function POST() {
  return createLogoutResponse();
}
