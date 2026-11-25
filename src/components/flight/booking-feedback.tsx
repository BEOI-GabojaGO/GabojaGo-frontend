"use client";

/* eslint-disable @next/next/no-img-element -- 시안 뒤로 아이콘(SVG)을 그대로 쓴다. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { closeDialogAnimated, isBackdropClick, prefersReducedMotion } from "@/components/main/main-ui";
import "@/app/flights/booking-feedback.css";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const SESSION_KEY = "gaboja-booking-feedback-done";
const RATINGS = [
  ["1", "매우 나빠요"],
  ["2", "나빠요", true],
  ["3", "보통이에요"],
  ["4", "좋아요", true],
  ["5", "매우 좋아요"],
] as const;
const REASONS = [
  ["price_comparison", "항공권 최저가를 한 곳에서 비교할 수 있어요."],
  ["destination_discovery", "여행 목적지를 직접 검색하지 않아도 돼요."],
  ["recommendation_explanation", "나에게 맞는 추천 여행지에 대한 근거를 제공해줘요."],
  ["conversation_search", "챗봇과 대화를 통해 여행 목적지를 찾아요."],
  ["no_influence", "특별히 영향을 준 것은 없었어요."],
] as const;

/** 이 탭(세션)에서 이미 설문에 답했으면 true. 답한 뒤에는 묻지 않고 바로 판매처로 보낸다(사용자 결정 2026-11-25). */
export function feedbackDone() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

const isMobile = () => matchMedia("(max-width: 599px)").matches;

/**
 * 예약하기 피드백 설문(11/23 시안 booking-feedback-dialog). 판매처 "예약하기"를 누르면 뜨고, 마치면 onComplete로 판매처 이동을 이어 간다.
 * 넓은 화면: 1번(추천 반영 만족도) → "다음으로" → 2번(예약 결정 이유)으로 옆으로 넘긴다. 599px 이하: 1번을 고르면 2번이 아래에 이어 나타난다.
 * 닫으면(X·Esc·넓은 화면 배경) 이동하지 않는다(사용자 결정 2026-11-25, 시안과 같음). 응답은 dataLayer에만 넣는다(수집처 미정).
 * 쓰는 쪽은 열 때마다 key를 바꿔 새로 그린다(단계·선택 초기화).
 */
