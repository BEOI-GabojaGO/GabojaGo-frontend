"use client";

/* eslint-disable @next/next/no-img-element -- 시안 아이콘·광고 이미지와 SerpApi 항공사 로고를 그대로 쓴다. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, useSyncExternalStore } from "react";
import { optionKey, useItinerary } from "@/components/flight/booking-options-panel";
import { airlinesOf, FLAGS, querySummary, SortMenu } from "@/components/flight/flight-list-ui";
import { cityName } from "@/components/flight/search-condition-fields";
import { useToast } from "@/components/main/main-ui";
import { SiteLoader } from "@/components/site-loader";
import { formatMinutes, formatPrice } from "@/lib/flight-client";
import { toSearchQuery } from "@/lib/flight-search-params";
import type { BookingOption, FlightOption, OneWaySearchRequest, SelectedLocations } from "@/lib/flight-types";

/** 예약하기 화면으로 넘기는 선택. 왕복은 한 쌍, 편도는 가는편만. */
export type BookingSelection = {
  searchId: string;
  outboundId: string;
  /** 왕복 조합의 returnId. 편도는 없다. */
  returnId?: string;
  outbound: FlightOption;
  inbound?: FlightOption;
  request: OneWaySearchRequest & { returnDate?: string };
  locations: SelectedLocations;
};

const KEY = "gabojago.booking";

/** 탭 단위로 넘긴다. 저장할 수 없으면 false(호출한 쪽이 안내). */
export function saveBooking(selection: BookingSelection) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(selection));
    return true;
  } catch {
    return false;
  }
}

function readBooking() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// 이 화면에서는 저장값이 바뀌지 않으므로 구독할 것이 없다.
const noSubscribe = () => () => {};

/** /flights/booking: 시안 예약하기(판매처 목록 + 여정 사이드바 + 광고). */
export function BookingView() {
  // 저장소는 브라우저에만 있다. 서버·하이드레이션 중에는 undefined(아직 읽기 전).
  const raw = useSyncExternalStore(noSubscribe, readBooking, () => undefined);
  const selection = useMemo(() => {
    if (raw === undefined) return undefined;
    try {
      return raw ? (JSON.parse(raw) as BookingSelection) : null;
    } catch {
      return null;
    }
  }, [raw]);

  if (selection === undefined) return null;
  if (!selection) {
    return (
      <main className="booking-layout booking-empty">
        <section className="offers-section">
          <h1>예약할 항공권 정보가 없어요</h1>
          <p className="booking-notice">
            새로고침했거나 다른 탭에서 열면 선택 정보가 사라져요. 항공권을 다시 골라 주세요. <Link href="/">메인으로</Link>
          </p>
        </section>
      </main>
    );
  }
  return <Booking selection={selection} />;
}

type Sort = "low" | "high" | "name";
const SORTS: { value: Sort; label: string }[] = [
  { value: "low", label: "저렴한 가격순" },
  { value: "high", label: "높은 가격순" },
  { value: "name", label: "판매처 이름순" },
];

/** 가격 없는 판매처는 정렬 방향과 관계없이 뒤로 보낸다. */
function sortOptions(options: BookingOption[], sort: Sort) {
  if (sort === "name") return options.toSorted((a, b) => (a.sellerName ?? "").localeCompare(b.sellerName ?? "", "ko"));
  return options.toSorted((a, b) => {
    if (a.price == null || b.price == null) return a.price == null ? (b.price == null ? 0 : 1) : -1;
    return sort === "low" ? a.price - b.price : b.price - a.price;
  });
}

const LEG_BADGE: Record<BookingOption["leg"], string> = { TOGETHER: "왕복권", DEPARTING: "가는편", RETURNING: "오는편" };

