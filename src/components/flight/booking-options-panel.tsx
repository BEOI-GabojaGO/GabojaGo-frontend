"use client";

import { useEffect, useState } from "react";
import {
  FLIGHT_SEARCH_NOT_FOUND,
  formatPrice,
  postJson,
} from "@/lib/flight-client";
import type {
  BookingOption,
  HandoffLeg,
  HandoffRequest,
  HandoffResponse,
  ItineraryRequest,
  ItineraryResponse,
} from "@/lib/flight-types";

const LEG_LABELS: Record<HandoffLeg, string> = {
  TOGETHER: "왕복 일괄",
  DEPARTING: "가는편",
  RETURNING: "오는편",
};

type BookingOptionsPanelProps = ItineraryRequest & {
  /** 검색 세션이 만료(서버 재시작 등)됐을 때 호출한다. */
  onExpired?: () => void;
};

export function BookingOptionsPanel({
  searchId,
  outboundId,
  returnId,
  onExpired,
}: BookingOptionsPanelProps) {
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [pendingKey, setPendingKey] = useState("");
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadItinerary() {
      try {
        const result = await postJson<ItineraryResponse>(
          "/api/v1/itineraries",
          { searchId, outboundId, returnId } satisfies ItineraryRequest,
          controller.signal,
        );

        if (!result.ok) {
          setExpired(result.code === FLIGHT_SEARCH_NOT_FOUND);
          setError(result.message);
          return;
        }

        setItinerary(result.data);
      } catch {
        // 언마운트로 취소된 요청
      }
    }

    void loadItinerary();

    return () => controller.abort();
  }, [searchId, outboundId, returnId]);

  async function book(option: BookingOption) {
    // 팝업 차단을 피하려고 클릭 직후 창부터 연다.
    const popup = window.open("", "_blank");
    const key = optionKey(option);

    setPendingKey(key);
    setBookingError("");

    const result = await postJson<HandoffResponse>("/api/v1/handoffs", {
      searchId,
      outboundId,
      returnId,
      optionIndex: option.optionIndex,
      leg: option.leg,
    } satisfies HandoffRequest);

    setPendingKey("");

    if (!result.ok) {
      popup?.close();
      setBookingError(result.message);
      return;
    }

    const url = `/api/v1/handoffs/${encodeURIComponent(result.data.handoffId)}`;

    if (popup) {
      popup.opener = null;
      popup.location.href = url;
    } else {
      // 팝업이 차단된 경우 현재 탭에서 이동한다. 대상은 Next 페이지가 아니라
      // 판매처 HTML을 중계하는 Route Handler라 router.push로는 열 수 없다.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(url);
    }
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
        {expired && onExpired && (
          <button
            type="button"
            onClick={onExpired}
            className="h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            다시 검색하기
          </button>
        )}
      </div>
    );
  }

  if (!itinerary) {
    return (
      <p role="status" className="text-sm text-slate-500">
        예약 옵션을 불러오고 있어요...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* 발권 형태 안내는 왕복에만 의미가 있다. 편도는 returnId가 없다. */}
      {returnId && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            itinerary.separateTickets
              ? "bg-amber-50 text-amber-800"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {itinerary.separateTickets
            ? "가는편과 오는편을 따로 발권하는 여정입니다. 한쪽이 지연·결항돼도 다른 쪽은 보호받지 못할 수 있어요."
            : "가는편과 오는편을 한 번에 발권하는 여정입니다."}
        </p>
      )}

      {itinerary.baggagePrices && itinerary.baggagePrices.length > 0 && (
        <p className="text-sm text-slate-500">수하물: {itinerary.baggagePrices.join(" · ")}</p>
      )}

      {bookingError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {bookingError}
        </p>
      )}

      {itinerary.bookingOptions.length === 0 && (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          예약 가능한 판매처가 없습니다.
        </p>
      )}

      <ul className="space-y-3">
        {itinerary.bookingOptions.map((option) => {
          const key = optionKey(option);

          return (
            <li
              key={key}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 text-sm">
                <p className="font-bold text-slate-900">
                  {option.sellerName ?? "판매처 정보 없음"}
                  <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {LEG_LABELS[option.leg]}
                  </span>
                </p>
                {option.optionTitle && (
                  <p className="mt-1 text-slate-700">{option.optionTitle}</p>
                )}
                {option.marketedAs.length > 0 && (
                  <p className="mt-1 text-slate-500">{option.marketedAs.join(" · ")}</p>
                )}
                {option.extensions.length > 0 && (
                  <p className="mt-1 text-slate-500">{option.extensions.join(" · ")}</p>
                )}
                {option.baggagePrices.length > 0 && (
                  <p className="mt-1 text-slate-500">수하물: {option.baggagePrices.join(" · ")}</p>
                )}
                {!option.bookable && (
                  <p className="mt-1 text-amber-700">
                    전화 예약만 가능합니다
                    {option.bookingPhone && ` · ${option.bookingPhone}`}
                    {option.estimatedPhoneServiceFee != null &&
                      ` (예상 전화 수수료 ${formatPrice(option.estimatedPhoneServiceFee)})`}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                <p className="text-lg font-bold text-slate-900">{formatPrice(option.price)}</p>
                {option.bookable && (
                  <button
                    type="button"
                    onClick={() => void book(option)}
                    disabled={pendingKey !== ""}
                    className="h-10 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    {pendingKey === key ? "이동 준비 중..." : "예약하러 가기"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// 분리 발권이면 같은 optionIndex가 구간별로 나뉘어 오므로 leg까지 묶어 식별한다.
function optionKey(option: BookingOption) {
  return `${option.optionIndex}-${option.leg}`;
}
