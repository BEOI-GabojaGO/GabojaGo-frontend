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
  DateShiftStrip,
  passengersOf,
  RouteHeading,
  useFlightFilter,
} from "@/components/flight/flight-list-ui";
import { ErrorAlert, PrimaryButton, useAutoSearchOnce } from "@/components/flight/flow-ui";
import {
  cityName,
  readFlightSearchForm,
  SearchConditionFields,
} from "@/components/flight/search-condition-fields";
import { useToast } from "@/components/main/main-ui";
import { SiteLoader } from "@/components/site-loader";
import { FLIGHT_SEARCH_NOT_FOUND, postJson, requestJson } from "@/lib/flight-client";
import { conditionSearchHref, type InitialSearch } from "@/lib/flight-search-params";
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
export function RoundTripStepFlow({ initial }: { initial?: InitialSearch<FlightSearchRequest> | null }) {
  const [request, setRequest] = useState<FlightSearchRequest | null>(initial?.request ?? null);
  const [locations, setLocations] = useState<SelectedLocations | null>(initial?.locations ?? null);
  const [search, setSearch] = useState<FlightSearchResponse | null>(null);
  const [outbound, setOutbound] = useState<FlightOption | null>(null);
  const [inbound, setInbound] = useState<FlightOption | null>(null);
  // 같은 가는편을 다시 고르면 SerpApi를 또 부르지 않도록 오는편 결과를 보관한다.
  const [returnsByOutbound, setReturnsByOutbound] = useState<Record<string, FlightOption[]>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
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

    await runSearch(form.request, form.locations);
  }

  async function runSearch(nextRequest: FlightSearchRequest, nextLocations: SelectedLocations) {
    setRequest(nextRequest);
    setLocations(nextLocations);
    setPending(true);
    setError("");

    const result = await postJson<FlightSearchResponse>("/api/v1/flight-searches", nextRequest);

    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSearch(result.data);
  }

  useAutoSearchOnce(initial, runSearch);

  /** 일정 띠: 같은 박수로 날짜만 옮겨 새로 검색한다. 결과가 올 때까지 기존 목록을 보여 준다. */
  function changeDates(outboundDate: string, returnDate: string) {
    if (!request || !locations) return;
    setOutbound(null);
    setInbound(null);
    setReturnsByOutbound({});
    setExpired(false);
    notify("새 일정으로 다시 검색합니다.");
    void runSearch({ ...request, outboundDate, returnDate }, locations);
  }

  async function selectOutbound(option: FlightOption) {
    if (!search) return;

    setOutbound(option);
    setInbound(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (returnsByOutbound[option.id]) return;

    setPending(true);

    const result = await requestJson<ReturnsResponse>(
      `/api/v1/flight-searches/${encodeURIComponent(search.searchId)}/outbounds/${encodeURIComponent(option.id)}/returns`,
    );

    setPending(false);

    if (!result.ok) {
      // 가는편 목록에 머물러 다시 고를 수 있게 한다. 빈 오는편 단계로 넘어간 것처럼 보이지 않도록.
      setOutbound(null);
      setExpired(result.code === FLIGHT_SEARCH_NOT_FOUND);
      setError(result.message);
      return;
    }

    setReturnsByOutbound((current) => ({ ...current, [option.id]: result.data.returns }));
    notify("가는편을 선택했습니다. 오는편을 선택해 주세요.");
  }

  function backToOutbounds() {
    setOutbound(null);
    setInbound(null);
    setError("");
  }

  /** 요약의 오는편 변경하기: 같은 가는편의 오는편 목록으로 돌아간다(오는편 결과는 보관돼 있어 다시 부르지 않음). */
  function backToReturns() {
    setInbound(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 첫 렌더는 자동 검색 effect보다 먼저라 pending이 아직 false다. 그때도 폼 대신 로더를 보인다.
  const loader = (pending || (initial && !search && !error)) && <SiteLoader busy label="항공권을 찾는 중" />;

  // 검색이 실패해도 디자인된 목록 화면(조건 바 유지)에 오류와 "다시 검색하기"를 보여 준다.
  if (!search && request && locations && error && !pending) {
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
    if (loader) return loader;
    return (
      <div className="search-form-wrap">
        <h1>왕복 항공권 검색</h1>
        <div className="space-y-5">
          <ErrorAlert message={error} />
          <form onSubmit={handleSearch} className="space-y-5">
            <SearchConditionFields tripType="round-trip" defaultValues={request} defaultLocations={locations} />
            <PrimaryButton type="submit" disabled={pending}>
              가는편 조회
            </PrimaryButton>
          </form>
        </div>
      </div>
    );
  }

  const returns = outbound ? returnsByOutbound[outbound.id] : undefined;
  const source = outbound ? returns : search.outbounds;
  const list = filter.apply(source ?? [], outbound ? "inbound" : "outbound");
  const airlines = [...new Set([...search.outbounds, ...(returns ?? [])].flatMap(airlinesOf))];
  // 오는편까지 고르면 목록 대신 시안의 최종 선택 요약을 보여 준다.
  const complete = !!(outbound && inbound);

  return (
    <>
      <FlightListLayout
        request={request}
        locations={locations}
        filter={filter}
        airlines={airlines}
        // 시안처럼 지금 고르는 편의 출발 시간 필터만 보여 준다.
        legs={[outbound ? "inbound" : "outbound"]}
        onEdit={() => router.push(conditionSearchHref(request, locations))}
        locked={complete}
      >
        <ListAlert message={error} onRetry={expired ? retry : undefined} />

        {outbound && inbound && (
          <>
            <FinalSelection
              request={request}
              locations={locations}
              outbound={outbound}
              inbound={inbound}
              heart={
                <FlightHeart
                  // 오는편 price가 이 가는편과 짝지은 확정 왕복 총액이다.
                  request={{ ...passengersOf(request), price: inbound.price, outbound, inbound }}
                  notify={notify}
                />
              }
              onChangeOutbound={() => {
                backToOutbounds();
                notify("가는편을 다시 선택해 주세요.");
              }}
              onChangeReturn={() => {
                backToReturns();
                notify("오는편을 다시 선택해 주세요.");
              }}
              onBook={() => {
                // 예약하기 화면(시안)으로 넘긴다. 단계별 조회의 오는편 id가 판매처 조회의 returnId다.
                if (saveBooking({ searchId: search.searchId, outboundId: outbound.id, returnId: inbound.id, outbound, inbound, request, locations })) {
                  router.push("/flights/booking");
                } else {
                  notify("선택한 항공권을 넘기지 못했어요. 브라우저 저장소 설정을 확인해 주세요.");
                }
              }}
            />
          </>
        )}

        {outbound && !complete && (
          <section className="selected-section" aria-live="polite">
            <div className="selected-heading">
              <h2>{cityName(locations.destination)} 가는편 항공권</h2>
              <button type="button" onClick={backToOutbounds}>
                변경하기
              </button>
            </div>
            <FlightCard option={outbound} priceSuffix="부터" />
          </section>
        )}

        {!complete && (
          <RouteHeading
            from={outbound ? locations.destination : locations.origin}
            to={outbound ? locations.origin : locations.destination}
            leg={outbound ? "오는편" : "가는편"}
            filter={filter}
          />
        )}

        {!outbound && (
          <DateShiftStrip
            outboundDate={request.outboundDate}
            returnDate={request.returnDate}
            disabled={pending}
            onPick={changeDates}
          />
        )}

        <div className="flight-list" aria-live="polite" hidden={complete}>
          {source && list.length === 0 && (
            <p className="empty-result">
              {source.length > 0
                ? "필터 조건에 맞는 항공권이 없습니다."
                : outbound
                  ? "이 가는편에 이어지는 직항 오는편이 없습니다."
                  : "조건에 맞는 직항 가는편이 없습니다."}
            </p>
          )}
          {list.map((option) =>
            outbound ? (
              <FlightCard
                key={option.id}
                option={option}
                chosen={inbound?.id === option.id}
                onSelect={() => {
                  setInbound(option);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  notify("왕복 항공권을 선택했습니다.");
                }}
                heart={
                  <FlightHeart
                    // 오는편 price가 이 가는편과 짝지은 확정 왕복 총액이다.
                    request={{ ...passengersOf(request), price: option.price, outbound, inbound: option }}
                    notify={notify}
                  />
                }
              />
            ) : (
              <FlightCard
                key={option.id}
                option={option}
                priceSuffix="부터"
                disabled={pending}
                onSelect={() => void selectOutbound(option)}
              />
            ),
          )}
        </div>

      </FlightListLayout>
      {loader}
      {toast}
    </>
  );
}
