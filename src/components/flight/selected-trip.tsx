"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { saveBooking } from "@/components/flight/booking-page";
import { airlinesOf, FinalSelection, FlightHeart, FlightListLayout, passengersOf, useFlightFilter } from "@/components/flight/flight-list-ui";
import { useToast } from "@/components/main/main-ui";
import { toSearchQuery } from "@/lib/flight-search-params";
import type { FlightOption, OneWaySearchRequest, SelectedLocations } from "@/lib/flight-types";

/** AI 검색 카드에서 고른 왕복 한 쌍(편도는 항공편 하나). 채팅 검색 결과라 오는편 목록을 다시 받을 수 없어 쌍째로 넘긴다. */
export type SelectedTrip = {
  searchId: string;
  outboundId: string;
  /** 편도는 없다. */
  returnId?: string;
  outbound: FlightOption;
  inbound?: FlightOption;
  /** 왕복은 조합 price(왕복 총액), 편도는 편도 요금 */
  price: number | null;
  stayMinutes: number | null;
  sameAirline: boolean | null;
  request: OneWaySearchRequest & { returnDate?: string };
  locations: SelectedLocations;
};

const KEY = "gabojago.selectedTrip";

/** 탭 단위로 넘긴다. 저장할 수 없으면 false(호출한 쪽이 안내). */
export function saveSelectedTrip(trip: SelectedTrip) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trip));
    return true;
  } catch {
    return false;
  }
}

/** 저장된 문자열 그대로(같은 값이면 같은 결과라 useSyncExternalStore 스냅샷으로 쓴다). */
function readSelectedTrip() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parseSelectedTrip(raw: string | null): SelectedTrip | null {
  try {
    return raw ? (JSON.parse(raw) as SelectedTrip) : null;
  } catch {
    return null;
  }
}

// 이 화면에서는 저장값이 바뀌지 않으므로 구독할 것이 없다.
const noSubscribe = () => () => {};

/**
 * /flights/round-trip/selected: AI 카드에서 고른 왕복(또는 편도)을 시안 최종 선택 요약으로 보여 준다.
 * 변경하기·수정하기는 같은 조건으로 조건 검색(/flights/round-trip/step, 편도는 /flights/one-way)에서 다시 고르게 한다.
 */
export function SelectedTripView() {
  const router = useRouter();
  // 저장소는 브라우저에만 있다. 서버·하이드레이션 중에는 undefined(아직 읽기 전)로 둔다.
  const raw = useSyncExternalStore(noSubscribe, readSelectedTrip, () => undefined);
  const trip = useMemo(() => (raw === undefined ? undefined : parseSelectedTrip(raw)), [raw]);
  const filter = useFlightFilter();
  const { notify, toast } = useToast();

  if (trip === undefined) return null;
  if (!trip) {
    return (
      <div className="search-form-wrap">
        <h1>선택한 항공권 정보가 없어요</h1>
        <p className="alert">
          새로고침했거나 다른 탭에서 열면 선택 정보가 사라져요. AI 검색에서 다시 골라 주세요.{" "}
          <Link href="/">메인으로</Link>
        </p>
      </div>
    );
  }

  const { request, locations, outbound, inbound } = trip;
  const research = () =>
    router.push(`${inbound ? "/flights/round-trip/step" : "/flights/one-way"}?${toSearchQuery(request, locations)}`);

  return (
    <>
      {/* 필터는 시안처럼 보이되 잠근다(고른 한 쌍뿐이라 거를 목록이 없음). */}
      <FlightListLayout
        request={request}
        locations={locations}
        filter={filter}
        airlines={[...new Set([...airlinesOf(outbound), ...(inbound ? airlinesOf(inbound) : [])])]}
        legs={[inbound ? "inbound" : "outbound"]}
        locked
        stage="complete"
      >
        <FinalSelection
          request={request}
          locations={locations}
          outbound={outbound}
          inbound={inbound}
          heart={
            <FlightHeart
              request={{ ...passengersOf(request), price: trip.price, stayMinutes: trip.stayMinutes, sameAirline: trip.sameAirline, outbound, inbound }}
              notify={notify}
            />
          }
          onChangeOutbound={research}
          onChangeReturn={research}
          onBook={() => {
            // AI 조합의 returnId·채팅 searchId로 예약하기 화면에서 판매처를 조회한다(실제 확인함).
            const { searchId, outboundId, returnId } = trip;
            if (saveBooking({ searchId, outboundId, returnId, outbound, inbound: inbound && { ...inbound, price: trip.price }, request, locations })) {
              router.push("/flights/booking");
            } else {
              notify("선택한 항공권을 넘기지 못했어요. 브라우저 저장소 설정을 확인해 주세요.");
            }
          }}
          roundTripPrice={inbound ? trip.price : undefined}
        />
      </FlightListLayout>
      {toast}
    </>
  );
}
