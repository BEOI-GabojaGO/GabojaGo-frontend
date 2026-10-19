"use client";

/* eslint-disable @next/next/no-img-element -- 디자인 원본 아이콘과 SerpApi 항공사 로고를 그대로 쓴다. */
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { cityName, TRAVEL_CLASS_OPTIONS } from "@/components/flight/search-condition-fields";
import { loginHref } from "@/lib/auth-client";
import { formatMinutes, postJson, requestJson } from "@/lib/flight-client";
import type {
  FlightOption,
  FlightWishlistItem,
  FlightWishlistRequest,
  LocationOption,
  OneWaySearchRequest,
  SelectedLocations,
} from "@/lib/flight-types";

// 항공권 목록 디자인(가보자GO-항공권 목록-디자인) 조각. 스타일은 src/app/flights/flights.css.

type Leg = "outbound" | "inbound";
type Sort = "default" | "price" | "depart" | "duration";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "default", label: "추천순" },
  { value: "price", label: "가격 낮은순" },
  { value: "depart", label: "출발 시간순" },
  { value: "duration", label: "소요 시간순" },
];

const TIME_SLOTS = [0, 4, 8, 12, 16, 20].map((start) => ({
  start,
  label: `${String(start).padStart(2, "0")}시 - ${String(start + 4).padStart(2, "0")}시`,
}));

const FLAGS: Record<string, string> = { 대한민국: "flag-korea.png", 일본: "flag-japan.png", 중국: "flag-china.png" };

const departHour = (option: FlightOption) => {
  const time = option.segments[0]?.departure?.localTime;
  return time ? Number(time.slice(11, 13)) : null;
};

export const airlinesOf = (option: FlightOption) =>
  [...new Set(option.segments.map((segment) => segment.airline).filter((name): name is string => !!name))];

/** 검색 요청에서 위시리스트가 저장하는 인원·좌석 등급만 고른다. */
export function passengersOf(request: OneWaySearchRequest) {
  const { adults, children, infantsInSeat, infantsOnLap, travelClass } = request;
  return { adults, children, infantsInSeat, infantsOnLap, travelClass };
}

/* ---------- 필터·정렬 ---------- */

type FilterState = {
  /** 체크를 푼 항공사. 새로 나타난 항공사는 기본으로 체크된 상태가 된다. */
  excludedAirlines: string[];
  /** 고른 시간대 시작 시각. 비어 있으면 전체. */
  times: Record<Leg, number[]>;
};

const EMPTY_FILTER: FilterState = { excludedAirlines: [], times: { outbound: [], inbound: [] } };

/** 받은 목록을 브라우저에서 거르고 정렬한다. 다시 검색하지 않는다(SerpApi 쿼터). */
export function useFlightFilter() {
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [sort, setSort] = useState<Sort>("default");

  function apply(list: FlightOption[], leg: Leg) {
    const times = filter.times[leg];
    const filtered = list.filter((option) => {
      if (airlinesOf(option).some((name) => filter.excludedAirlines.includes(name))) return false;
      const hour = departHour(option);
      return !times.length || hour === null || times.some((start) => hour >= start && hour < start + 4);
    });
    if (sort === "default") return filtered;

    const key = (option: FlightOption) =>
      sort === "price" ? option.price : sort === "duration" ? option.totalDurationMinutes : option.segments[0]?.departure?.localTime;
    // 값이 없는 항목은 뒤로 보낸다.
    return filtered.toSorted((a, b) => {
      const x = key(a);
      const y = key(b);
      if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
      return x < y ? -1 : x > y ? 1 : 0;
    });
  }

  return { filter, setFilter, reset: () => setFilter(EMPTY_FILTER), sort, setSort, apply };
}

type FlightFilter = ReturnType<typeof useFlightFilter>;

