"use client";

import Link from "next/link";
import { useState } from "react";
import { postJson } from "@/lib/flight-client";
import type {
  FlightWishlistItem,
  FlightWishlistRequest,
  OneWaySearchRequest,
} from "@/lib/flight-types";

/** 검색 요청에서 위시리스트가 저장하는 인원·좌석 등급만 고른다. */
export function passengersOf(request: OneWaySearchRequest) {
  const { adults, children, infantsInSeat, infantsOnLap, travelClass } = request;
  return { adults, children, infantsInSeat, infantsOnLap, travelClass };
}

type Status =
  | { kind: "idle" | "pending" | "saved" | "duplicate" | "login" }
  | { kind: "error"; message: string };

/**
 * 선택한 항공권을 위시리스트에 담는다. 로그인 여부는 미리 묻지 않고 저장 응답의 401로 판단한다
 * (토큰 만료도 같은 경로). 선택이 바뀌면 호출하는 쪽에서 `key`로 상태를 초기화한다.
 */
export function WishlistButton({
  request,
}: {
  /** 항공편 price가 null일 수 있어 그대로 받고, null이면 버튼을 막는다. */
  request: Omit<FlightWishlistRequest, "price"> & { price: number | null };
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { price } = request;

  async function save() {
    if (price == null) return;

    setStatus({ kind: "pending" });

    const result = await postJson<FlightWishlistItem>("/api/v1/users/me/flight-wishlists", {
      ...request,
      price,
    } satisfies FlightWishlistRequest);

    if (result.ok) setStatus({ kind: "saved" });
    else if (result.status === 401) setStatus({ kind: "login" });
    else if (result.code === "DUPLICATE_WISHLIST") setStatus({ kind: "duplicate" });
    else setStatus({ kind: "error", message: result.message });
  }

  if (status.kind === "saved" || status.kind === "duplicate") {
    return (
      <p role="status" className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
        {status.kind === "saved" ? "위시리스트에 담았어요." : "이미 위시리스트에 담긴 항공권입니다."}{" "}
        <Link href="/wishlist" className="font-bold underline">
          위시리스트 보기
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void save()}
        disabled={price == null || status.kind === "pending"}
        className="h-10 rounded-xl border border-blue-200 bg-white px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:text-blue-300"
      >
        {status.kind === "pending" ? "담는 중..." : "♡ 위시리스트에 담기"}
      </button>
      {status.kind === "login" && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          위시리스트는 로그인 후 이용할 수 있습니다.{" "}
          <Link href="/login" className="font-bold underline">
            로그인하기
          </Link>
        </p>
      )}
      {status.kind === "error" && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {status.message}
        </p>
      )}
    </div>
  );
}
