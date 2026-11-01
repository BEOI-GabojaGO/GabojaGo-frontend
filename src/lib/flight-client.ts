import type { CommonResponse } from "@/lib/api-types";
import { readErrorMessage } from "@/lib/auth-client";
import type { LocationOption } from "@/lib/flight-types";

export const FLIGHT_SEARCH_NOT_FOUND = "FLIGHT_SEARCH_NOT_FOUND";

const NETWORK_ERROR_MESSAGE =
  "서버에 연결할 수 없습니다. 백엔드 서버 상태를 확인해 주세요.";

export type RequestResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; code?: string; message: string };

export async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<RequestResult<T>> {
  try {
    const response = await fetch(url, { cache: "no-store", ...init });

    if (!response.ok) {
      const code = await readErrorCode(response.clone());

      return {
        ok: false,
        status: response.status,
        code,
        message: await readErrorMessage(response),
      };
    }

    const body = (await response.json()) as CommonResponse<T>;
    return { ok: true, status: response.status, data: body.data };
  } catch (cause) {
    // 언마운트로 취소된 요청은 호출한 쪽에서 무시한다.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;

    return { ok: false, status: 0, message: NETWORK_ERROR_MESSAGE };
  }
}

export function postJson<T>(url: string, body: unknown, signal?: AbortSignal) {
  return requestJson<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

async function readErrorCode(response: Response) {
  try {
    const body = (await response.json()) as { code?: unknown };
    return typeof body.code === "string" ? body.code : undefined;
  } catch {
    return undefined;
  }
}

export function formatPrice(price: number | null | undefined) {
  return price == null ? "가격 정보 없음" : `${price.toLocaleString("ko-KR")}원`;
}

export function formatMinutes(minutes: number | null | undefined) {
  if (minutes == null) return "-";

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest}분`;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

/** `도쿄 (모든 공항)` / `나리타 국제공항 (NRT)` */
export function formatLocation(option: LocationOption) {
  return option.type === "CITY"
    ? `${option.nameKo} (모든 공항)`
    : `${option.nameKo} (${option.code})`;
}