function Booking({ selection }: { selection: BookingSelection }) {
  const router = useRouter();
  const { searchId, outboundId, returnId, outbound, inbound, request, locations } = selection;
  const { itinerary, error, expired, pendingKey, bookingError, book } = useItinerary({ searchId, outboundId, returnId });
  const [sort, setSort] = useState<Sort>("low");
  const { notify, toast } = useToast();
  const { people, travelClass } = querySummary(request);
  const flag = FLAGS[locations.destination.countryNameKo];
  const options = itinerary ? sortOptions(itinerary.bookingOptions, sort) : [];
  const research = () =>
    router.push(`${request.returnDate ? "/flights/round-trip/step" : "/flights/one-way"}?${toSearchQuery(request, locations)}`);

  return (
    <>
      <main className="booking-layout">
        <section className="offers-section" aria-labelledby="booking-title">
          <div className="section-toolbar">
            <h1 id="booking-title">예약하기</h1>
            <SortMenu options={SORTS} value={sort} onChange={setSort} />
          </div>

          {error && (
            <p className="booking-notice is-error" role="alert">
              {error}
              {expired && (
                <button type="button" onClick={research}>
                  같은 조건으로 다시 검색
                </button>
              )}
            </p>
          )}
          {bookingError && (
            <p className="booking-notice is-error" role="alert">
              {bookingError}
            </p>
          )}
          {/* 시안에는 없지만 왕복을 따로 발권하면 한쪽 지연·결항 때 보호받지 못할 수 있어 알린다. */}
          {itinerary?.separateTickets && returnId && (
            <p className="booking-notice">가는편과 오는편을 따로 발권하는 여정이에요. 한쪽이 지연·결항돼도 다른 쪽은 보호받지 못할 수 있어요.</p>
          )}
          {itinerary && options.length === 0 && <p className="booking-notice">예약 가능한 판매처가 없어요.</p>}

          <div className="offer-list" aria-live="polite">
            {options.map((option) => (
              <OfferCard key={optionKey(option)} option={option} oneWay={!returnId} pending={pendingKey} onBook={() => void book(option)} />
            ))}
          </div>
        </section>

        <aside className="trip-sidebar" aria-label="선택한 항공 일정">
          <div className="itinerary-panel">
            <div className="trip-summary">
              {flag && (
                <span className="flag">
                  <img src={`/main/${flag}`} alt={locations.destination.countryNameKo} />
                </span>
              )}
              <strong>{cityName(locations.destination)}</strong>
              <span>{people}</span>
              <i>·</i>
              <span>{inbound ? "왕복" : "편도"}</span>
              <i>·</i>
              <span>{travelClass}</span>
            </div>
            <div className="flight-list">
              <LegCard label="가는편" leg={outbound} />
              {inbound && <LegCard label="오는편" leg={inbound} />}
            </div>
          </div>

          {/* 광고는 시안 목업(API 미연결). */}
          <section className="ad-section" aria-labelledby="ad-title">
            <h2 id="ad-title">광고</h2>
            {[
              ["/booking/ad-japan.png", "일본 여행 특가"],
              ["/booking/ad-southeast-asia.png", "동남아 여행 특가"],
            ].map(([src, alt]) => (
              <a
                key={src}
                href="#"
                aria-label={`${alt} 확인`}
                onClick={(event) => {
                  event.preventDefault();
                  notify("프로모션 페이지는 현재 준비 중입니다.");
                }}
              >
                <img src={src} alt={alt} />
              </a>
            ))}
          </section>
        </aside>
      </main>
      {!itinerary && !error && <SiteLoader busy label="판매처를 찾는 중" />}
      {toast}
    </>
  );
}

/** 판매처 카드. 판매처 로고 API가 없어 이름 첫 글자로 대신한다. 혜택은 API의 extensions → baggagePrices 순(시안 문구는 목업). */
function OfferCard({ option, oneWay, pending, onBook }: { option: BookingOption; oneWay: boolean; pending: string; onBook: () => void }) {
  const name = option.sellerName ?? "판매처 정보 없음";
  const benefits = [
    ...option.extensions.map((text) => ({ text, icon: "/booking/service.svg" })),
    ...option.baggagePrices.map((text) => ({ text, icon: "/booking/baggage.svg" })),
  ].slice(0, 2);
  const key = optionKey(option);
  return (
    <article className="offer-card">
      <div className="provider-info">
        <div className="provider-title">
          <span className="provider-logo provider-initial" aria-hidden="true">
            {name.slice(0, 1)}
          </span>
          <h2>{name}</h2>
          <span className="round-badge">{oneWay && option.leg === "TOGETHER" ? "편도" : LEG_BADGE[option.leg]}</span>
        </div>
        {benefits.length > 0 && (
          <div className="provider-benefits">
            {benefits.map(({ text, icon }, index) => (
              <Fragment key={text}>
                {index > 0 && <span className="benefit-divider" aria-hidden="true" />}
                <span className="benefit-item">
                  <img src={icon} alt="" />
                  {text}
                </span>
              </Fragment>
            ))}
          </div>
        )}
      </div>
      <div className="offer-action">
        <strong className="price">{formatPrice(option.price)}</strong>
        {option.bookable ? (
          <button className="book-button" type="button" onClick={onBook} disabled={pending !== ""}>
            {pending === key ? "이동 중..." : "예약하기"}
          </button>
        ) : (
          <span className="phone-booking">
            전화 예약{option.bookingPhone && ` ${option.bookingPhone}`}
            {option.estimatedPhoneServiceFee != null && ` (수수료 ${formatPrice(option.estimatedPhoneServiceFee)})`}
          </span>
        )}
      </div>
    </article>
  );
}

