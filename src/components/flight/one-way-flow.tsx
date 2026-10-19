"use client";

import { useState, type FormEvent } from "react";
import { BookingOptionsPanel } from "@/components/flight/booking-options-panel";
import {
  airlinesOf,
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
import { postJson } from "@/lib/flight-client";
import type { InitialSearch } from "@/lib/flight-search-params";
import type {
  FlightOption,
  OneWaySearchRequest,
  OneWaySearchResponse,
  SelectedLocations,
} from "@/lib/flight-types";

/**
 * 편도 조회: 조건 입력 → 항공편 선택 → 예약 옵션.
 * 백엔드 POST /flight-searches/one-way → POST /itineraries(returnId 생략)
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

  if (!search || !request || !locations) {
    return (
      <div className="search-form-wrap">
        <h1>편도 항공권 검색</h1>
        <div className="space-y-5">
          <ErrorAlert message={error} />
          <form onSubmit={handleSearch} className="space-y-5">
            <SearchConditionFields tripType="one-way" defaultValues={request} defaultLocations={locations} />
            <PrimaryButton type="submit" disabled={pending}>
              {pending ? "항공편을 찾는 중..." : "편도 항공편 조회"}
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
        onEdit={reset}
      >
        <ListAlert message={error} />
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
              chosen={selected?.id === flight.id}
              onSelect={() => {
                setSelected(flight);
                notify("항공편을 선택했습니다. 아래에서 예약 옵션을 확인하세요.");
              }}
              heart={
                <FlightHeart
                  request={{ ...passengersOf(request), price: flight.price, outbound: flight }}
                  notify={notify}
                />
              }
            />
          ))}
        </div>

        {selected && (
          // ponytail: 예약 옵션은 시안이 없어 기존 스타일 그대로. 시안이 나오면 바꾼다.
          <section className="booking-section">
            <h2>예약 옵션</h2>
            <BookingOptionsPanel
              key={selected.id}
              searchId={search.searchId}
              outboundId={selected.id}
              onExpired={reset}
            />
          </section>
        )}
      </FlightListLayout>
      {toast}
    </>
  );
}