export function BookingFeedback({ provider, onComplete, onClose }: { provider: string; onComplete: () => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const header = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const steps = useRef<(HTMLDivElement | null)[]>([]);
  const back = useRef<HTMLButtonElement>(null);
  const customInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [inline, setInline] = useState(false);
  const [fit, setFit] = useState("");
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");

  useEffect(() => {
    dialog.current?.showModal();
    dialog.current?.querySelector<HTMLInputElement>('input[name="recommendation-fit"]')?.focus();
  }, []);

  const hasReason = !!reason && (reason !== "custom" || !!custom.trim());
  const complete = inline ? !!fit && hasReason : step === 1 ? !!fit : hasReason;
  const label = !complete ? "의견을 부탁드려요" : !inline && step === 1 ? "다음으로" : `${provider} 예약하자 GO`;

  const close = () => void closeDialogAnimated(dialog.current, 0).then(onClose);

  /** 넓은 화면 단계 이동: 높이를 맞추며 옆으로 넘기고, 머리의 로고·뒤로 버튼도 함께 움직인다(0.54초, 시안 setBookingFeedbackStep). */
  function goStep(next: 1 | 2) {
    const current = steps.current[step - 1];
    const target = steps.current[next - 1];
    const view = viewport.current;
    const head = header.current;
    setStep(next);
    if (!current || !target || !view || !head || prefersReducedMotion()) {
      if (current) current.hidden = true;
      if (target) target.hidden = false;
      if (back.current) back.current.hidden = next !== 2;
      return;
    }
    const forward = next > step;
    if (forward && back.current) back.current.hidden = false;
    head.classList.remove("is-feedback-transitioning", "is-feedback-forward", "is-feedback-backward");
    head.classList.add("is-feedback-transitioning", forward ? "is-feedback-forward" : "is-feedback-backward");
    view.style.height = `${current.getBoundingClientRect().height}px`;
    view.classList.add("is-transitioning", forward ? "is-forward" : "is-backward");
    current.hidden = false;
    target.hidden = false;
    current.classList.add("is-active", "is-leaving");
    target.classList.add("is-entering");
    requestAnimationFrame(() => {
      view.style.height = `${target.getBoundingClientRect().height}px`;
      target.classList.remove("is-entering");
    });
    window.setTimeout(() => {
      current.hidden = true;
      current.classList.remove("is-active", "is-leaving");
      target.classList.add("is-active");
      view.classList.remove("is-transitioning", "is-forward", "is-backward");
      view.style.height = "auto";
      if (back.current && !forward) back.current.hidden = true;
      head.classList.remove("is-feedback-transitioning", "is-feedback-forward", "is-feedback-backward");
    }, 540);
  }

  /** 599px 이하: 1번을 고르면 2번을 아래에 띄우고, 2번 질문이 1번 질문 자리에 오도록 0.76초 동안 스크롤한다(시안 revealMobileBookingReason). */
  function revealInline() {
    const view = viewport.current;
    const first = steps.current[0]?.querySelector("legend");
    const next = steps.current[1];
    if (inline || !isMobile() || !view || !next) return;
    const offsetIn = (element: HTMLElement | null) => {
      let top = 0;
      let node: HTMLElement | null = element;
      while (node && node !== view) {
        top += node.offsetTop || 0;
        node = node.offsetParent as HTMLElement | null;
      }
      return node === view ? top : null;
    };
    const firstOffset = offsetIn(first ?? null);
    setInline(true);
    next.hidden = false;
    next.classList.remove("is-inline-entering");
    void next.offsetWidth;
    next.classList.add("is-inline-entering");
    window.setTimeout(
      () =>
        requestAnimationFrame(() => {
          const start = view.scrollTop;
          const nextOffset = offsetIn(next.querySelector("legend")) ?? offsetIn(next);
          const target = firstOffset !== null && nextOffset !== null ? Math.max(0, nextOffset - firstOffset) : Math.max(0, next.offsetTop - 188);
          if (prefersReducedMotion() || Math.abs(target - start) < 1) {
            view.scrollTop = target;
            return;
          }
          const startedAt = performance.now();
          const move = (now: number) => {
            const progress = Math.min(1, (now - startedAt) / 760);
            view.scrollTop = start + (target - start) * (1 - Math.pow(1 - progress, 3));
            if (progress < 1) requestAnimationFrame(move);
          };
          requestAnimationFrame(move);
        }),
      300,
    );
    window.setTimeout(() => next.classList.remove("is-inline-entering"), 760);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!complete) return;
    if (!inline && step === 1) {
      goStep(2);
      steps.current[1]?.querySelector<HTMLInputElement>('input[name="booking-reason"]')?.focus({ preventScroll: true });
      return;
    }
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({
      event: "booking_feedback_completed",
      provider,
      recommendationFit: fit,
      bookingReason: reason,
      bookingReasonDetail: reason === "custom" ? custom.trim() : "",
    });
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // 저장소를 못 쓰면 다음에 다시 묻는다.
    }
    // 판매처 새 창은 이 클릭 안에서 열어야 막히지 않으므로 닫힘 애니메이션을 기다리지 않는다.
    onComplete();
    close();
  }

  const selectCustom = () => setReason("custom");

  return (
    <dialog
      ref={dialog}
      className="booking-feedback-dialog"
      id="booking-feedback-dialog"
      aria-labelledby="booking-feedback-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        // 모바일에서는 빈 여백을 배경 클릭으로 오인해 닫지 않는다(시안).
        if (!isMobile() && isBackdropClick(event)) close();
      }}
    >
      <div ref={header} className="booking-feedback-header">
        <div className="booking-feedback-brand-group">
          <button
            ref={back}
            className="booking-feedback-back back-link"
            type="button"
            aria-label="이전 설문으로 돌아가기"
            hidden
            onClick={() => {
              goStep(1);
              steps.current[0]?.querySelector<HTMLInputElement>('input[name="recommendation-fit"]')?.focus({ preventScroll: true });
            }}
          >
            <img src="/booking/back-arrow.svg" alt="" />
          </button>
          <span className="brand">
            가보자 <span>GO</span>
          </span>
        </div>
        <button className="booking-feedback-close" type="button" aria-label="피드백 팝업 닫기" onClick={close} />
      </div>
      <p className="booking-feedback-eyebrow">사용자 피드백</p>
      <h2 id="booking-feedback-title">예약 전, 7초만 부탁드려요!</h2>
      <form className="booking-feedback-form" data-step={inline ? "mobile-inline" : String(step)} onSubmit={submit}>
        <div ref={viewport} className="feedback-step-viewport">
          <div ref={(element) => void (steps.current[0] = element)} className="feedback-step is-active" data-feedback-step="1">
            <fieldset>
              <legend>내 예산·일정·취향이 잘 반영되었나요?</legend>
              <div className="feedback-rating-options" role="radiogroup" aria-label="추천 조건 반영 정도">
                {RATINGS.map(([value, text, hiddenLabel]) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="recommendation-fit"
                      value={value}
                      checked={fit === value}
                      onChange={() => {
                        setFit(value);
                        revealInline();
                      }}
                    />
                    <span className="feedback-rating-dot" aria-hidden="true" />
                    {hiddenLabel ? (
                      <>
                        <span className="feedback-rating-label" aria-hidden="true" />
                        <span className="sr-only">{text}</span>
                      </>
                    ) : (
                      <span className="feedback-rating-label">{text}</span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div ref={(element) => void (steps.current[1] = element)} className="feedback-step" data-feedback-step="2" hidden>
            <fieldset>
              <legend>예약 결정에 가장 영향을 준 것은 무엇인가요?</legend>
              <div className="feedback-reason-options" role="radiogroup" aria-label="예약 결정에 영향을 준 정보">
                {REASONS.map(([value, text]) => (
                  <label key={value}>
                    <input type="radio" name="booking-reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
                    <span>{text}</span>
                  </label>
                ))}
                <div className="feedback-custom-option">
                  <input type="radio" name="booking-reason" value="custom" aria-label="직접 입력한 예약 이유" checked={reason === "custom"} onChange={selectCustom} />
                  <input
                    ref={customInput}
                    className="feedback-custom-input"
                    name="booking-reason-custom"
                    type="text"
                    inputMode="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    placeholder="직접 입력할래요."
                    aria-label="예약 결정 이유 직접 입력"
                    value={custom}
                    onFocus={selectCustom}
                    onClick={selectCustom}
                    onChange={(event) => {
                      setCustom(event.target.value);
                      selectCustom();
                    }}
                  />
                  <button
                    className="feedback-custom-clear"
                    type="button"
                    aria-label="직접 입력 내용 지우기"
                    hidden={!custom}
                    onClick={(event) => {
                      event.preventDefault();
                      setCustom("");
                      selectCustom();
                      customInput.current?.focus({ preventScroll: true });
                    }}
                  />
                </div>
              </div>
            </fieldset>
          </div>
        </div>
        <div className="booking-feedback-footer">
          <p className="booking-feedback-privacy">응답은 서비스 개선을 위해 수집됩니다. 개인정보는 수집하지 않습니다.</p>
          <button className="booking-feedback-submit" type="submit" disabled={!complete}>
            <span>{label}</span>
          </button>
        </div>
      </form>
    </dialog>
  );
}
