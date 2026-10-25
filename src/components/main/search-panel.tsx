"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { cityName } from "@/components/flight/search-condition-fields";
import { Img, prefersReducedMotion, useInfoDialog, useIsMobile, useToast } from "@/components/main/main-ui";
import { formatLocation } from "@/lib/flight-client";
import { toSearchQuery } from "@/lib/flight-search-params";
import type { LocationOption, TravelClass } from "@/lib/flight-types";
import { findLocation, searchLocations } from "@/lib/locations";

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

export function SearchPanel() {
  const [mode, setMode] = useState<Mode>("AI");
  const [prompt, setPrompt] = useState("");
  const isMobile = useIsMobile();
  const promptInput = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabList = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const { show, dialog } = useInfoDialog();
  const { notify, toast } = useToast();
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
    show(
      "여행 조건을 확인했어요",
      `“${query}”\n\n이 페이지는 Figma 시안을 구현한 퍼블리싱 데모입니다. 실제 AI 추천 및 항공권 검색은 서버 연결이 필요합니다. 아래 추천 여행지에서 여행 정보를 확인할 수 있어요.`,
    );
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
        <form className="prompt-form" onSubmit={submitPrompt}>
          <Img name="imgSparkleIcon.svg" />
          <label className="sr-only" htmlFor="travel-prompt">여행 조건</label>
          <input
            ref={promptInput}
            id="travel-prompt"
            name="prompt"
            placeholder={placeholder}
            required
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <button className="send" type="submit" aria-label="여행 검색">
            <Img name="imgSendIcon.svg" />
          </button>
        </form>
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
        <ConditionSearch notify={notify} />
      </div>

      {dialog}
      {toast}
    </div>
  );
}

const CABINS = ["일반석", "프리미엄 일반석", "비즈니스석", "일등석"];

const PASSENGER_ROWS = [
  { key: "adults", label: "성인", description: "만 12세 이상", min: 1 },
  { key: "children", label: "소아", description: "만 2세~11세", min: 0 },
  { key: "infants", label: "유아", description: "만 2세 미만", min: 0 },
] as const;

const PICKER_TITLES = { origin: "출발지", destination: "도착지", dates: "일정 선택", passengers: "탑승객" };
// 피커는 모두 누른 칸 아래에 붙는 드롭다운이다(시안 positionAnchoredPicker). 폭은 Figma 기준.
const PICKER_WIDTHS = { origin: 362, destination: 362, dates: 374, passengers: 352 };
const PICKER_CLASSES = { origin: "location-picker", destination: "location-picker", dates: "date-picker", passengers: "passenger-picker" };

// Figma Origin(638:19536)의 도시 칩. 시드(locations.ts)에 없는 도시는 빠져 있다(docs/location-seed-expansion-proposal.md).
const LOCATION_REGIONS = [
  {
    label: "국내",
    flag: "flag-korea.png",
    chips: [["서울", "CITY", "SEL"], ["제주", "AIRPORT", "CJU"], ["부산", "AIRPORT", "PUS"], ["김포", "AIRPORT", "GMP"], ["인천", "AIRPORT", "ICN"], ["무안", "AIRPORT", "MWX"], ["대구", "AIRPORT", "TAE"], ["청주", "AIRPORT", "CJJ"], ["양양", "AIRPORT", "YNY"]],
  },
  {
    label: "일본",
    flag: "flag-japan.png",
    chips: [["도쿄", "CITY", "TYO"], ["오사카", "CITY", "OSA"], ["후쿠오카", "AIRPORT", "FUK"], ["삿포로", "AIRPORT", "CTS"], ["나고야", "AIRPORT", "NGO"], ["오키나와", "AIRPORT", "OKA"]],
  },
  {
    label: "중국",
    flag: "flag-china.png",
    chips: [["상하이", "CITY", "SHA"], ["광저우", "AIRPORT", "CAN"], ["북경", "CITY", "BJS"], ["청도", "AIRPORT", "TAO"], ["연길", "AIRPORT", "YNJ"], ["심천", "AIRPORT", "SZX"], ["심양", "AIRPORT", "SHE"]],
  },
].map(({ chips, ...region }) => ({
  ...region,
  chips: (chips as [string, LocationOption["type"], string][]).map(([label, type, code]) => ({ label, option: findLocation(type, code)! })),
}));

