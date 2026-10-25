// 클라이언트 컴포넌트 전용(React 훅 포함). 서버 컴포넌트에서는 import하지 않는다.
import { useRef, useState, type FormEvent } from "react";
import { closeDialogAnimated, Img, isBackdropClick } from "@/components/main/main-ui";
import type { ChatConditions, ChatMessageResponse, ChatSessionCreated } from "@/lib/chat-types";
import { formatPrice, postJson, requestJson } from "@/lib/flight-client";

const MAX_MESSAGE = 1000;

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
      // conditions는 누적 전체 조건이라 이전 값과 합치지 않고 교체한다.
      setTurn(result.data);
      return true;
    } finally {
      setPending(false);
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
        <div className="ai-dialog-actions">
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
    </dialog>
  );

  return { ask, dialog };
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
