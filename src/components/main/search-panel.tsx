"use client";

import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useConditionForm, type InitialCondition } from "@/components/flight/condition-form";
import { useAiSearch } from "@/components/main/ai-search";
import { prefersReducedMotion, useInfoDialog, useIsMobile, useToast } from "@/components/main/main-ui";
import { PromptForm } from "@/components/main/prompt-form";
import { formatLocation } from "@/lib/flight-client";

type Mode = "AI" | "조건" | "사주" | "MBTI";

const TABS: { mode: Mode; id: string; label: string; icon: ReactNode }[] = [
  {
    mode: "AI",
    id: "tab-ai",
    label: "AI 검색",
    icon: <path d="M6.99935 1.16699L5.54102 5.54199L1.16602 7.00033L5.54102 8.45866L6.99935 12.8337L8.45768 8.45866L12.8327 7.00033L8.45768 5.54199L6.99935 1.16699Z" fill="currentColor" />,
  },
  {
    mode: "조건",
    id: "tab-condition",
    label: "조건 검색",
    icon: (
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <path d="M11.0833 2.33301H2.91667C2.27233 2.33301 1.75 2.85534 1.75 3.49967V11.6663C1.75 12.3107 2.27233 12.833 2.91667 12.833H11.0833C11.7277 12.833 12.25 12.3107 12.25 11.6663V3.49967C12.25 2.85534 11.7277 2.33301 11.0833 2.33301Z" />
        <path d="M9.33398 1.16699V3.50033" />
        <path d="M4.66602 1.16699V3.50033" />
        <path d="M1.75 5.83301H12.25" />
      </g>
    ),
  },
  {
    mode: "사주",
    id: "tab-saju",
    label: "사주 검색",
    icon: (
      <g stroke="currentColor" strokeWidth="1.2">
        <path d="M7 12.25C9.8995 12.25 12.25 9.8995 12.25 7C12.25 4.10051 9.8995 1.75 7 1.75C4.10051 1.75 1.75 4.10051 1.75 7C1.75 9.8995 4.10051 12.25 7 12.25Z" />
        <path d="M10.7123 3.28769C9.72774 2.30312 8.39239 1.75 7 1.75C7.69619 1.75 8.36387 2.02656 8.85615 2.51884C9.34844 3.01113 9.625 3.67881 9.625 4.375C9.625 5.07119 9.34844 5.73887 8.85615 6.23116C8.36387 6.72344 7.69619 7 7 7C6.30381 7 5.63613 7.27656 5.14384 7.76884C4.65156 8.26113 4.375 8.92881 4.375 9.625C4.375 10.3212 4.65156 10.9889 5.14384 11.4812C5.63613 11.9734 6.30381 12.25 7 12.25C8.39239 12.25 9.72774 11.6969 10.7123 10.7123C11.6969 9.72774 12.25 8.39239 12.25 7C12.25 5.60761 11.6969 4.27226 10.7123 3.28769Z" />
        <path d="M7 5.25C7.48325 5.25 7.875 4.85825 7.875 4.375C7.875 3.89175 7.48325 3.5 7 3.5C6.51675 3.5 6.125 3.89175 6.125 4.375C6.125 4.85825 6.51675 5.25 7 5.25Z" fill="currentColor" stroke="none" />
        <path d="M7 10.5C7.48325 10.5 7.875 10.1082 7.875 9.625C7.875 9.14175 7.48325 8.75 7 8.75C6.51675 8.75 6.125 9.14175 6.125 9.625C6.125 10.1082 6.51675 10.5 7 10.5Z" fill="white" />
      </g>
    ),
  },
  {
    mode: "MBTI",
    id: "tab-mbti",
    label: "MBTI 검색",
    icon: (
      <g stroke="currentColor" strokeWidth="1.2">
        <path d="M5.54167 1.75H2.625C2.14175 1.75 1.75 2.14175 1.75 2.625V5.54167C1.75 6.02492 2.14175 6.41667 2.625 6.41667H5.54167C6.02492 6.41667 6.41667 6.02492 6.41667 5.54167V2.625C6.41667 2.14175 6.02492 1.75 5.54167 1.75Z" />
        <path d="M11.3747 1.75H8.45801C7.97476 1.75 7.58301 2.14175 7.58301 2.625V5.54167C7.58301 6.02492 7.97476 6.41667 8.45801 6.41667H11.3747C11.8579 6.41667 12.2497 6.02492 12.2497 5.54167V2.625C12.2497 2.14175 11.8579 1.75 11.3747 1.75Z" />
        <path d="M5.54167 7.58301H2.625C2.14175 7.58301 1.75 7.97476 1.75 8.45801V11.3747C1.75 11.8579 2.14175 12.2497 2.625 12.2497H5.54167C6.02492 12.2497 6.41667 11.8579 6.41667 11.3747V8.45801C6.41667 7.97476 6.02492 7.58301 5.54167 7.58301Z" />
        <path d="M11.3757 7.58301H8.45898C7.97574 7.58301 7.58398 7.97476 7.58398 8.45801V11.3747C7.58398 11.8579 7.97574 12.2497 8.45898 12.2497H11.3757C11.8589 12.2497 12.2507 11.8579 12.2507 11.3747V8.45801C12.2507 7.97476 11.8589 7.58301 11.3757 7.58301Z" />
      </g>
    ),
  },
];