function FilterGroups({
  value,
  onChange,
  airlines,
  legs,
  idPrefix,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  airlines: string[];
  legs: Leg[];
  idPrefix: string;
}) {
  const toggleAirline = (name: string) =>
    onChange({
      ...value,
      excludedAirlines: value.excludedAirlines.includes(name)
        ? value.excludedAirlines.filter((item) => item !== name)
        : [...value.excludedAirlines, name],
    });
  const toggleTime = (leg: Leg, start: number) => {
    const current = value.times[leg];
    const next = current.includes(start) ? current.filter((item) => item !== start) : [...current, start];
    onChange({ ...value, times: { ...value.times, [leg]: next } });
  };

  return (
    <div className="filter-groups">
      <section className="filter-group">
        <h3>항공사</h3>
        <div className="check-list">
          {airlines.length === 0 && <p className="filter-empty">항공사 정보가 없습니다.</p>}
          {airlines.map((name) => (
            <label className="check-row" key={name} htmlFor={`${idPrefix}-airline-${name}`}>
              <input
                id={`${idPrefix}-airline-${name}`}
                type="checkbox"
                checked={!value.excludedAirlines.includes(name)}
                onChange={() => toggleAirline(name)}
              />
              <span>{name}</span>
            </label>
          ))}
        </div>
      </section>
      {legs.map((leg) => (
        <section className="filter-group" key={leg}>
          <h3>{leg === "outbound" ? "가는편" : "오는편"} 출발 시간</h3>
          <div className="check-list">
            {TIME_SLOTS.map(({ start, label }) => (
              <label className="check-row" key={start} htmlFor={`${idPrefix}-${leg}-${start}`}>
                <input
                  id={`${idPrefix}-${leg}-${start}`}
                  type="checkbox"
                  checked={value.times[leg].includes(start)}
                  onChange={() => toggleTime(leg, start)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SortSelect({ filter, className = "" }: { filter: FlightFilter; className?: string }) {
  return (
    <label className={`sort-control ${className}`}>
      <span className="sr-only">정렬 기준</span>
      <select value={filter.sort} onChange={(event) => filter.setSort(event.target.value as Sort)}>
        {SORT_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** 태블릿·모바일 필터. 고르는 동안은 초안만 바꾸고 "적용하기"를 눌러야 반영한다(시안과 같음). */
function FilterDrawer({ filter, airlines, legs, onClose }: { filter: FlightFilter; airlines: string[]; legs: Leg[]; onClose: () => void }) {
  const [draft, setDraft] = useState(filter.filter);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="filter-panel" role="dialog" aria-modal="true" aria-labelledby="filter-title">
        <div className="filter-head">
          <h2 id="filter-title">필터</h2>
          <button className="close-filter" type="button" aria-label="필터 닫기" onClick={onClose}>
            ×
          </button>
        </div>
        <FilterGroups value={draft} onChange={setDraft} airlines={airlines} legs={legs} idPrefix="panel" />
        <div className="filter-actions">
          <button className="reset-button" type="button" onClick={() => setDraft(EMPTY_FILTER)}>
            초기화
          </button>
          <button
            className="apply-button"
            type="button"
            onClick={() => {
              filter.setFilter(draft);
              onClose();
            }}
          >
            적용하기
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------- 레이아웃 ---------- */

type QueryRequest = OneWaySearchRequest & { returnDate?: string };

const WEEKDAYS = "일월화수목금토";
const parseDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const shortDate = (value: string) => {
  const date = parseDate(value);
  return `${date.getMonth() + 1}.${date.getDate()}`;
};
const dayLabel = (value: string) => `${shortDate(value)} ${WEEKDAYS[parseDate(value).getDay()]}`;
const nightsBetween = (from: string, to: string) => Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
const placeLabel = (option: LocationOption) => `${cityName(option)}(${option.code})`;

function querySummary(request: QueryRequest) {
  const dates = request.returnDate
    ? `${dayLabel(request.outboundDate)} - ${dayLabel(request.returnDate)}`
    : dayLabel(request.outboundDate);
  const nights = request.returnDate ? nightsBetween(request.outboundDate, request.returnDate) : null;
  const people = [
    request.adults && `성인 ${request.adults}명`,
    request.children && `소아 ${request.children}명`,
    request.infantsInSeat + request.infantsOnLap && `유아 ${request.infantsInSeat + request.infantsOnLap}명`,
  ]
    .filter(Boolean)
    .join(", ");
  const travelClass = TRAVEL_CLASS_OPTIONS.find((option) => option.value === request.travelClass)?.label ?? "";
  return { dates, nights, people, travelClass };
}

/** 조건 바 + 필터 사이드바/드로어 + 결과 칸. 결과 칸 안의 내용은 children으로 받는다. */
export function FlightListLayout({
  request,
  locations,
  filter,
  airlines,
  legs,
  onEdit,
  children,
}: {
  request: QueryRequest;
  locations: SelectedLocations;
  filter: FlightFilter;
  airlines: string[];
  legs: Leg[];
  onEdit: () => void;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { dates, nights, people, travelClass } = querySummary(request);
  const route = `${placeLabel(locations.origin)} → ${placeLabel(locations.destination)}`;
  const trip = request.returnDate ? "왕복" : "편도";

  return (
    <>
      <section className="desktop-query-bar" aria-label="현재 검색 조건">
        <div className="query-inner">
          <span className="query-item query-route">
            <span className="search-icon" aria-hidden="true" />
            {route}
          </span>
          <span className="query-accent">{trip}</span>
          <span className="query-item">
            {dates}
            {nights !== null && ` (${nights}박 ${nights + 1}일)`}
          </span>
          <span className="query-item">{people}</span>
          <span className="query-accent">{travelClass}</span>
          <button className="edit-search" type="button" onClick={onEdit}>
            수정하기
          </button>
        </div>
      </section>

      <main className="page-layout">
        <button className="mobile-summary" type="button" aria-label="검색 조건 수정" onClick={onEdit}>
          <span className="summary-route">{route}</span>
          <span className="summary-badge">{trip}</span>
          <span className="summary-meta">
            {dates}&nbsp;&nbsp; {people}&nbsp;&nbsp; <em>{travelClass}</em>
          </span>
        </button>

        <aside className="desktop-filter" aria-label="항공권 필터">
          <div className="filter-top">
            <button className="reset-link" type="button" onClick={filter.reset}>
              필터 초기화
            </button>
          </div>
          <FilterGroups value={filter.filter} onChange={filter.setFilter} airlines={airlines} legs={legs} idPrefix="side" />
        </aside>

        <section className="results-column">
          <div className="compact-toolbar">
            <button className="filter-trigger" type="button" onClick={() => setDrawerOpen(true)}>
              필터
            </button>
            <SortSelect filter={filter} />
          </div>
          {children}
        </section>
      </main>

      {drawerOpen && <FilterDrawer filter={filter} airlines={airlines} legs={legs} onClose={() => setDrawerOpen(false)} />}
    </>
  );
}

function Place({ option }: { option: LocationOption }) {
  const flag = FLAGS[option.countryNameKo];
  return (
    <>
      {flag && <img className="flag" src={`/main/${flag}`} alt={option.countryNameKo} />}
      <span>{cityName(option)}</span>
      <span className="code">({option.code})</span>
    </>
  );
}

export function RouteHeading({ from, to, leg, filter }: { from: LocationOption; to: LocationOption; leg: string; filter: FlightFilter }) {
  return (
    <div className="results-heading">
      <h1 className="route-title">
        <Place option={from} />
        <span className="arrow">→</span>
        <Place option={to} />
        <span className="leg">{leg}</span>
      </h1>
      <SortSelect filter={filter} className="desktop-sort" />
    </div>
  );
}

/** 왕복 일정 띠. 출발일은 그대로 두고 박수만 바꿔 다시 검색한다(누를 때마다 SerpApi 1회). */
export function NightsStrip({
  outboundDate,
  returnDate,
  disabled,
  onPick,
}: {
  outboundDate: string;
  returnDate: string;
  disabled: boolean;
  onPick: (returnDate: string) => void;
}) {
  const current = nightsBetween(outboundDate, returnDate);
  // 화살표는 다시 검색하지 않고 보이는 박수 범위만 옮긴다.
  const [first, setFirst] = useState(Math.max(1, current - 3));
  const nights = Array.from({ length: 7 }, (_, index) => first + index);
  const back = (n: number) => {
    const date = parseDate(outboundDate);
    date.setDate(date.getDate() + n);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  };

  return (
    <>
      <nav className="date-strip" aria-label="여행 일정 바꾸기">
        <button className="date-arrow" type="button" aria-label="더 짧은 일정" disabled={first <= 1} onClick={() => setFirst(first - 1)}>
          ‹
        </button>
        <div className="date-options">
          {nights.map((n) => (
            <button
              key={n}
              className={`date-option${n === current ? " is-active" : ""}`}
              type="button"
              aria-current={n === current ? "true" : undefined}
              disabled={disabled || n === current}
              onClick={() => onPick(back(n))}
            >
              <strong>
                {n}박 {n + 1}일
              </strong>
              <span>
                {shortDate(outboundDate)} - {shortDate(back(n))}
              </span>
            </button>
          ))}
        </div>
        <button className="date-arrow" type="button" aria-label="더 긴 일정" onClick={() => setFirst(first + 1)}>
          ›
        </button>
      </nav>
      <p className="date-note">다른 일정을 누르면 새로 검색합니다.</p>
    </>
  );
}

/* ---------- 카드 ---------- */

export function FlightCard({
  option,
  priceSuffix,
  onSelect,
  disabled = false,
  chosen = false,
  heart,
}: {
  option: FlightOption;
  priceSuffix?: string;
  onSelect?: () => void;
  disabled?: boolean;
  chosen?: boolean;
  heart?: ReactNode;
}) {
  const first = option.segments[0];
  const last = option.segments[option.segments.length - 1];
  const airlines = airlinesOf(option).join(", ") || "항공사 정보 없음";
  const select = () => !disabled && onSelect?.();
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    select();
  };
  const interactive = onSelect
    ? { role: "button", tabIndex: 0, "aria-disabled": disabled || undefined, onClick: select, onKeyDown }
    : {};

  return (
    <article className={`flight-card${chosen ? " is-chosen" : ""}`} aria-label={`${airlines} ${first?.departure?.localTime ?? ""} 출발`} {...interactive}>
      <span className="airline">
        {option.airlineLogo && <img className="airline-logo" src={option.airlineLogo} alt="" />}
        <span className="airline-copy">
          <span className="airline-name">{airlines}</span>
          <small>{option.stops === 0 ? "직항" : `경유 ${option.stops}회`}</small>
        </span>
      </span>
      <span className="airport departure">
        <time>{first?.departure?.localTime?.slice(11) ?? "-"}</time>
        <span>{first?.departure?.code}</span>
      </span>
      <span className="journey">
        <span className="journey-visual">
          <img src="/flight/airplane.svg" alt="" />
        </span>
      </span>
      <span className="airport arrival">
        <time>{last?.arrival?.localTime?.slice(11) ?? "-"}</time>
        <span>{last?.arrival?.code}</span>
      </span>
      <span className="price">
        <strong>{option.price == null ? "가격 정보 없음" : `${option.price.toLocaleString("ko-KR")} 원`}</strong>
        {priceSuffix && option.price != null && <small>{priceSuffix}</small>}
      </span>
      {heart}
      <span className="duration">{formatMinutes(option.totalDurationMinutes)}</span>
    </article>
  );
}

/**
 * 카드 하트. 왕복은 선택한 가는편 + 이 오는편 한 쌍, 편도는 이 항공편을 담는다.
 * ponytail: 담긴 상태는 카드가 다시 그려지면 잊는다(목록을 다시 열면 빈 하트). 위시리스트 목록과 대조가 필요하면
 * GET /api/v1/users/me/flight-wishlists 응답을 편명·시각으로 맞춰 보는 방식으로 추가.
 */
export function FlightHeart({
  request,
  notify,
}: {
  request: Omit<FlightWishlistRequest, "price"> & { price: number | null };
  notify: (message: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  /** 담은 항목 id. 다른 곳에서 이미 담겨 id를 모르면 "duplicate". */
  const [saved, setSaved] = useState<number | "duplicate" | null>(null);
  const [pending, setPending] = useState(false);
  const { price } = request;

  async function toggle() {
    if (price == null) {
      notify("가격 정보가 없어 담을 수 없어요.");
      return;
    }
    if (saved === "duplicate") {
      notify("이미 담긴 항공권이에요. 위시리스트 화면에서 뺄 수 있어요.");
      return;
    }

    setPending(true);
    const result =
      saved === null
        ? await postJson<FlightWishlistItem>("/api/v1/users/me/flight-wishlists", { ...request, price } satisfies FlightWishlistRequest)
        : await requestJson<void>(`/api/v1/users/me/flight-wishlists/${saved}`, { method: "DELETE" });
    setPending(false);

    if (result.ok || (saved !== null && result.status === 404)) {
      // 404는 이미 지워진 항목이라 성공과 같이 처리한다(위시리스트 화면과 같은 규칙).
      setSaved(saved === null && result.ok ? (result.data as FlightWishlistItem).wishlistId : null);
      notify(saved === null ? "위시리스트에 담았어요." : "위시리스트에서 뺐어요.");
    } else if (result.status === 401) {
      notify("로그인이 필요해요. 로그인 화면으로 이동합니다.");
      router.push(loginHref(pathname));
    } else if (result.code === "DUPLICATE_WISHLIST") {
      setSaved("duplicate");
      notify("이미 위시리스트에 담긴 항공권이에요.");
    } else {
      notify(result.message);
    }
  }

  const on = saved !== null;
  return (
    <button
      className="heart-button"
      type="button"
      aria-label={on ? "위시리스트에서 빼기" : "위시리스트에 담기"}
      aria-pressed={on}
      disabled={pending}
      onClick={(event) => {
        event.stopPropagation();
        void toggle();
      }}
    >
      <img src={on ? "/flight/heart-fill.svg" : "/flight/heart-stroke.svg"} alt="" />
    </button>
  );
}

/** 오류 문구. 검색 세션이 만료됐으면 처음부터 다시 검색하는 버튼을 함께 보여 준다. */
export function ListAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <p className="alert" role="alert">
      {message}
      {onRetry && (
        <button type="button" onClick={onRetry}>
          다시 검색하기
        </button>
      )}
    </p>
  );
}
