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
  readFlightSearchForm,
  SearchConditionFields,
} from "@/components/flight/search-condition-fields";
import { FLIGHT_SEARCH_NOT_FOUND, postJson, requestJson } from "@/lib/flight-client";
import type {
  FlightOption,
  FlightSearchRequest,
  FlightSearchResponse,
  ReturnsResponse,
  SelectedLocations,
} from "@/lib/flight-types";

/**
 * 왕복 단계별 조회: 가는편 선택 → 오는편 선택 → 예약 옵션.
 * 백엔드 POST /flight-searches → GET /outbounds/{id}/returns → POST /itineraries
 */
export function RoundTripStepFlow() {
  const [request, setRequest] = useState<FlightSearchRequest | null>(null);
  const [locations, setLocations] = useState<SelectedLocations | null>(null);
  const [search, setSearch] = useState<FlightSearchResponse | null>(null);
  const [outbound, setOutbound] = useState<FlightOption | null>(null);
  const [inbound, setInbound] = useState<FlightOption | null>(null);
  // 같은 가는편을 다시 고르면 SerpApi를 또 부르지 않도록 오는편 결과를 보관한다.
  const [returnsByOutbound, setReturnsByOutbound] = useState<Record<string, FlightOption[]>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  function reset() {
    setSearch(null);
    setOutbound(null);
    setInbound(null);
    setReturnsByOutbound({});
    setError("");
    setExpired(false);
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = readFlightSearchForm(new FormData(event.currentTarget));

    if (form.error !== undefined) {
      setError(form.error);
      return;
    }

    setRequest(form.request);
    setLocations(form.locations);
    setPending(true);
    setError("");

    const result = await postJson<FlightSearchResponse>("/api/v1/flight-searches", form.request);

    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSearch(result.data);
  }

  async function selectOutbound(option: FlightOption) {
    if (!search) return;

    setOutbound(option);
    setInbound(null);
    setError("");

    if (returnsByOutbound[option.id]) return;

    setPending(true);

    const result = await requestJson<ReturnsResponse>(
      `/api/v1/flight-searches/${encodeURIComponent(search.searchId)}/outbounds/${encodeURIComponent(option.id)}/returns`,
    );

    setPending(false);

    if (!result.ok) {
      setExpired(result.code === FLIGHT_SEARCH_NOT_FOUND);
      setError(result.message);
      return;
    }

    setReturnsByOutbound((current) => ({ ...current, [option.id]: result.data.returns }));
  }

  function backToOutbounds() {
    setOutbound(null);
    setInbound(null);
    setError("");
  }

  const returns = outbound ? returnsByOutbound[outbound.id] : undefined;

  return (
    <div className="space-y-6">
      <StepIndicator
        current={!search ? 1 : !outbound ? 2 : !inbound ? 3 : 4}
        labels={["조건 입력", "가는편 선택", "오는편 선택", "예약 옵션"]}
      />

      <ErrorAlert message={error} expired={expired} onRetry={reset} />

      {!search && (
        <form onSubmit={handleSearch} className="space-y-5">
          <SearchConditionFields
            tripType="round-trip"
            defaultValues={request}
            defaultLocations={locations}
          />
          <PrimaryButton type="submit" disabled={pending}>
            {pending ? "가는편을 찾는 중..." : "가는편 조회"}
          </PrimaryButton>
        </form>
      )}

      {search && request && locations && (
        <SearchSummary request={request} locations={locations} onEdit={reset} />
      )}

      {search && !outbound && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            가는편 {search.outbounds.length}개
          </h2>
          <PriceInsightsNote insights={search.priceInsights} />
          {search.outbounds.length === 0 && (
            <EmptyMessage>조건에 맞는 직항 가는편이 없습니다.</EmptyMessage>
          )}
          {search.outbounds.map((option) => (
            <FlightOptionCard
              key={option.id}
              option={option}
              priceLabel="선택 시 최저 왕복 총액"
              actionLabel="이 가는편 선택"
              onSelect={() => void selectOutbound(option)}
              disabled={pending}
            />
          ))}
        </section>
      )}

      {search && outbound && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900">선택한 가는편</h2>
            <SecondaryButton onClick={backToOutbounds}>가는편 다시 선택</SecondaryButton>
          </div>
          <FlightOptionCard option={outbound} priceLabel="선택 시 최저 왕복 총액" />
        </section>
      )}

      {search && outbound && !inbound && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            오는편{returns && ` ${returns.length}개`}
          </h2>
          {pending && (
            <p role="status" className="text-sm text-slate-500">
              오는편을 찾는 중...
            </p>
          )}
          {returns?.length === 0 && (
            <EmptyMessage>이 가는편에 이어지는 직항 오는편이 없습니다.</EmptyMessage>
          )}
          {returns?.map((option) => (
            <FlightOptionCard
              key={option.id}
              option={option}
              priceLabel="왕복 총액"
              actionLabel="이 오는편 선택"
              onSelect={() => setInbound(option)}
            />
          ))}
        </section>
      )}

      {search && outbound && inbound && (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900">선택한 오는편</h2>
              <SecondaryButton onClick={() => setInbound(null)}>오는편 다시 선택</SecondaryButton>
            </div>
            <FlightOptionCard option={inbound} priceLabel="왕복 총액" />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">예약 옵션</h2>
            <BookingOptionsPanel
              key={`${outbound.id}-${inbound.id}`}
              searchId={search.searchId}
              outboundId={outbound.id}
              returnId={inbound.id}
              onExpired={reset}
            />
          </section>
        </>
      )}
    </div>
  );
}