const WEEKDAYS = "일월화수목금토";
/** 시안 표기: "2026년 10월 12일 (월)" */
function longDate(localTime: string | null | undefined) {
  if (!localTime) return "";
  const [y, m, d] = localTime.slice(0, 10).split("-").map(Number);
  return `${y}년 ${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

/** 사이드바 편 카드. 펼치면 구간별 편명·공항·기종과 경유 대기 시간을 보여 준다(시안의 한 줄 설명은 목업). */
function LegCard({ label, leg }: { label: string; leg: FlightOption }) {
  const [open, setOpen] = useState(false);
  const first = leg.segments[0];
  const last = leg.segments.at(-1);
  const airline = airlinesOf(leg).join(", ") || "항공사 정보 없음";
  const logo = leg.airlineLogo ?? first?.airlineLogo;
  const detailsId = `leg-details-${leg.id}`;
  return (
    <article className="flight-card">
      <div className="flight-heading">
        <h2>{label}</h2>
        <time dateTime={first?.departure?.localTime?.slice(0, 10)}>{longDate(first?.departure?.localTime)}</time>
      </div>
      <div className="flight-content">
        <div className="flight-route">
          <div className="airport-time">
            <strong>{first?.departure?.localTime?.slice(11) ?? "-"}</strong>
            <span>{first?.departure?.code}</span>
          </div>
          <img className="route-line" src="/booking/flight-line.svg" alt="" />
          <div className="duration">
            <img src="/flight/airplane.svg" alt="" />
            <span>{formatMinutes(leg.totalDurationMinutes)}</span>
          </div>
          <img className="route-line" src="/booking/flight-line.svg" alt="" />
          <div className="airport-time">
            <strong>{last?.arrival?.localTime?.slice(11) ?? "-"}</strong>
            <span>{last?.arrival?.code}</span>
          </div>
        </div>
        <div className="flight-airline-row">
          <div className="airline-info">
            {logo ? (
              <span className="airline-logo">
                <img src={logo} alt="" />
              </span>
            ) : (
              <span className="airline-logo logo-initial" aria-hidden="true">
                {airline.slice(0, 1)}
              </span>
            )}
            <span>
              <strong>{airline}</strong>
              <small>{leg.stops === 0 ? "직항" : `경유 ${leg.stops}회`}</small>
            </span>
          </div>
          <button
            className="detail-toggle"
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            aria-label={`${label} 상세 정보 ${open ? "닫기" : "열기"}`}
            onClick={() => setOpen(!open)}
          >
            <img src="/booking/chevron.svg" alt="" />
          </button>
        </div>
        <div className={`flight-details${open ? " is-open" : ""}`} id={detailsId} aria-hidden={!open}>
          {leg.segments.map((segment, index) => (
            <Fragment key={index}>
              {index > 0 && leg.layovers[index - 1] && (
                <p className="layover">
                  경유 {leg.layovers[index - 1].airportName ?? leg.layovers[index - 1].airportCode} ·{" "}
                  {formatMinutes(leg.layovers[index - 1].durationMinutes)} 대기
                </p>
              )}
              <p>
                {[segment.airline, segment.flightNumber].filter(Boolean).join(" ")}
                {segment.airplane && ` · ${segment.airplane}`}
                <br />
                {segment.departure?.name ?? segment.departure?.code} {segment.departure?.localTime?.slice(11)} →{" "}
                {segment.arrival?.name ?? segment.arrival?.code} {segment.arrival?.localTime?.slice(11)}
              </p>
            </Fragment>
          ))}
        </div>
      </div>
    </article>
  );
}
