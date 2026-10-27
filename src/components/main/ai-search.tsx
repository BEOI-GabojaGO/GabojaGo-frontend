/* eslint-disable @next/next/no-img-element -- API의 항공사 로고 URL과 디자인 원본 SVG를 그대로 쓴다. */
// 클라이언트 컴포넌트 전용(React 훅 포함). 서버 컴포넌트에서는 import하지 않는다.
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { airlinesOf, FlightHeart } from "@/components/flight/flight-list-ui";
import { closeDialogAnimated, Img, isBackdropClick, useToast } from "@/components/main/main-ui";
import { SiteLoader } from "@/components/site-loader";
import type {
  ChatConditions,
  ChatConfirmation,
  ChatMessageResponse,
  ChatSearchResult,
  ChatSearchStatus,
  ChatSessionCreated,
  ChatSessionState,
  FlexibleFlightSearchResponse,
} from "@/lib/chat-types";
import { formatMinutes, formatPrice, postJson, requestJson } from "@/lib/flight-client";
import { toSearchQuery } from "@/lib/flight-search-params";
import type { FlightOption, RoundTripCombination, RoundTripSearchResponse, TravelClass } from "@/lib/flight-types";
import { resolveLocation } from "@/lib/locations";

const MAX_MESSAGE = 1000;
/** 다이얼로그에는 3장만 보여 준다. "더 많은 항공권 찾기"는 같은 조건으로 조건 검색 화면으로 넘긴다(결정 3.2 (b)). */
const PAGE = 3;

type SearchView = { conditions: ChatConditions; dateMode: "EXACT" | "FLEXIBLE"; data: ChatSearchResult };

