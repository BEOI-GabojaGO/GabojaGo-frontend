/* eslint-disable @next/next/no-img-element -- API의 항공사 로고 URL과 디자인 원본 SVG를 그대로 쓴다. */
// 클라이언트 컴포넌트 전용(React 훅 포함). 서버 컴포넌트에서는 import하지 않는다.
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { airlinesOf, FlightHeart } from "@/components/flight/flight-list-ui";
import { closeDialogAnimated, Img, isBackdropClick, useToast } from "@/components/main/main-ui";
import { SiteLoader } from "@/components/site-loader";
import type {
  ChatConditions,
  ChatConfirmation,
  ChatMessageResponse,
  ChatSearchResult,
  ChatSessionCreated,
  FlexibleFlightSearchResponse,
} from "@/lib/chat-types";
import { formatMinutes, formatPrice, postJson, requestJson } from "@/lib/flight-client";
import type { RoundTripCombination, RoundTripSearchResponse, TravelClass } from "@/lib/flight-types";

const MAX_MESSAGE = 1000;
/** 결과는 3장씩 보여 준다. "더 많은 항공권 찾기"는 같은 결과를 더 펼친다(추가 호출 없음, 결정 3.2 (a)). */
const PAGE = 3;

type SearchView = { conditions: ChatConditions; dateMode: "EXACT" | "FLEXIBLE"; data: ChatSearchResult };

/**
 * 메인 AI 검색(시안 AI Prompt Modal) + 채팅 API. 결정 사항은 docs/AI-SEARCH-DECISIONS.md.
 * 세션은 첫 메시지를 보낼 때 한 번만 만들고, 같은 대화의 메시지는 같은 ID로 보낸다. 자동 재시도는 하지 않는다.
 */
