import "server-only";

export async function proxyAuthRequest(
  request: Request,
  endpoint: "/api/auth/login" | "/api/auth/signup",
) {
  const backendUrl = process.env.BACKEND_API_URL;

  if (!backendUrl) {
    return Response.json(
      { message: "백엔드 주소가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetch(new URL(endpoint, ensureTrailingSlash(backendUrl)), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    const authorization = upstream.headers.get("authorization");

    if (contentType) responseHeaders.set("content-type", contentType);
    if (authorization) responseHeaders.set("authorization", authorization);

    for (const cookie of upstream.headers.getSetCookie()) {
      responseHeaders.append("set-cookie", cookie);
    }

    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { message: "백엔드 서버에 연결할 수 없습니다." },
      { status: 502 },
    );
  }
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}