/** 탭 단위로 대화를 이어가려고 세션 ID만 보관한다. 메시지 이력은 서버에도 없어 복원하지 않는다. */
const SESSION_KEY = "gabojago.aiChatSessionId";
const storage = {
  get: () => {
    try {
      return sessionStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  },
  set: (id: string | null) => {
    try {
      if (id) sessionStorage.setItem(SESSION_KEY, id);
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // 저장소를 쓸 수 없으면 새로고침 때 새 대화로 시작한다.
    }
  },
};

/** 검색 응답이 불명확할 때 상태 GET 간격·횟수 상한. 재POST는 하지 않는다(인계 문서 5절). */
const STATUS_POLL_MS = 3000;
const STATUS_POLL_LIMIT = 10;

const SEARCH_FAILURES: Record<string, string> = {
  SERPAPI_QUOTA_EXCEEDED: "항공권 검색 한도를 모두 썼어요. 잠시 후 다시 시도해 주세요.",
  FLIGHT_SEARCH_FAILED: "항공권 검색에 실패했어요. 다시 검색하려면 버튼을 눌러 주세요.",
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 메인 AI 검색(시안 AI Prompt Modal) + 채팅 API. 결정 사항은 docs/AI-SEARCH-DECISIONS.md.
 * 세션은 첫 메시지를 보낼 때 한 번만 만들고, 같은 대화의 메시지는 같은 ID로 보낸다. 자동 재시도는 하지 않는다.
 */
export function useAiSearch() {
  const ref = useRef<HTMLDialogElement>(null);
  const sessionId = useRef<string | null>(null);
  /** 이 탭에서 주고받은 대화. 서버는 이력을 돌려주지 않아 화면에만 쌓는다. */
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  /** 응답을 기다리는 내 메시지. 성공해야 기록에 넣어, 실패 후 다시 보내도 말풍선이 겹치지 않는다. */
  const [question, setQuestion] = useState("");
  const [turn, setTurn] = useState<ChatMessageResponse | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState<SearchView | null>(null);
  /** 세션이 만료돼 새 대화를 시작해야 하는 상태. */
  const [expired, setExpired] = useState(false);
  /** 검색 한도(429)를 넘으면 같은 화면에서 다시 검색하지 않게 확인 버튼을 숨긴다. */
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  /** 새로고침 전 세션을 이어 쓰는 첫 응답에 한 번 안내한다. */
  const [resumed, setResumed] = useState(false);
  const { notify, toast } = useToast();
  const router = useRouter();

  function open() {
    if (ref.current?.open) return;
    ref.current?.showModal();
    document.body.classList.add("ai-open");
  }

  const close = () => closeDialogAnimated(ref.current, 700);

  /** 만료됐을 때 처음부터. 서버 세션은 다음 메시지 때 새로 만든다. */
  function startOver() {
    sessionId.current = null;
    storage.set(null);
    setTurn(null);
    setSearch(null);
    setMessages([]);
    setError("");
    setExpired(false);
    setResumed(false);
    setQuotaExceeded(false);
  }

  /** 세션 404는 대화 만료다. 다른 404(검색 기록 없음 등)와 구분한다. */
  function failed(result: { code?: string; message: string }) {
    if (result.code === "CHAT_SESSION_NOT_FOUND") {
      sessionId.current = null;
      storage.set(null);
      setExpired(true);
      setError("대화가 만료됐어요. 새 대화를 시작해 주세요.");
      return;
    }
    if (result.code === "SERPAPI_QUOTA_EXCEEDED") setQuotaExceeded(true);
    setError(SEARCH_FAILURES[result.code ?? ""] ?? result.message);
  }

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
    // 만료 뒤 "새 대화 시작"을 누르지 않고 바로 보내도 새 세션으로 이어지므로 만료 표시를 푼다.
    setExpired(false);
    // 이어쓰기 안내는 새로고침 뒤 첫 응답에만 보여 준다.
    setResumed(false);
    let sent = false;
    try {
      if (!sessionId.current) {
        // 새로고침 전 대화가 있으면 이어서 쓴다(서버가 조건·문맥을 갖고 있다).
        const stored = storage.get();
        if (stored) {
          sessionId.current = stored;
          setResumed(true);
        } else {
          const created = await requestJson<ChatSessionCreated>("/api/v1/chat-sessions", { method: "POST" });
          if (!created.ok) {
            setError(created.message);
            return false;
          }
          sessionId.current = created.data.chatSessionId;
          storage.set(sessionId.current);
        }
      }
      const result = await postJson<ChatMessageResponse>(`/api/v1/chat-sessions/${encodeURIComponent(sessionId.current)}/messages`, { message });
      if (!result.ok) {
        // 메시지는 자동 재시도하지 않는다(중복 저장·LLM 호출). 입력은 그대로 둔다.
        failed(result);
        return false;
      }
      // conditions는 누적 전체 조건이라 이전 값과 합치지 않고 교체한다. 조건이 바뀌었으니 이전 결과도 지운다.
      setMessages((list) => [...list, { role: "user", text: message }, { role: "ai", turn: result.data }]);
      setTurn(result.data);
      setSearch(null);
      setQuotaExceeded(false);
      sent = true;
      return true;
    } finally {
      // 실패하면 보낸 문장을 입력창에 남겨 다시 보낼 수 있게 한다(메인 입력창에서 보낸 경우 포함).
      if (!sent) setDraft((current) => current || message);
      setQuestion("");
      setPending(false);
    }
  }

  // 새 메시지·대기·결과가 생기면 대화 맨 아래를 보여 준다.
  useEffect(() => {
    const content = ref.current?.querySelector(".ai-dialog-content");
    content?.scrollTo({ top: content.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending, search]);

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
        if (confirmed.code === "CHAT_CONDITION_VERSION_CONFLICT") await refreshConditions(base);
        else failed(confirmed);
        return;
      }
      // 결과에 dateMode가 없을 수 있어 승인한 조건의 dateMode로 구분한다.
      const conditions = turn.conditions ?? {};
      const show = (data: ChatSearchResult) => {
        setSearch({ conditions, dateMode: conditions.dateMode ?? "EXACT", data });
      };
      const result = await requestJson<ChatSearchResult>(`${base}/search`, { method: "POST" });
      if (result.ok) return show(result.data);
      // 응답이 불명확하면(연결 끊김, 검색 실패·진행 중) 다시 POST하지 않고 최신 검색 상태로 확인한다.
      if (result.status === 0 || result.status >= 500 || result.code === "CHAT_SEARCH_IN_PROGRESS") await checkSearch(base, show);
      else failed(result);
    } finally {
      setSearching(false);
    }
  }

  /** 승인 409: 서버의 최신 조건·버전으로 바꾸고 사용자가 다시 확인하게 한다(자동 승인하지 않음). */
  async function refreshConditions(base: string) {
    const latest = await requestJson<ChatSessionState>(base);
    if (!latest.ok) return failed(latest);
    const { state, conditions, conditionVersion } = latest.data;
    setTurn((current) => current && { ...current, state, conditions, conditionVersion });
    setError("조건이 바뀌었어요. 최신 조건을 확인하고 다시 눌러 주세요.");
  }

  /** GET .../search로 결과를 확인한다. 진행 중이면 상한까지 기다리고, 다이얼로그를 닫으면 멈춘다. */
  async function checkSearch(base: string, show: (data: ChatSearchResult) => void) {
    for (let attempt = 0; attempt < STATUS_POLL_LIMIT; attempt++) {
      const status = await requestJson<ChatSearchStatus>(`${base}/search`);
      if (!status.ok) {
        if (status.code === "CHAT_SEARCH_NOT_FOUND") setError("검색 기록을 찾을 수 없어요. 다시 검색하려면 버튼을 눌러 주세요.");
        else failed(status);
        return;
      }
      const job = status.data;
      if (job.status === "COMPLETED" && job.result) return show(job.result);
      if (job.status === "FAILED") return failed({ code: job.failureCode ?? undefined, message: SEARCH_FAILURES.FLIGHT_SEARCH_FAILED });
      if (!ref.current?.open) return;
      await wait(STATUS_POLL_MS);
    }
    setError("검색이 오래 걸리고 있어요. 잠시 후 다시 확인해 주세요.");
  }

  /** 더 많은 항공권: 같은 조건으로 조건 검색(왕복 항공권 목록)으로 넘긴다. 목록 화면이 다시 검색한다(SerpApi 재호출, 팀 결정). */
  async function openFlightList() {
    if (!search || !results) return;
    const c = search.conditions;
    // 채팅 조건의 지명은 표시용 이름이라, 백엔드와 같은 규칙으로 하나로 확정될 때만 넘긴다.
    const origin = resolveLocation(c.origin ?? "");
    const destination = resolveLocation(c.destination ?? "");
    if (!origin || !destination) {
      setError("출발지/도착지를 항공권 목록에서 찾지 못했어요. 조건 검색에서 직접 골라 주세요.");
      return;
    }
    // FLEXIBLE은 날짜가 기간이라 화면 첫 카드(가장 싼 옵션)의 날짜로 넘긴다.
    const { outboundDate, returnDate } = results.items[0]?.dates ?? c;
    if (!outboundDate || !returnDate) {
      setError("여행 날짜가 정해지지 않아 항공권 목록으로 넘길 수 없어요.");
      return;
    }
    const query = toSearchQuery(
      { origin: origin.airportCodes, destination: destination.airportCodes, outboundDate, returnDate, ...passengersOf(c) },
      { origin, destination },
    );
    await close();
    router.push(`/flights/round-trip/step?${query}`);
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

  const lastAi = messages.findLastIndex((message) => message.role === "ai");
  // 문장(reply)과 관계없이 서버가 계산한 상태로 판단한다. 최종 판단은 서버가 다시 한다.
  const canSearch = turn?.state === "AWAITING_CONFIRMATION" && !turn.missingFields.length && !turn.ambiguousFields.length && !search && !quotaExceeded && !expired;
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
        <div className="ai-chat-log" aria-live="polite">
          {!messages.length && !pending && (
            <div className="ai-answer">
              <strong>AI 답변</strong>
              <p>여행 조건을 말씀해 주시면 정리해 드릴게요.</p>
            </div>
          )}
          {messages.map((message, index) =>
            message.role === "user" ? (
              <p key={index} className="ai-user-message">
                {message.text}
              </p>
            ) : (
              <Fragment key={index}>
                <div className="ai-answer">
                  <strong>AI 답변</strong>
                  {/* reply는 텍스트로만 그린다(HTML 삽입 금지). */}
                  <p>{message.turn.reply}</p>
                </div>
                {/* 답변마다 그때의 조건을 보여 준다. 마지막 카드는 409 갱신을 반영하려고 최신 turn을 쓴다. */}
                <TripSummary turn={index === lastAi && turn ? turn : message.turn} />
              </Fragment>
            ),
          )}
          {pending && (
            <>
              <p className="ai-user-message">{question}</p>
              <div className="ai-answer">
                <strong>AI 답변</strong>
                <p className="ai-pending" role="status">
                  조건을 정리하고 있어요...
                </p>
              </div>
            </>
          )}
          {resumed && !pending && (
            <p className="ai-resume-note">새로고침 전 대화에 이어서 답했어요. 지난 메시지는 다시 표시되지 않아요.</p>
          )}
          {error && (
            <p className="ai-error" role="alert">
              {error}
              {expired && (
                <button className="ai-restart" type="button" onClick={startOver}>
                  새 대화 시작
                </button>
              )}
            </p>
          )}
        </div>
        {results && (
          <div className="ai-flight-list" aria-label="추천 항공권">
            {results.notice && <p className="ai-result-notice">{results.notice}</p>}
            {results.items.slice(0, PAGE).map(({ key, combination, showDate }) => (
              <AiFlightCard
                key={key}
                combination={combination}
                showDate={showDate}
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
              <span className="ai-action-label-mobile">항공권 찾기</span>
              <span className="ai-action-label-desktop">이 조건으로 항공권 찾기</span>
            </button>
          )}
          <button
            className="ai-edit-query"
            type="button"
            onClick={() => {
              // 팝업을 닫지 않고 같은 대화에 바꿀 조건을 입력하게 한다.
              ref.current?.querySelector<HTMLInputElement>("#ai-followup-input")?.focus({ preventScroll: true });
            }}
          >
            <svg className="ai-action-icon" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M11.25 4.167L15.833 8.75M4.167 15.833L5.139 11.944L13.75 3.333C14.21 2.873 14.956 2.873 15.417 3.333L16.667 4.583C17.127 5.044 17.127 5.79 16.667 6.25L8.056 14.861L4.167 15.833Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="ai-action-label-mobile">조건 수정</span>
            <span className="ai-action-label-desktop">조건 수정하기</span>
          </button>
          {results && (
            <button className="ai-more-flights" type="button" onClick={() => void openFlightList()}>
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

/** AI 답변 하나는 그때의 응답 전체(조건·누락·애매 항목)를 함께 보관한다. */
type ChatEntry = { role: "user"; text: string } | { role: "ai"; turn: ChatMessageResponse };

type SummaryCell = "period" | "passengers" | "tripType" | "budget" | "route" | "style";

/** missingFields·ambiguousFields 항목명 → 조건 카드 칸. 백엔드 ChatTurnDecisionMaker의 항목명 기준. */
const FIELD_CELL: Record<string, SummaryCell> = {
  dateMode: "period",
  outboundDate: "period",
  returnDate: "period",
  travelWindowStart: "period",
  travelWindowEnd: "period",
  nights: "period",
  weekendRule: "period",
  adults: "passengers",
  children: "passengers",
  infantsInSeat: "passengers",
  infantsOnLap: "passengers",
  travelClass: "passengers",
  maxBudgetKrw: "budget",
  origin: "route",
  destination: "route",
};

/** 조건 요약 카드. 아직 없거나 애매한 칸은 분홍색으로 강조한다. */
function TripSummary({ turn }: { turn: Pick<ChatMessageResponse, "conditions" | "missingFields" | "ambiguousFields"> }) {
  const c = turn.conditions ?? {};
  const flagged = new Set([...turn.missingFields, ...turn.ambiguousFields].map((field) => FIELD_CELL[field]));
  const cell = (key: SummaryCell, label: string, value: ReactNode) => (
    <div className={flagged.has(key) ? "is-flagged" : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
  return (
    <section className="ai-trip-summary" aria-label="검색 조건 요약">
      {cell("period", "여행 기간", tripPeriod(c))}
      {cell("passengers", "탑승객", passengers(c))}
      {/* 채팅 API는 왕복만 검색한다. */}
      {cell("tripType", "여행 유형", "왕복")}
      {cell("budget", "예산", c.maxBudgetKrw ? `${formatBudget(c.maxBudgetKrw)} 이하` : "제한 없음")}
      {cell("route", "출발지 / 도착지", `${c.origin ?? "미정"} / ${c.destination ?? "미정"}`)}
      {/* API에 없는 항목(미연결). */}
      {cell("style", "여행 스타일", "-")}
    </section>
  );
}

type ResultItem = {
  key: string;
  combination: RoundTripCombination;
  showDate?: boolean;
  /** FLEXIBLE 옵션의 날짜. 조건 검색으로 넘길 때 쓴다. */
  dates?: { outboundDate: string; returnDate: string };
};

/** EXACT는 combinations, FLEXIBLE은 예산을 적용한 priceSelection.options를 쓴다(원본 results를 최종 목록으로 쓰지 않음). */
function resultItems({ dateMode, data }: SearchView): { items: ResultItem[]; notice: string } {
  if (dateMode === "FLEXIBLE") {
    const flexible = data as FlexibleFlightSearchResponse;
    const items = flexible.priceSelection.options.map((option) => ({
      key: `${option.searchId}-${option.combination.outboundId}-${option.combination.returnId}`,
      combination: option.combination,
      showDate: true,
      dates: { outboundDate: option.outboundDate, returnDate: option.returnDate },
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

/** 시안 AI 항공권 카드. 시안은 한 줄이지만 가격이 조합 price(왕복 총액)라 가는편·오는편을 편마다 한 줄씩 보여 준다. */
function AiFlightCard({ combination, showDate, heart }: { combination: RoundTripCombination; showDate?: boolean; heart: ReactNode }) {
  const { outbound, inbound } = combination;
  const describe = (label: string, leg: FlightOption) =>
    `${label} ${airlinesOf(leg).join(", ") || "항공사 정보 없음"} ${leg.segments[0]?.departure?.localTime ?? ""} 출발`;
  return (
    <article className="ai-flight-card" aria-label={`${describe("가는편", outbound)}, ${describe("오는편", inbound)}`}>
      <div className="ai-flight-legs">
        <FlightLeg leg={outbound} label="가는편" showDate={showDate} />
        <FlightLeg leg={inbound} label="오는편" showDate={showDate} />
      </div>
      <strong className="ai-flight-price">
        {combination.price == null ? "가격 정보 없음" : `${combination.price.toLocaleString("ko-KR")}원`} <small>왕복</small>
      </strong>
      {heart}
    </article>
  );
}

/** 한 편의 로고·항공사·경로. 가는편과 오는편 항공사가 다를 수 있어 편마다 따로 그린다. */
function FlightLeg({ leg, label, showDate }: { leg: FlightOption; label: string; showDate?: boolean }) {
  const first = leg.segments[0];
  const last = leg.segments.at(-1);
  // 편 전체 로고가 비어 있는 응답이 있어 첫 구간 로고로 대신한다.
  const logo = leg.airlineLogo ?? first?.airlineLogo;
  const date = showDate && first?.departure?.localTime ? ` · ${shortDate(first.departure.localTime.slice(0, 10))}` : "";
  return (
    <div className="ai-flight-leg">
      {logo ? <img className="ai-airline-logo" src={logo} width={40} height={40} alt="" /> : <span className="ai-airline-logo" />}
      <div className="ai-airline">
        <strong>{airlinesOf(leg).join(", ") || "항공사 정보 없음"}</strong>
        <small>
          {leg.stops === 0 ? "직항" : `경유 ${leg.stops}회`}
          {date}
        </small>
      </div>
      <div className="ai-flight-route">
        <strong>{first?.departure?.localTime?.slice(11) ?? "-"}</strong>
        <span>
          <img className="ai-route-plane" src="/flight/airplane.svg" alt="" />
          <small>
            {label} · {formatMinutes(leg.totalDurationMinutes)}
          </small>
        </span>
        <strong>{last?.arrival?.localTime?.slice(11) ?? "-"}</strong>
        <small className="ai-origin-code">{first?.departure?.code}</small>
        <small className="ai-destination-code">{last?.arrival?.code}</small>
      </div>
    </div>
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