type PickerType = keyof typeof PICKER_TITLES;
type PassengerKey = (typeof PASSENGER_ROWS)[number]["key"];

type Condition = {
  trip: "round" | "oneway";
  origin: LocationOption | null;
  destination: LocationOption | null;
  depart: string | null;
  return: string | null;
  adults: number;
  children: number;
  infants: number;
  /** 유아를 무릎에 앉힐지(lap) 좌석을 따로 둘지(seat). 백엔드 infantsOnLap / infantsInSeat 중 하나로 보낸다. */
  infantSeat: "lap" | "seat";
  cabin: string;
};

const dateKey = (d: Date) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
const formatDate = (value: string) => value.slice(5).replace("-", ".");

function ConditionSearch({ notify }: { notify: (text: string) => void }) {
  const router = useRouter();
  const [state, setState] = useState<Condition>(() => ({
    trip: "round",
    origin: findLocation("AIRPORT", "ICN"),
    destination: findLocation("AIRPORT", "OKA"),
    depart: null,
    return: null,
    adults: 1,
    children: 0,
    infants: 0,
    infantSeat: "lap",
    cabin: "일반석",
  }));
  const [picker, setPicker] = useState<PickerType | null>(null);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const triggers = useRef<Partial<Record<PickerType, HTMLButtonElement | null>>>({});
  const panel = useRef<HTMLElement>(null);
  const closeTimer = useRef<number>(undefined);
  const [panelPosition, setPanelPosition] = useState<{ left: number; top: number }>();

  /** 닫힘 애니메이션(180ms) 뒤에 피커를 내리고 누른 칸으로 포커스를 돌려준다. */
  function closePicker() {
    if (!picker) return;
    const finish = () => {
      triggers.current[picker]?.focus();
      setPicker(null);
      setClosing(false);
    };
    if (prefersReducedMotion()) return finish();
    setClosing(true);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(finish, 180);
  }

  function openPicker(type: PickerType) {
    window.clearTimeout(closeTimer.current);
    setClosing(false);
    setPicker(type);
  }

  // 누른 칸 바로 아래에 붙인다. 일정은 출발지 칸 왼쪽에 맞춘다(시안).
  useLayoutEffect(() => {
    if (!picker) return;
    function place() {
      const trigger = triggers.current[picker!]?.getBoundingClientRect();
      const anchor = triggers.current[picker === "dates" ? "origin" : picker!]?.getBoundingClientRect();
      const parent = panel.current?.offsetParent?.getBoundingClientRect();
      if (!trigger || !anchor || !parent) return;
      const width = Math.min(PICKER_WIDTHS[picker!], window.innerWidth - 24);
      const left = Math.max(12, Math.min(anchor.left - 40, window.innerWidth - width - 12));
      setPanelPosition({ left: left - parent.left, top: trigger.bottom - 12 - parent.top });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [picker]);

  function update(patch: Partial<Condition>) {
    setState((current) => ({ ...current, ...patch }));
    setError("");
  }

  // 바깥 클릭·Escape로 닫고, Tab 포커스는 피커 안에 가둔다.
  const closeRef = useRef(closePicker);
  useEffect(() => {
    closeRef.current = closePicker;
  });
  useEffect(() => {
    if (!picker) return;
    panel.current?.querySelector<HTMLElement>("input,button:not(.picker-close)")?.focus();

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Element;
      if (!panel.current?.contains(target) && !target.closest(".condition-field")) closeRef.current();
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = [...panel.current.querySelectorAll<HTMLElement>("button:not([disabled]),input:not([disabled]),select:not([disabled])")].filter(
        (element) => element.getClientRects().length,
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [picker]);

  const { origin, destination } = state;
  const oneway = state.trip === "oneway";

  const datesText = state.depart
    ? oneway
      ? formatDate(state.depart)
      : `${formatDate(state.depart)} - ${state.return ? formatDate(state.return) : "귀국일 선택"}`
    : oneway
      ? "출발일을 선택해 주세요"
      : "출발일과 귀국일을 선택해 주세요";

  const passengersText = [
    `성인 ${state.adults}명`,
    state.children && `소아 ${state.children}명`,
    state.infants && `유아(${state.infantSeat === "lap" ? "무릎" : "좌석"}) ${state.infants}명`,
    state.cabin,
  ]
    .filter(Boolean)
    .join(", ");

  // 기존 항공권 조회 화면(왕복 단계별 / 편도)으로 조건을 넘겨 바로 검색한다.
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!origin || !destination) {
      setError("출발지와 목적지를 선택해 주세요.");
      openPicker(origin ? "destination" : "origin");
      return;
    }
    if (cityName(origin) === cityName(destination)) {
      setError("출발지와 목적지는 다른 도시여야 합니다.");
      return;
    }
    if (!state.depart || (!oneway && !state.return)) {
      setError("여행 일정을 선택해 주세요.");
      openPicker("dates");
      return;
    }
    const lap = state.infantSeat === "lap";
    const request = {
      origin: origin.airportCodes,
      destination: destination.airportCodes,
      outboundDate: state.depart,
      ...(oneway ? {} : { returnDate: state.return! }),
      adults: state.adults,
      children: state.children,
      infantsInSeat: lap ? 0 : state.infants,
      infantsOnLap: lap ? state.infants : 0,
      travelClass: (CABINS.indexOf(state.cabin) + 1) as TravelClass,
    };
    const query = toSearchQuery(request, { origin, destination });
    router.push(`${oneway ? "/flights/one-way" : "/flights/round-trip/step"}?${query}`);
  }

  const field = (type: PickerType, label: string, value: string) => (
    <button
      ref={(element) => {
        triggers.current[type] = element;
      }}
      className="condition-field"
      type="button"
      aria-haspopup="dialog"
      aria-controls="picker-panel"
      aria-expanded={picker === type}
      onClick={() => (picker === type ? closePicker() : openPicker(type))}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );

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
          {field("passengers", "탑승객", passengersText)}
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

      {/* 히어로(isolation)와 고정 배경 위 본문(z-index:3)에 가리지 않도록 시안처럼 히어로 밖(.main-page 바로 아래)에 띄운다. */}
      {picker &&
        createPortal(
          <section
            ref={panel}
            className={`picker-panel ${PICKER_CLASSES[picker]}${closing ? " is-closing" : ""}`}
            style={panelPosition}
            id="picker-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby="picker-title"
          >
            <header className="picker-header">
              <h2 id="picker-title">{PICKER_TITLES[picker]}</h2>
              <button className="picker-close" type="button" aria-label="닫기" onClick={closePicker}>
                ×
              </button>
            </header>
            <div className="picker-body">
              {(picker === "origin" || picker === "destination") && (
                <LocationPicker
                  label={PICKER_TITLES[picker]}
                  onSelect={(option) => {
                    const other = picker === "origin" ? destination : origin;
                    if (other && cityName(other) === cityName(option)) {
                      notify("출발지와 목적지는 다른 도시여야 합니다.");
                      return;
                    }
                    update(picker === "origin" ? { origin: option } : { destination: option });
                    closePicker();
                  }}
                />
              )}
              {picker === "dates" && <DatePicker state={state} update={update} onDone={closePicker} />}
              {picker === "passengers" && <PassengerPicker state={state} update={update} onDone={closePicker} />}
            </div>
          </section>,
          document.querySelector(".main-page")!,
        )}
    </>
  );
}

function LocationPicker({ label, onSelect }: { label: string; onSelect: (option: LocationOption) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const regions = LOCATION_REGIONS.map((region) => ({
    ...region,
    chips: region.chips.filter(({ label: text, option }) =>
      [text, region.label, option.code, option.nameKo, option.cityNameKo ?? "", option.countryNameKo].some((value) => value.toLowerCase().includes(q)),
    ),
  })).filter((region) => region.chips.length);
  // 칩에 없는 시드 도시(방콕 등)도 검색으로 고를 수 있게 기존 검색 결과로 대신한다.
  const fallback = q && !regions.length ? searchLocations(query) : [];
  const chip = (text: string, option: LocationOption) => (
    <button key={`${option.type}-${option.code}`} className="origin-chip" type="button" aria-label={`${text} (${option.code})`} onClick={() => onSelect(option)}>
      {text}
    </button>
  );

  return (
    <>
      <div className="origin-search-wrap">
        <label className="sr-only" htmlFor="airport-query">{label} 검색</label>
        <div className="origin-search">
          <span className="search-glyph" aria-hidden="true" />
          <input id="airport-query" autoComplete="off" placeholder={`${label}를 검색해 주세요.`} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>
      <div className="origin-regions" aria-live="polite">
        {regions.map((region) => (
          <section key={region.label} className="origin-region" aria-label={region.label}>
            <h3>
              <Img className="origin-flag" name={region.flag} />
              {region.label}
            </h3>
            <div className="origin-chips">{region.chips.map(({ label, option }) => chip(label, option))}</div>
          </section>
        ))}
        {fallback.length > 0 && (
          <section className="origin-region" aria-label="검색 결과">
            <h3>검색 결과</h3>
            <div className="origin-chips">{fallback.map((option) => chip(option.type === "CITY" ? option.nameKo : `${option.cityNameKo} ${option.nameKo}`, option))}</div>
          </section>
        )}
        {!regions.length && !fallback.length && <p className="picker-empty">검색 결과가 없습니다.</p>}
      </div>
    </>
  );
}

type PickerProps = { state: Condition; update: (patch: Partial<Condition>) => void; onDone: () => void };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const ROW_HEIGHT = 46;
const ROW_GAP = 10;

/** Figma Calendar(362 × 471). 왕복이면 출발~귀국을 주 단위 띠로 칠한다(시안 calendarMonthMarkup). */
function DatePicker({ state, update, onDone }: PickerProps) {
  const [month, setMonth] = useState(() => {
    const base = state.depart ? new Date(`${state.depart}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const rows = Math.max(5, Math.ceil((firstDay + days) / 7));
  const gridHeight = rows * ROW_HEIGHT + (rows - 1) * ROW_GAP;
  const oneway = state.trip === "oneway";
  const phase = oneway || !state.depart || state.return ? "출발일을 선택해 주세요" : "귀국일을 선택해 주세요";
  const prevDisabled = year === today.getFullYear() && monthIndex === today.getMonth();
  const complete = !!state.depart && (oneway || !!state.return);
  const range = !oneway && state.depart && state.return ? { start: state.depart, end: state.return } : null;
  // 하루 차이(토요일 출발 제외)는 띠 대신 두 동그라미를 반씩 잇는다.
  const departDate = range ? new Date(`${range.start}T00:00:00`) : null;
  const adjacent = !!departDate && departDate.getDay() !== 6 && dateKey(new Date(departDate.getFullYear(), departDate.getMonth(), departDate.getDate() + 1)) === range!.end;

  function pick(key: string) {
    if (oneway || !state.depart || state.return || key <= state.depart) update({ depart: key, return: null });
    else update({ return: key });
  }

  const cells: ReactNode[] = Array.from({ length: firstDay }, (_, i) => <span key={`lead-${i}`} className="calendar-empty" aria-hidden="true" />);
  for (let day = 1; day <= days; day++) {
    const date = new Date(year, monthIndex, day);
    const key = dateKey(date);
    const start = key === state.depart;
    const end = !!range && key === range.end;
    const fill = !!range && !adjacent && key >= range.start && key <= range.end;
    const classes = [
      "calendar-day",
      (start || end) && "selected",
      start && "range-start",
      end && "range-end",
      range && key > range.start && key < range.end && "between",
      fill && "range-week",
      fill && (start || date.getDay() === 0 || day === 1) && "range-row-start",
      fill && (end || date.getDay() === 6 || day === days) && "range-row-end",
      adjacent && (start || end) && "adjacent-range",
    ].filter(Boolean);
    cells.push(
      <button
        key={key}
        type="button"
        className={classes.join(" ")}
        // 백엔드가 @Future라 오늘은 고를 수 없다.
        disabled={date <= today}
        aria-label={`${year}년 ${monthIndex + 1}월 ${day}일`}
        aria-pressed={start || end}
        onClick={() => pick(key)}
      >
        <span>{day}</span>
      </button>,
    );
  }
  while (cells.length < rows * 7) cells.push(<span key={`tail-${cells.length}`} className="calendar-empty" aria-hidden="true" />);

  return (
    <>
      {/* 패널 높이(--calendar-grid-height)가 이 달의 주 수를 따른다. */}
      <div className="calendar" ref={(element) => element?.closest<HTMLElement>(".picker-panel")?.style.setProperty("--calendar-grid-height", `${gridHeight}px`)}>
        <div className="calendar-top">
          <button type="button" aria-label="이전 달" disabled={prevDisabled} onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}>
            <Img name="imgChevronLeftIcon.svg" />
          </button>
          <strong aria-live="polite">
            {year}년 {monthIndex + 1}월
          </strong>
          <button type="button" aria-label="다음 달" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}>
            <Img name="imgChevronRightIcon.svg" />
          </button>
        </div>
        <p className="calendar-phase" aria-live="polite">
          {phase}
        </p>
        <div className="calendar-weekdays" aria-hidden="true">
          {WEEKDAYS.map((day, i) => (
            <b key={day} className={i === 0 ? "sunday" : i === 6 ? "saturday" : undefined}>
              {day}
            </b>
          ))}
        </div>
        <div className="calendar-viewport">
          <div className="calendar-track">
            <section className="calendar-slide" style={{ "--slide-grid-height": `${gridHeight}px` } as CSSProperties} aria-label={`${year}년 ${monthIndex + 1}월`}>
              <div className="calendar-grid">{cells}</div>
            </section>
          </div>
        </div>
      </div>
      <button className="picker-done calendar-done" type="button" disabled={!complete} onClick={onDone}>
        선택하기
      </button>
    </>
  );
}

function PassengerPicker({ state, update, onDone }: PickerProps) {
  const total = state.adults + state.children + state.infants;

  function step(key: PassengerKey, delta: 1 | -1) {
    const next = state[key] + delta;
    const min = key === "adults" ? 1 : 0;
    // 최대 9명. 무릎 유아는 성인 1명당 1명까지라 성인 수를 넘을 수 없다.
    if (next < min || next > 9 || (delta > 0 && total >= 9)) return;
    const lap = state.infantSeat === "lap";
    if (lap && ((key === "infants" && next > state.adults) || (key === "adults" && next < state.infants))) return;
    update({ [key]: next } as Partial<Condition>);
  }

  return (
    <>
      <div className="passenger-controls">
        <div className="passenger-list">
          {PASSENGER_ROWS.map(({ key, label, description, min }) => (
            <div className="passenger-row" key={key}>
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              {/* +/- 기호는 CSS(data-step)로 그린다. */}
              <div className="counter">
                <button type="button" data-step="-1" aria-label={`${label} 줄이기`} disabled={state[key] === min} onClick={() => step(key, -1)} />
                <output aria-label={`${label} ${state[key]}명`}>{state[key]}</output>
                <button type="button" data-step="1" aria-label={`${label} 늘리기`} onClick={() => step(key, 1)} />
              </div>
            </div>
          ))}
        </div>
        {state.infants > 0 && (
          <div className="infant-types" role="radiogroup" aria-label="유아 좌석">
            {(
              [
                ["lap", "무릎에 앉혀요"],
                ["seat", "좌석을 따로 둬요"],
              ] as const
            ).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="infant-seat"
                  value={value}
                  checked={state.infantSeat === value}
                  // 무릎으로 바꾸면 유아 수를 성인 수에 맞춘다.
                  onChange={() => update(value === "lap" ? { infantSeat: value, infants: Math.min(state.infants, state.adults) } : { infantSeat: value })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        )}
        <fieldset className="cabin-options">
          <legend className="sr-only">좌석 등급</legend>
          {CABINS.map((cabin) => (
            <label key={cabin}>
              <input type="radio" name="cabin-class" value={cabin} checked={state.cabin === cabin} onChange={() => update({ cabin })} />
              <span>{cabin}</span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className="passenger-action">
        <button className="picker-done" type="button" onClick={onDone}>
          선택하기
        </button>
      </div>
    </>
  );
}
