"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { cityName } from "@/components/flight/search-condition-fields";
import { Img, prefersReducedMotion } from "@/components/main/main-ui";
import { toSearchQuery, type InitialSearch } from "@/lib/flight-search-params";
import type { LocationOption, OneWaySearchRequest, TravelClass } from "@/lib/flight-types";
import { findLocation, searchLocations } from "@/lib/locations";

// 메인 조건 검색(search-panel)에서 옮겼다. 선택기 스타일은 src/app/condition-picker.css(.main-page·.flight-page 공용).

export type InitialCondition = InitialSearch<OneWaySearchRequest & { returnDate?: string }>;

const CABINS = ["일반석", "프리미엄 일반석", "비즈니스석", "일등석"];

const PASSENGER_ROWS = [
  { key: "adults", label: "성인", description: "만 12세 이상", min: 1 },
  { key: "children", label: "소아", description: "만 2세~11세", min: 0 },
  { key: "infants", label: "유아", description: "만 2세 미만", min: 0 },
] as const;

const PICKER_TITLES = { origin: "출발지", destination: "도착지", dates: "일정 선택", passengers: "탑승객 및 좌석" };
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
  // 1105 시안에서 추가된 지역. 시드에 없는 뭄바이·벵갈루루·고아·페낭·랑카위·파타야는 뺐다.
  { label: "싱가포르", flag: "flag-singapore.webp", chips: [["싱가포르", "AIRPORT", "SIN"]] },
  { label: "홍콩", flag: "flag-hong-kong.webp", chips: [["홍콩", "AIRPORT", "HKG"]] },
  { label: "인도", flag: "flag-india.webp", chips: [["뉴델리", "AIRPORT", "DEL"]] },
  { label: "말레이시아", flag: "flag-malaysia.webp", chips: [["쿠알라룸푸르", "AIRPORT", "KUL"], ["코타키나발루", "AIRPORT", "BKI"]] },
  { label: "태국", flag: "flag-thailand.webp", chips: [["방콕", "CITY", "BKK"], ["푸껫", "AIRPORT", "HKT"], ["치앙마이", "AIRPORT", "CNX"]] },
].map(({ chips, ...region }) => ({
  ...region,
  chips: (chips as [string, LocationOption["type"], string][]).map(([label, type, code]) => ({ label, option: findLocation(type, code)! })),
}));

type PickerType = keyof typeof PICKER_TITLES;
type PassengerKey = (typeof PASSENGER_ROWS)[number]["key"];

export type Condition = {
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

/** 항공권 목록에서 넘어온 조건 → 조건 검색 칸. 유아는 좌석이 하나라도 있으면 좌석, 아니면 무릎으로 본다. */
export function conditionFrom({ request, locations }: InitialCondition): Condition {
  return {
    trip: request.returnDate ? "round" : "oneway",
    origin: locations.origin,
    destination: locations.destination,
    depart: request.outboundDate,
    return: request.returnDate ?? null,
    adults: request.adults,
    children: request.children,
    infants: request.infantsInSeat + request.infantsOnLap,
    infantSeat: request.infantsInSeat > 0 ? "seat" : "lap",
    cabin: CABINS[request.travelClass - 1] ?? CABINS[0],
  };
}

/**
 * 조건 검색 칸(출발지·목적지·일정·탑승객)과 칸 아래에 뜨는 선택기, 검사·목록 이동을 한데 묶은 훅.
 * 메인 조건 검색과 항공권 목록의 조건 수정 서랍이 같이 쓴다. 칸 배치는 쓰는 쪽이 field()로 그린다.
 * portal: 선택기를 붙일 요소의 선택자(메인은 .main-page, 목록은 .flight-page).
 */
export function useConditionForm(
  initial: InitialCondition | null | undefined,
  {
    notify,
    portal,
    dateAnchor = "origin",
  }: {
    notify: (text: string) => void;
    portal: string;
    /** 일정 선택기를 맞출 칸. 메인은 출발지 칸 왼쪽(시안), 목록 서랍은 일정 칸 자신. */
    dateAnchor?: "origin" | "dates";
  },
) {
  const router = useRouter();
  const [state, setState] = useState<Condition>(() =>
    initial
      ? conditionFrom(initial)
      : {
          trip: "round",
          origin: findLocation("AIRPORT", "ICN"),
          destination: null,
          depart: null,
          return: null,
          adults: 1,
          children: 0,
          infants: 0,
          infantSeat: "lap",
          cabin: "일반석",
        },
  );
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
      const anchor = triggers.current[picker === "dates" ? dateAnchor : picker!]?.getBoundingClientRect();
      const parent = panel.current?.offsetParent?.getBoundingClientRect();
      if (!trigger || !anchor || !parent) return;
      const width = Math.min(PICKER_WIDTHS[picker!], window.innerWidth - 24);
      const left = Math.max(12, Math.min(anchor.left - 40, window.innerWidth - width - 12));
      setPanelPosition({ left: left - parent.left, top: trigger.bottom - 12 - parent.top });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [picker, dateAnchor]);

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
    // 패널 위치를 잡기 전에 포커스가 가면 브라우저가 그쪽으로 페이지를 스크롤한다(1,000px 넘게 튐). 스크롤은 막는다.
    panel.current?.querySelector<HTMLElement>("input,button:not(.picker-close)")?.focus({ preventScroll: true });

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Element;
      if (!panel.current?.contains(target) && !target.closest("[data-picker-trigger]")) closeRef.current();
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

  /** 칸 버튼에 붙이는 속성(선택기 열기·닫기, 위치 기준). 메인 칸(field)과 목록 서랍 칸이 같이 쓴다. */
  const triggerProps = (type: PickerType) => ({
    ref: (element: HTMLButtonElement | null) => {
      triggers.current[type] = element;
    },
    type: "button" as const,
    "data-picker-trigger": type,
    "aria-haspopup": "dialog" as const,
    "aria-controls": "picker-panel",
    "aria-expanded": picker === type,
    onClick: () => (picker === type ? closePicker() : openPicker(type)),
  });

  const field = (type: PickerType, label: string, value: string) => (
    <button className="condition-field" {...triggerProps(type)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );

  // 히어로(isolation)와 고정 배경 위 본문(z-index:3)에 가리지 않도록 시안처럼 히어로 밖(portal 요소 바로 아래)에 띄운다.
  const pickerPanel =
    picker &&
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
      document.querySelector(portal)!,
    );

  return { state, update, error, setError, picker, closePicker, field, triggerProps, pickerPanel, submit, datesText, passengersText, reset: setState };
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
          <Img className="search-icon-image" name="search.svg" />
          <input id="airport-query" autoComplete="off" placeholder={`${label}를 검색해 주세요.`} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>
      <div className="origin-regions" aria-live="polite">
        {regions.map((region) => (
          <section key={region.label} className="origin-region" aria-label={region.label}>
            <h3>
              <span className="origin-flag">
                <Img name={region.flag} />
              </span>
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