export function useAiSearch() {
  const ref = useRef<HTMLDialogElement>(null);
  const sessionId = useRef<string | null>(null);
  const [question, setQuestion] = useState("");
  const [turn, setTurn] = useState<ChatMessageResponse | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState<SearchView | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const { notify, toast } = useToast();

  function open() {
    if (ref.current?.open) return;
    ref.current?.showModal();
    document.body.classList.add("ai-open");
  }

  const close = () => closeDialogAnimated(ref.current, 700);

  /** 메시지 하나를 보낸다. 성공하면 true(추가 입력창 비우기용). 실패하면 입력은 그대로 둔다. */
  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return false;
    if (message.length > MAX_MESSAGE) {
      setError(`${MAX_MESSAGE.toLocaleString()}자 이내로 입력해 주세요.`);
      return false;
    }

    setQuestion(message);
    setPending(true);
    setError("");
    try {
      if (!sessionId.current) {
        const created = await requestJson<ChatSessionCreated>("/api/v1/chat-sessions", { method: "POST" });
        if (!created.ok) {
          setError(created.message);
          return false;
        }
        sessionId.current = created.data.chatSessionId;
      }
      const result = await postJson<ChatMessageResponse>(`/api/v1/chat-sessions/${encodeURIComponent(sessionId.current)}/messages`, { message });
      if (!result.ok) {
        setError(result.message);
        return false;
      }
      // conditions는 누적 전체 조건이라 이전 값과 합치지 않고 교체한다. 조건이 바뀌었으니 이전 결과도 지운다.
      setTurn(result.data);
      setSearch(null);
      return true;
    } finally {
      setPending(false);
    }
  }

  /** 확인 버튼: 마지막 응답의 서버 conditionVersion으로 승인한 뒤 검색 POST를 한 번만 보낸다(SerpApi). */
  async function searchFlights() {
    const id = sessionId.current;
    if (!turn || !id || searching) return;
    setSearching(true);
    setError("");
    try {
      const base = `/api/v1/chat-sessions/${encodeURIComponent(id)}`;
      const confirmed = await postJson<ChatConfirmation>(`${base}/confirmation`, { conditionVersion: turn.conditionVersion });
      if (!confirmed.ok) {
        setError(confirmed.message);
        return;
      }
      const result = await requestJson<ChatSearchResult>(`${base}/search`, { method: "POST" });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // 결과에 dateMode가 없을 수 있어 승인한 조건의 dateMode로 구분한다.
      const conditions = turn.conditions ?? {};
      setSearch({ conditions, dateMode: conditions.dateMode ?? "EXACT", data: result.data });
      setVisible(PAGE);
    } finally {
      setSearching(false);
    }
  }

  /** 메인 입력창에서 AI 검색을 요청할 때. 다이얼로그를 열고 같은 대화에 이어 보낸다. */
  function ask(text: string) {
    open();
    void send(text);
  }

  async function submitFollowup(event: FormEvent) {
    event.preventDefault();
    if (await send(draft)) setDraft("");
  }

  const conditions = turn?.conditions ?? {};
  // 문장(reply)과 관계없이 서버가 계산한 상태로 판단한다. 최종 판단은 서버가 다시 한다.
  const canSearch = turn?.state === "AWAITING_CONFIRMATION" && !turn.missingFields.length && !turn.ambiguousFields.length && !search;
  const results = search ? resultItems(search) : null;

  const dialog = (
    <dialog
      ref={ref}
      className="ai-dialog"
      aria-labelledby="ai-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        void close();
      }}
      onClose={() => document.body.classList.remove("ai-open")}
      onClick={(event) => {
        if (isBackdropClick(event) && !matchMedia("(max-width: 599px)").matches) void close();
      }}
    >
      <div className="ai-dialog-header">
        <h2 id="ai-dialog-title">AI 항공권 추천</h2>
        <button className="ai-dialog-close" type="button" aria-label="AI 검색 닫기" onClick={() => void close()} />
      </div>
      <div className="ai-dialog-content">
        {question && <p className="ai-user-message">{question}</p>}
        <div className="ai-answer" aria-live="polite">
          <strong>AI 답변</strong>
          {pending ? (
            <p className="ai-pending" role="status">
              조건을 정리하고 있어요...
            </p>
          ) : (
            // reply는 텍스트로만 그린다(HTML 삽입 금지).
            <p>{turn?.reply ?? "여행 조건을 말씀해 주시면 정리해 드릴게요."}</p>
          )}
          {error && (
            <p className="ai-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <section className="ai-trip-summary" aria-label="검색 조건 요약">
          <div>
            <span>여행 기간</span>
            <strong>{tripPeriod(conditions)}</strong>
          </div>
          <div>
            <span>탑승객</span>
            <strong>{passengers(conditions)}</strong>
          </div>
          <div>
            <span>여행 유형</span>
            {/* 채팅 API는 왕복만 검색한다. */}
            <strong>왕복</strong>
          </div>
          <div>
            <span>예산</span>
            <strong>{conditions.maxBudgetKrw ? `${formatBudget(conditions.maxBudgetKrw)} 이하` : "제한 없음"}</strong>
          </div>
          <div>
            <span>출발지 / 도착지</span>
            <strong>
              {conditions.origin ?? "미정"} / {conditions.destination ?? "미정"}
            </strong>
          </div>
          <div>
            <span>여행 스타일</span>
            {/* API에 없는 항목(미연결). */}
            <strong>-</strong>
          </div>
        </section>
        {results && (
          <div className="ai-flight-list" aria-label="추천 항공권">
            {results.notice && <p className="ai-result-notice">{results.notice}</p>}
            {results.items.slice(0, visible).map(({ key, combination, caption }) => (
              <AiFlightCard
                key={key}
                combination={combination}
                caption={caption}
                heart={
                  <FlightHeart
                    className="ai-flight-heart"
                    request={{
                      ...passengersOf(search!.conditions),
                      price: combination.price,
                      stayMinutes: combination.stayMinutes,
                      sameAirline: combination.sameAirline,
                      outbound: combination.outbound,
                      inbound: combination.inbound,
                    }}
                    notify={notify}
                  />
                }
              />
            ))}
          </div>
        )}
        <div className="ai-dialog-actions">
          {canSearch && (
            <button className="ai-more-flights" type="button" disabled={searching} onClick={() => void searchFlights()}>
              <span className="search-glyph" aria-hidden="true" />
              이 조건으로 항공권 찾기
            </button>
          )}
          <button
            className="ai-edit-query"
            type="button"
            onClick={async () => {
              await close();
              document.querySelector<HTMLInputElement>("#travel-prompt")?.select();
            }}
          >
            <svg className="ai-action-icon" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M11.25 4.167L15.833 8.75M4.167 15.833L5.139 11.944L13.75 3.333C14.21 2.873 14.956 2.873 15.417 3.333L16.667 4.583C17.127 5.044 17.127 5.79 16.667 6.25L8.056 14.861L4.167 15.833Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="ai-action-label-mobile">조건 수정</span>
            <span className="ai-action-label-desktop">조건 수정하기</span>
          </button>
          {results && results.items.length > visible && (
            <button className="ai-more-flights" type="button" onClick={() => setVisible((n) => n + PAGE)}>
              <span className="search-glyph ai-action-label-desktop" aria-hidden="true" />
              <svg className="ai-action-icon" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="8.75" cy="8.75" r="5.583" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12.708 12.708L16.667 16.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="ai-action-label-mobile">더 많은 항공권</span>
              <span className="ai-action-label-desktop">더 많은 항공권 찾기</span>
            </button>
          )}
        </div>
      </div>
      <div className="ai-dialog-footer">
        <form className="ai-followup-form" onSubmit={submitFollowup}>
          <Img name="imgSparkleIcon.svg" />
          <label className="sr-only" htmlFor="ai-followup-input">
            여행 조건 추가 입력
          </label>
          <input
            id="ai-followup-input"
            maxLength={MAX_MESSAGE}
            placeholder="여행 조건(예산, 날짜, 특징, 스타일 등)을 자유롭게 말씀해 주세요."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" aria-label="추가 조건 보내기" disabled={pending}>
            <Img name="imgSendIcon.svg" />
          </button>
        </form>
      </div>
      {searching && <SiteLoader busy label="항공권을 찾는 중" />}
      {toast}
    </dialog>
  );

  return { ask, dialog };
}

