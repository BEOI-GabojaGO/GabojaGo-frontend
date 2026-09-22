"use client";

import { useState, type FormEvent } from "react";
import { BookingOptionsPanel } from "@/components/flight/booking-options-panel";
import {
  EmptyMessage,
  ErrorAlert,
  PriceInsightsNote,
  PrimaryButton,
  SearchSummary,
  SecondaryButton,
  StepIndicator,
} from "@/components/flight/flow-ui";
import { RoundTripCombinationCard } from "@/components/flight/round-trip-combination-card";
import {
  EMPTY_ROUND_TRIP_FILTER,
  RoundTripFilterForm,
  toRoundTripQuery,
} from "@/components/flight/round-trip-filter-form";
import {
  readFlightSearchForm,
  SearchConditionFields,
} from "@/components/flight/search-condition-fields";
import { FLIGHT_SEARCH_NOT_FOUND, postJson, requestJson } from "@/lib/flight-client";
import type {
  FlightSearchRequest,
  PriceInsights,
  RoundTripCombination,
  RoundTripFilter,
  RoundTripSearchResponse,
  SelectedLocations,
} from "@/lib/flight-types";

const PAGE_SIZE = 20;

/**
 * 왕복 일정 한 번에 조회: 조건 입력 → 조합 선택(필터·정렬·페이징) → 예약 옵션.
 * 백엔드 POST /flight-searches/round-trips → GET /{searchId}/round-trips → POST /itineraries
 */
export function RoundTripBundleFlow() {
  const [request, setRequest] = useState<FlightSearchRequest | null>(null);
  const [locations, setLocations] = useState<SelectedLocations | null>(null);
  const [result, setResult] = useState<RoundTripSearchResponse | null>(null);
  // 가격 참고치는 첫 검색 응답에만 있다. 필터 조회 응답에서는 항상 null이라 따로 보관한다.
  const [priceInsights, setPriceInsights] = useState<PriceInsights | null>(null);
  const [appliedFilter, setAppliedFilter] = useState<RoundTripFilter>(EMPTY_ROUND_TRIP_FILTER);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<RoundTripCombination | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  function reset() {
    setResult(null);
    setPriceInsights(null);
    setAppliedFilter(EMPTY_ROUND_TRIP_FILTER);
    setPage(0);
    setSelected(null);
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

    const response = await postJson<RoundTripSearchResponse>(
      "/api/v1/flight-searches/round-trips",
      form.request,
    );

    setPending(false);

    if (!response.ok) {
      setError(response.message);
      return;
    }

    setResult(response.data);
    setPriceInsights(response.data.priceInsights);
    setAppliedFilter(EMPTY_ROUND_TRIP_FILTER);
    setPage(0);
  }

  // 캐시된 조합에 필터·정렬·페이징만 다시 적용한다(SerpApi 호출 없음).
  async function loadPage(filter: RoundTripFilter, nextPage: number) {
    if (!result) return;

    setPending(true);
    setError("");

    const response = await requestJson<RoundTripSearchResponse>(
      `/api/v1/flight-searches/${encodeURIComponent(result.searchId)}/round-trips?${toRoundTripQuery(filter, nextPage, PAGE_SIZE)}`,
    );

    setPending(false);

    if (!response.ok) {
      setExpired(response.code === FLIGHT_SEARCH_NOT_FOUND);
      setError(response.message);
      return;
    }

    setResult(response.data);
    setAppliedFilter(filter);
    setPage(nextPage);
  }

  const combinations = result?.combinations ?? [];
  // 응답에 필터 후 전체 개수가 없어, 한 페이지를 꽉 채웠을 때만 다음 페이지가 있다고 본다.
  const hasNextPage = combinations.length === PAGE_SIZE;

  return (
    <div className="space-y-6">
      <StepIndicator
        current={!result ? 1 : !selected ? 2 : 3}
        labels={["조건 입력", "조합 선택", "예약 옵션"]}
      />

      <ErrorAlert message={error} expired={expired} onRetry={reset} />

      {!result && (
        <form onSubmit={handleSearch} className="space-y-5">
          <SearchConditionFields
            tripType="round-trip"
            defaultValues={request}
            defaultLocations={locations}
          />
          <PrimaryButton type="submit" disabled={pending}>
            {pending ? "조합을 비교하는 중이에요(최대 수십 초)..." : "왕복 조합 조회"}
          </PrimaryButton>
        </form>
      )}

      {result && request && locations && (
        <SearchSummary request={request} locations={locations} onEdit={reset} />
      )}

      {result && !selected && result.noNonstopFlight && (
        <EmptyMessage>이 노선에는 직항 항공편이 없습니다.</EmptyMessage>
      )}

      {result && !selected && !result.noNonstopFlight && (
        <section className="space-y-4">
          <p className="text-sm text-slate-600">
            직항 가는편 {result.totalOutbounds}개 중 {result.expandedOutbounds}개를 비교했어요 ·
            원본 조합 {result.totalCombinations}개
          </p>
          <PriceInsightsNote insights={priceInsights} />

          <RoundTripFilterForm
            filterOptions={result.filterOptions}
            value={appliedFilter}
            onApply={(filter) => void loadPage(filter, 0)}
            pending={pending}
          />

          <h2 className="text-lg font-bold text-slate-900">
            조합 목록 <span className="text-sm font-medium text-slate-500">{page + 1}페이지</span>
          </h2>

          {combinations.length === 0 && (
            <EmptyMessage>
              {page > 0
                ? "더 이상 결과가 없습니다."
                : "필터 조건에 맞는 조합이 없어요. 조건을 줄여 보세요."}
            </EmptyMessage>
          )}

          {combinations.map((combination) => (
            <RoundTripCombinationCard
              key={`${combination.outboundId}-${combination.returnId}`}
              combination={combination}
              onSelect={() => setSelected(combination)}
              disabled={pending}
            />
          ))}

          {(page > 0 || hasNextPage) && (
            <div className="flex items-center justify-between gap-4">
              <SecondaryButton
                onClick={() => void loadPage(appliedFilter, page - 1)}
                disabled={page === 0 || pending}
              >
                이전
              </SecondaryButton>
              <span className="text-sm text-slate-500">{page + 1}페이지</span>
              <SecondaryButton
                onClick={() => void loadPage(appliedFilter, page + 1)}
                disabled={!hasNextPage || pending}
              >
                다음
              </SecondaryButton>
            </div>
          )}
        </section>
      )}

      {result && selected && (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900">선택한 조합</h2>
              <SecondaryButton onClick={() => setSelected(null)}>조합 다시 선택</SecondaryButton>
            </div>
            <RoundTripCombinationCard combination={selected} />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">예약 옵션</h2>
            <BookingOptionsPanel
              key={`${selected.outboundId}-${selected.returnId}`}
              searchId={result.searchId}
              outboundId={selected.outboundId}
              returnId={selected.returnId}
              onExpired={reset}
            />
          </section>
        </>
      )}
    </div>
  );
}
