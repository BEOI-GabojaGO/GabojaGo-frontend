"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveBooking } from "@/components/flight/booking-page";
import {
  airlinesOf,
  FinalSelection,
  FlightCard,
  FlightHeart,
  FlightListLayout,
  ListAlert,
  passengersOf,
  RouteHeading,
  useFlightFilter,
} from "@/components/flight/flight-list-ui";
import { ErrorAlert, PrimaryButton, useAutoSearchOnce } from "@/components/flight/flow-ui";
import {
  readOneWaySearchForm,
  SearchConditionFields,
} from "@/components/flight/search-condition-fields";
import { useToast } from "@/components/main/main-ui";
import { SiteLoader } from "@/components/site-loader";
import { postJson } from "@/lib/flight-client";
import { conditionSearchHref, type InitialSearch } from "@/lib/flight-search-params";
import type {
  FlightOption,
  OneWaySearchRequest,
  OneWaySearchResponse,
  SelectedLocations,
} from "@/lib/flight-types";

/**
 * 편도 조회: 조건 입력 → 항공편 선택 → 최종 선택 요약 → 예약하자 GO → 예약하기 화면(/flights/booking).
 * 백엔드 POST /flight-searches/one-way → (예약하기 화면에서) POST /itineraries(returnId 생략)
 */
export function OneWayFlow({ initial }: { initial?: InitialSearch<OneWaySearchRequest> | null }) {
  const [request, setRequest] = useState<OneWaySearchRequest | null>(initial?.request ?? null);
  const [locations, setLocations] = useState<SelectedLocations | null>(initial?.locations ?? null);
  const [search, setSearch] = useState<OneWaySearchResponse | null>(null);
  const [selected, setSelected] = useState<FlightOption | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const filter = useFlightFilter();
  const { notify, toast } = useToast();
  const router = useRouter();

  /** 같은 조건으로 처음부터 다시 검색한다(검색 실패·만료). 옛 조건 입력 폼으로 돌아가지 않는다. */
  function retry() {
    if (!request || !locations) return;
    reset();
    void runSearch(request, locations);
  }

  function reset() {
    setSearch(null);
    setSelected(null);
    setError("");
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = readOneWaySearchForm(new FormData(event.currentTarget));

    if (form.error !== undefined) {
      setError(form.error);
      return;
    }

    await runSearch(form.request, form.locations);
  }

  async function runSearch(nextRequest: OneWaySearchRequest, nextLocations: SelectedLocations) {
    setRequest(nextRequest);
    setLocations(nextLocations);
    setPending(true);
    setError("");

    const result = await postJson<OneWaySearchResponse>(
      "/api/v1/flight-searches/one-way",
      nextRequest,
    );

    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSearch(result.data);
  }

  useAutoSearchOnce(initial, runSearch);

  // 첫 렌더는 자동 검색 effect보다 먼저라 pending이 아직 false다. 그때도 폼 대신 로더를 보인다.
  if (pending || (initial && !search && !error)) return <SiteLoader busy label="항공편을 찾는 중" />;

  // 검색이 실패해도 디자인된 목록 화면(조건 바 유지)에 오류와 "다시 검색하기"를 보여 준다.
  if (!search && request && locations && error) {
    return (
      <>
        <FlightListLayout
          request={request}
          locations={locations}
          filter={filter}
          airlines={[]}
          legs={["outbound"]}
          onEdit={() => router.push(conditionSearchHref(request, locations))}
          locked
        >
          <ListAlert message={error} onRetry={retry} />
        </FlightListLayout>
        {toast}
      </>
    );
  }

  // 조건 없이 주소로만 들어온 경우의 옛 조건 입력 폼(연결된 곳 없음, 기능 정리 때 삭제 예정).
  if (!search || !request || !locations) {
    return (
      <div className="search-form-wrap">
        <h1>편도 항공권 검색</h1>
        <div className="space-y-5">
          <ErrorAlert message={error} />
          <form onSubmit={handleSearch} className="space-y-5">
            <SearchConditionFields tripType="one-way" defaultValues={request} defaultLocations={locations} />
            <PrimaryButton type="submit" disabled={pending}>
              편도 항공편 조회
            </PrimaryButton>
          </form>
        </div>
      </div>
    );
  }

  const list = filter.apply(search.flights, "outbound");

  return (
    <>
      <FlightListLayout
        request={request}
        locations={locations}
        filter={filter}
        airlines={[...new Set(search.flights.flatMap(airlinesOf))]}
        legs={["outbound"]}
        onEdit={() => router.push(conditionSearchHref(request, locations))}
        locked={!!selected}
      >
        <ListAlert message={error} />

        {/* 왕복과 같이 고른 항공편을 요약으로 한 번 더 보여 주고, 예약하자 GO로 예약하기 화면에 간다. */}
        {selected && (
          <FinalSelection
            request={request}
            locations={locations}
            outbound={selected}
            heart={
              <FlightHeart request={{ ...passengersOf(request), price: selected.price, outbound: selected }} notify={notify} />
            }
            onChangeOutbound={() => {
              setSelected(null);
              notify("항공편을 다시 선택해 주세요.");
            }}
            onBook={() => {
              const selection = { searchId: search.searchId, outboundId: selected.id, outbound: selected, request, locations };
              if (saveBooking(selection)) router.push("/flights/booking");
              else notify("선택한 항공권을 넘기지 못했어요. 브라우저 저장소 설정을 확인해 주세요.");
            }}
          />
        )}

        {!selected && (
          <>
            <RouteHeading from={locations.origin} to={locations.destination} leg="편도" filter={filter} />

            <div className="flight-list" aria-live="polite">
              {list.length === 0 && (
                <p className="empty-result">
                  {search.flights.length > 0
                    ? "필터 조건에 맞는 항공권이 없습니다."
                    : search.noNonstopFlight
                      ? "이 노선에는 직항 항공편이 없습니다."
                      : "조건에 맞는 항공편이 없습니다."}
                </p>
              )}
              {list.map((flight) => (
                <FlightCard
                  key={flight.id}
                  option={flight}
                  onSelect={() => setSelected(flight)}
                  heart={
                    <FlightHeart
                      request={{ ...passengersOf(request), price: flight.price, outbound: flight }}
                      notify={notify}
                    />
                  }
                />
              ))}
            </div>
          </>
        )}
      </FlightListLayout>
      {toast}
    </>
  );
}