type ResultItem = { key: string; combination: RoundTripCombination; caption?: string };

/** EXACT는 combinations, FLEXIBLE은 예산을 적용한 priceSelection.options를 쓴다(원본 results를 최종 목록으로 쓰지 않음). */
function resultItems({ dateMode, data }: SearchView): { items: ResultItem[]; notice: string } {
  if (dateMode === "FLEXIBLE") {
    const flexible = data as FlexibleFlightSearchResponse;
    const items = flexible.priceSelection.options.map((option) => ({
      key: `${option.searchId}-${option.combination.outboundId}-${option.combination.returnId}`,
      combination: option.combination,
      caption: `${shortDate(option.outboundDate)}~${shortDate(option.returnDate)}`,
    }));
    const failed = flexible.failedDates.length ? ` 일부 날짜(${flexible.failedDates.length}개)는 조회하지 못했어요.` : "";
    // 최저가는 실제로 찾아본 날짜 후보 중 최저가다(기간 전체의 절대 최저가가 아님).
    const notice = flexible.priceSelection.cheapest ? `찾아본 날짜 중 가격이 낮은 순서예요.${failed}` : `조건에 맞는 추천 결과가 없어요.${failed}`;
    return { items, notice };
  }
  const exact = data as RoundTripSearchResponse;
  const items = exact.combinations.map((combination) => ({
    key: `${exact.searchId}-${combination.outboundId}-${combination.returnId}`,
    combination,
  }));
  const notice = exact.noNonstopFlight ? "이 노선에는 직항 항공편이 없어요." : items.length ? "" : "조건에 맞는 항공권이 없어요.";
  return { items, notice };
}

