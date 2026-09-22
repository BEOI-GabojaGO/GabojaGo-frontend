"use client";

import { useState, type FormEvent } from "react";
import { BookingOptionsPanel } from "@/components/flight/booking-options-panel";
import { FlightOptionCard } from "@/components/flight/flight-option-card";
import {
  EmptyMessage,
  ErrorAlert,
  PriceInsightsNote,
  PrimaryButton,
  SearchSummary,
  SecondaryButton,
  StepIndicator,
} from "@/components/flight/flow-ui";
import {
  readOneWaySearchForm,
  SearchConditionFields,
} from "@/components/flight/search-condition-fields";
import { postJson } from "@/lib/flight-client";
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
export function OneWayFlow() {
  const [request, setRequest] = useState<OneWaySearchRequest | null>(null);
  const [locations, setLocations] = useState<SelectedLocations | null>(null);
  const [search, setSearch] = useState<OneWaySearchResponse | null>(null);
  const [selected, setSelected] = useState<FlightOption | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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

    setRequest(form.request);
    setLocations(form.locations);
    setPending(true);
    setError("");

    const result = await postJson<OneWaySearchResponse>(
      "/api/v1/flight-searches/one-way",
      form.request,
    );

    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSearch(result.data);
  }

  return (
    <div className="space-y-6">
      <StepIndicator
        current={!search ? 1 : !selected ? 2 : 3}
        labels={["조건 입력", "항공편 선택", "예약 옵션"]}
      />

      <ErrorAlert message={error} />

      {!search && (
        <form onSubmit={handleSearch} className="space-y-5">
          <SearchConditionFields
            tripType="one-way"
            defaultValues={request}
            defaultLocations={locations}
          />
          <PrimaryButton type="submit" disabled={pending}>
            {pending ? "항공편을 찾는 중..." : "편도 항공편 조회"}
          </PrimaryButton>
        </form>
      )}

      {search && request && locations && (
        <SearchSummary request={request} locations={locations} onEdit={reset} />
      )}

      {search && !selected && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">직항 편도 {search.totalFlights}개</h2>
          <PriceInsightsNote insights={search.priceInsights} />
          {search.noNonstopFlight && (
            <EmptyMessage>이 노선에는 직항 항공편이 없습니다.</EmptyMessage>
          )}
          {search.flights.map((flight) => (
            <FlightOptionCard
              key={flight.id}
              option={flight}
              priceLabel="편도 요금"
              actionLabel="이 항공편 선택"
              onSelect={() => setSelected(flight)}
            />
          ))}
        </section>
      )}

      {search && selected && (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900">선택한 항공편</h2>
              <SecondaryButton onClick={() => setSelected(null)}>항공편 다시 선택</SecondaryButton>
            </div>
            <FlightOptionCard option={selected} priceLabel="편도 요금" />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">예약 옵션</h2>
            <BookingOptionsPanel
              key={selected.id}
              searchId={search.searchId}
              outboundId={selected.id}
              onExpired={reset}
            />
          </section>
        </>
      )}
    </div>
  );
}
