import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { CommonResponse, ErrorResponse } from "@/lib/api-types";

const ACCESS_TOKEN_COOKIE_NAME = "gabojago_access_token";

type BackendEndpoint =
  | "/api/auth/login"
  | "/api/auth/signup"
  | "/api/users/me"
  | `/api/v1/${string}`;

type TokenResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
};

type AuthState = {
  authenticated: boolean;
  expiresIn?: number;
};

export async function proxyAuthRequest(
  request: Request,
  endpoint: "/api/auth/signup",
) {
  const upstream = await requestBackend(request, endpoint);

  return forwardResponse(upstream);
}

export async function proxyLoginRequest(request: Request) {
  const upstream = await requestBackend(request, "/api/auth/login");

  const responseBody = await upstream.text();

  if (!upstream.ok) {
    return forwardResponse(upstream, responseBody);
  }

  const token = parseTokenResponse(responseBody);

  if (!token) {
    return errorResponse(
      502,
      "BAD_GATEWAY",
      "백엔드 로그인 응답 형식이 올바르지 않습니다.",
    );
  }

  const response = NextResponse.json<CommonResponse<AuthState>>({
    success: true,
    data: { authenticated: true, expiresIn: token.expiresIn },
  });

  response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, token.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: token.expiresIn,
    path: "/",
  });
  response.headers.set("cache-control", "no-store");

  return response;
}

export async function proxyCurrentUserRequest() {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE_NAME)?.value;

  if (!accessToken) {
    return errorResponse(401, "UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const upstream = await fetchBackend("/api/users/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const response = forwardResponse(upstream);

  if (upstream.status === 401) {
    response.cookies.delete(ACCESS_TOKEN_COOKIE_NAME);
  }

  return response;
}

export async function proxyPostRequest(
  request: Request,
  endpoint: `/api/v1/${string}`,
) {
  const upstream = await requestBackend(request, endpoint);

  return forwardResponse(upstream);
}

export async function proxyGetRequest(
  request: Request,
  endpoint: `/api/v1/${string}`,
) {
  const { search } = new URL(request.url);
  const upstream = await fetchBackend(`${endpoint}${search}` as BackendEndpoint, {
    method: "GET",
  });

  return forwardResponse(upstream);
}

export function createLogoutResponse() {
  const response = NextResponse.json<CommonResponse<AuthState>>({
    success: true,
    data: { authenticated: false },
  });
  response.cookies.delete(ACCESS_TOKEN_COOKIE_NAME);
  response.headers.set("cache-control", "no-store");

  return response;
}

async function requestBackend(request: Request, endpoint: BackendEndpoint) {
  return fetchBackend(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
}

async function fetchBackend(endpoint: BackendEndpoint, init: RequestInit) {
  const backendUrl = process.env.BACKEND_API_URL;

  if (!backendUrl) {
    return errorResponse(
      503,
      "BACKEND_NOT_CONFIGURED",
      "백엔드 주소가 설정되지 않았습니다.",
    );
  }

  try {
    return await fetch(new URL(endpoint, ensureTrailingSlash(backendUrl)), {
      ...init,
      cache: "no-store",
    });
  } catch {
    return errorResponse(
      502,
      "BACKEND_UNREACHABLE",
      "백엔드 서버에 연결할 수 없습니다.",
    );
  }
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ success: false, code, message } satisfies ErrorResponse, {
    status,
  });
}

function forwardResponse(upstream: Response, body?: BodyInit) {
  const response = new NextResponse(body ?? upstream.body, {
    status: upstream.status,
  });
  const contentType = upstream.headers.get("content-type");

  if (contentType) response.headers.set("content-type", contentType);

  for (const cookie of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }

  response.headers.set("cache-control", "no-store");

  return response;
}

function parseTokenResponse(value: string): TokenResponse | null {
  try {
    const body = JSON.parse(value) as Record<string, unknown>;

    if (body.success !== true || typeof body.data !== "object" || body.data === null) {
      return null;
    }

    const { accessToken, tokenType, expiresIn } = body.data as Record<string, unknown>;

    if (
      typeof accessToken !== "string" ||
      !accessToken.trim() ||
      tokenType !== "Bearer" ||
      typeof expiresIn !== "number" ||
      !Number.isFinite(expiresIn) ||
      expiresIn <= 0
    ) {
      return null;
    }

    return { accessToken, tokenType, expiresIn: Math.floor(expiresIn) };
  } catch {
    return null;
  }
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}