/** 위시리스트에 담을 인원·좌석 등급. 말하지 않은 값은 항공권 검색 기본값(성인 1명, 일반석)이다. */
function passengersOf(c: ChatConditions) {
  return {
    adults: c.adults ?? 1,
    children: c.children ?? 0,
    infantsInSeat: c.infantsInSeat ?? 0,
    infantsOnLap: c.infantsOnLap ?? 0,
    travelClass: (c.travelClass ?? 1) as TravelClass,
  };
}

/** 시안 AI 항공권 카드. 가는편 시간을 보여 주고 가격은 조합 price(왕복 총액)다. */
function AiFlightCard({ combination, caption, heart }: { combination: RoundTripCombination; caption?: string; heart: ReactNode }) {
  const leg = combination.outbound;
  const first = leg.segments[0];
  const last = leg.segments.at(-1);
  const airline = airlinesOf(leg).join(", ") || "항공사 정보 없음";
  // 가는편 전체 로고가 비어 있는 응답이 있어 첫 구간 로고로 대신한다.
  const logo = leg.airlineLogo ?? first?.airlineLogo;
  const back = combination.inbound.segments[0]?.departure?.localTime?.slice(11);
  return (
    <article className="ai-flight-card" aria-label={`${airline} 가는편 ${first?.departure?.localTime ?? ""} 출발${back ? `, 오는편 ${back} 출발` : ""}`}>
      {logo ? <img className="ai-airline-logo" src={logo} width={40} height={40} alt="" /> : <span className="ai-airline-logo" />}
      <div className="ai-airline">
        <strong>{airline}</strong>
        <small>
          {leg.stops === 0 ? "직항" : `경유 ${leg.stops}회`}
          {caption && ` · ${caption}`}
        </small>
      </div>
      <div className="ai-flight-route">
        <strong>{first?.departure?.localTime?.slice(11) ?? "-"}</strong>
        <span>
          <img className="ai-route-plane" src="/flight/airplane.svg" alt="" />
          <small>{formatMinutes(leg.totalDurationMinutes)}</small>
        </span>
        <strong>{last?.arrival?.localTime?.slice(11) ?? "-"}</strong>
        <small className="ai-origin-code">{first?.departure?.code}</small>
        <small className="ai-destination-code">{last?.arrival?.code}</small>
      </div>
      <strong className="ai-flight-price">
        {combination.price == null ? "가격 정보 없음" : `${combination.price.toLocaleString("ko-KR")}원`} <small>왕복</small>
      </strong>
      {heart}
    </article>
  );
}

const shortDate = (value: string) => {
  const [, month, day] = value.split("-").map(Number);
  return `${month}.${day}`;
};

const nightsBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

function tripPeriod(c: ChatConditions) {
  if (c.dateMode === "FLEXIBLE" && c.travelWindowStart && c.travelWindowEnd) {
    return `${shortDate(c.travelWindowStart)} ~ ${shortDate(c.travelWindowEnd)} 중${c.nights ? ` ${c.nights}박` : ""}`;
  }
  if (c.outboundDate && c.returnDate) {
    const nights = nightsBetween(c.outboundDate, c.returnDate);
    return `${shortDate(c.outboundDate)} ~ ${shortDate(c.returnDate)} (${nights}박 ${nights + 1}일)`;
  }
  if (c.outboundDate) return `${shortDate(c.outboundDate)} 출발`;
  return "아직 정하지 않았어요";
}

/** 인원을 말하지 않았으면 백엔드 기본값을 쓴다. 값을 추측하지 않고 "기본"으로 표시한다. */
function passengers(c: ChatConditions) {
  const parts = [
    c.adults && `성인 ${c.adults}명`,
    c.children && `소아 ${c.children}명`,
    c.infantsInSeat && `유아(좌석) ${c.infantsInSeat}명`,
    c.infantsOnLap && `유아(무릎) ${c.infantsOnLap}명`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "성인 1명(기본)";
}

const formatBudget = (krw: number) => (krw % 10_000 === 0 ? `${(krw / 10_000).toLocaleString("ko-KR")}만원` : formatPrice(krw));