const SUGGESTIONS = ["가성비 좋은 일본 온천 여행", "아이와 함께 갈만한 동남아 여행", "혼자 떠나는 힐링 여행"];

const MBTI_TYPES = ["INTJ", "INTP", "INFJ", "INFP", "ISTJ", "ISTP", "ISFJ", "ISFP", "ENTJ", "ENTP", "ENFJ", "ENFP", "ESTJ", "ESTP", "ESFJ", "ESFP"];

/** conditionTab: ?search=condition으로 오면 조건이 없어도 조건 검색 탭을 연다(항공권 목록에 조건 없이 들어온 경우). */
export function SearchPanel({ initialCondition, conditionTab }: { initialCondition?: InitialCondition | null; conditionTab?: boolean }) {
  const [mode, setMode] = useState<Mode>(initialCondition || conditionTab ? "조건" : "AI");
  const [prompt, setPrompt] = useState("");
  const isMobile = useIsMobile();
  const promptInput = useRef<HTMLTextAreaElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabList = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const { show, dialog } = useInfoDialog();
  const { notify, toast } = useToast();
  const ai = useAiSearch();
  const condition = mode === "조건";
  const mbti = mode === "MBTI";
  const [mbtiType, setMbtiType] = useState(MBTI_TYPES[0]);
  const activeIndex = TABS.findIndex((tab) => tab.mode === mode);
  const activeTab = TABS[activeIndex];

  // 활성 탭 밑줄을 그 탭 아래로 옮기고(CSS transition), 고정 배경 높이(--hero-height)를 히어로 높이에 맞춘다.
  useLayoutEffect(() => {
    const list = tabList.current!;
    const hero = list.closest<HTMLElement>(".hero")!;
    function sync() {
      const tab = tabRefs.current[activeIndex];
      const bar = indicator.current;
      if (!tab || !bar) return;
      const l = list.getBoundingClientRect();
      const r = tab.getBoundingClientRect();
      bar.style.transform = `translate3d(${r.left - l.left + list.scrollLeft}px,${r.bottom - l.top - 2}px,0)`;
      bar.style.width = `${r.width}px`;
      // 첫 배치는 애니메이션 없이 자리를 잡은 뒤 transition을 켠다.
      if (!bar.classList.contains("ready")) {
        void bar.offsetWidth;
        bar.classList.add("ready");
      }
      hero.style.setProperty("--hero-height", `${hero.getBoundingClientRect().height}px`);
    }
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(list);
    observer.observe(hero);
    void document.fonts?.ready.then(sync);
    return () => observer.disconnect();
  }, [activeIndex]);

  const placeholder =
    mode === "사주"
      ? "생년월일과 선호하는 여행 스타일을 알려 주세요."
      : isMobile
        ? "여행 조건을 자유롭게 말씀해 주세요."
        : "여행 조건(예산, 날짜, 특징, 스타일 등)을 자유롭게 말씀해 주세요.";

  function selectTab(index: number) {
    setMode(TABS[index].mode);
    // 모바일에서는 탭 줄이 가로로 스크롤되므로 고른 탭이 보이게 한다.
    tabRefs.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  function onTabKeyDown(event: KeyboardEvent, index: number) {
    const last = TABS.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectTab(next);
    tabRefs.current[next]?.focus();
  }

  function submitPrompt(event: FormEvent) {
    event.preventDefault();
    const query = prompt.trim();
    if (!query) return;
    // AI 검색은 채팅 API로 연결한다. 사주 검색은 시안에 결과 화면이 없어 안내만 한다(API 미연결).
    if (mode === "AI") ai.ask(query);
    else show("여행 조건을 확인했어요", `“${query}”

사주 검색은 준비 중입니다. AI 검색 탭에서 같은 조건으로 찾아보세요.`);
  }

  const renderTab = (tab: (typeof TABS)[number], index: number) => (
    <button
      key={tab.id}
      ref={(element) => {
        tabRefs.current[index] = element;
      }}
      className={`search-tab${tab.mode === mode ? " active" : ""}`}
      id={tab.id}
      type="button"
      role="tab"
      aria-selected={tab.mode === mode}
      aria-controls={tab.mode === "조건" ? "condition-content" : tab.mode === "MBTI" ? "mbti-content" : "search-content"}
      tabIndex={tab.mode === mode ? 0 : -1}
      onClick={() => selectTab(index)}
      onKeyDown={(event) => onTabKeyDown(event, index)}
    >
      <svg className="search-tab-icon" aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 14 14" fill="none">
        {tab.icon}
      </svg>
      {tab.label}
    </button>
  );

  return (
    <div className={`search-panel${condition ? " condition-mode" : ""}${mbti ? " mbti-mode" : ""}`}>
      <div ref={tabList} className="search-tabs" role="tablist" aria-label="여행 검색 방식">
        <div className="tab-pair">{TABS.slice(0, 2).map((tab, i) => renderTab(tab, i))}</div>
        <div className="tab-pair">{TABS.slice(2).map((tab, i) => renderTab(tab, i + 2))}</div>
        <span ref={indicator} className="tab-indicator" aria-hidden="true" />
      </div>

      <div id="search-content" role="tabpanel" aria-labelledby={activeTab.id} hidden={condition || mbti}>
        <PromptForm value={prompt} onChange={setPrompt} placeholder={placeholder} onSubmit={submitPrompt} inputRef={promptInput} />
        <div className="suggestions">
          {SUGGESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => {
                setPrompt(text);
                promptInput.current?.focus();
              }}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {/* MBTI 검색은 시안만 적용했다(API 미연결). 제출하면 안내만 띄운다. */}
      <div id="mbti-content" role="tabpanel" aria-labelledby="tab-mbti" hidden={!mbti}>
        <h2 className="mbti-title">나의 MBTI로 찾는 여행지</h2>
        <div className="mbti-grid" role="radiogroup" aria-label="MBTI 유형 선택">
          {MBTI_TYPES.map((type) => (
            <button
              key={type}
              className={`mbti-option${type === mbtiType ? " is-selected" : ""}`}
              type="button"
              role="radio"
              aria-checked={type === mbtiType}
              onClick={() => setMbtiType(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <button
          className="mbti-submit"
          type="button"
          onClick={() => show(`${mbtiType} 맞춤 여행지`, "MBTI 여행지 추천은 준비 중입니다. 지금은 AI 검색이나 조건 검색을 이용해 주세요.")}
        >
          <span className="search-glyph" aria-hidden="true" />
          <span>가보자 GO</span>
        </button>
      </div>

      <div id="condition-content" role="tabpanel" aria-labelledby="tab-condition" hidden={!condition}>
        <ConditionSearch notify={notify} initial={initialCondition} />
      </div>

      {dialog}
      {ai.dialog}
      {toast}
    </div>
  );
}

function ConditionSearch({ notify, initial }: { notify: (text: string) => void; initial?: InitialCondition | null }) {
  const { state, update, error, field, pickerPanel, submit, datesText, passengersText } = useConditionForm(initial, { notify, portal: ".main-page" });
  const { origin, destination } = state;

  return (
    <>
      <form className="condition-form" noValidate onSubmit={submit}>
        <div className="trip-types" role="radiogroup" aria-label="여행 유형">
          {(
            [
              ["round", "왕복"],
              ["oneway", "편도"],
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="trip-type"
                value={value}
                checked={state.trip === value}
                onChange={() => update(value === "oneway" ? { trip: value, return: null } : { trip: value })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <div className="condition-fields">
          {field("origin", "출발지", origin ? formatLocation(origin) : "출발지를 선택해 주세요")}
          {field("destination", "목적지", destination ? formatLocation(destination) : "목적지를 선택해 주세요")}
          {field("dates", "일정", datesText)}
          {field("passengers", "탑승객 및 좌석", passengersText)}
        </div>
        <div className="condition-actions">
          <p id="condition-error" role="alert" aria-live="polite">
            {error}
          </p>
          <button className="condition-submit" type="submit">
            <span className="search-glyph" aria-hidden="true" /> 가보자 GO
          </button>
        </div>
      </form>

      {pickerPanel}
    </>
  );
}
