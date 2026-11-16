"use client";

/* eslint-disable @next/next/no-img-element -- 시안 아이콘·광고 이미지와 SerpApi 항공사 로고를 그대로 쓴다. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { airlinesOf, FLAGS, querySummary, SortMenu } from "@/components/flight/flight-list-ui";
import { cityName } from "@/components/flight/search-condition-fields";
import { prefersReducedMotion, useToast } from "@/components/main/main-ui";
import { SiteLoader } from "@/components/site-loader";
import { FLIGHT_SEARCH_NOT_FOUND, formatMinutes, postJson } from "@/lib/flight-client";
import { toSearchQuery } from "@/lib/flight-search-params";
import type {
  BookingOption,
  FlightOption,
  HandoffRequest,
  HandoffResponse,
  ItineraryRequest,
  ItineraryResponse,
  OneWaySearchRequest,
  SelectedLocations,
} from "@/lib/flight-types";

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

/**
 * 판매처 조회(POST /itineraries, 1회)와 판매처 이동(POST /handoffs → 중계 페이지). 예약하기 화면이 쓴다.
 * expired: 검색 세션 만료(FLIGHT_SEARCH_NOT_FOUND). 호출한 쪽이 다시 검색하게 한다.
 */
function useItinerary({ searchId, outboundId, returnId }: ItineraryRequest) {
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [pendingKey, setPendingKey] = useState("");
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadItinerary() {
      try {
        const result = await postJson<ItineraryResponse>(
          "/api/v1/itineraries",
          { searchId, outboundId, returnId } satisfies ItineraryRequest,
          controller.signal,
        );

        if (!result.ok) {
          setExpired(result.code === FLIGHT_SEARCH_NOT_FOUND);
          setError(result.message);
          return;
        }

        setItinerary(result.data);
      } catch {
        // 언마운트로 취소된 요청
      }
    }

    void loadItinerary();

    return () => controller.abort();
  }, [searchId, outboundId, returnId]);

  async function book(option: BookingOption) {
    // 팝업 차단을 피하려고 클릭 직후 창부터 연다.
    const popup = window.open("", "_blank");
    const key = optionKey(option);

    setPendingKey(key);
    setBookingError("");

    const result = await postJson<HandoffResponse>("/api/v1/handoffs", {
      searchId,
      outboundId,
      returnId,
      optionIndex: option.optionIndex,
      leg: option.leg,
    } satisfies HandoffRequest);

    setPendingKey("");

    if (!result.ok) {
      popup?.close();
      setBookingError(result.message);
      return;
    }

    const url = `/api/v1/handoffs/${encodeURIComponent(result.data.handoffId)}`;

    if (popup) {
      popup.opener = null;
      popup.location.href = url;
    } else {
      // 팝업이 차단된 경우 현재 탭에서 이동한다. 대상은 Next 페이지가 아니라
      // 판매처 HTML을 중계하는 Route Handler라 router.push로는 열 수 없다.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(url);
    }
  }

  return { itinerary, error, expired, pendingKey, bookingError, book };
}

// 분리 발권이면 같은 optionIndex가 구간별로 나뉘어 오므로 leg까지 묶어 식별한다.
function optionKey(option: BookingOption) {
  return `${option.optionIndex}-${option.leg}`;
}

type Sort = "low" | "high" | "name";
const SORTS: { value: Sort; label: string }[] = [
  { value: "low", label: "낮은 가격순" },
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

/** 예약하기 화면 가격 표기(1111 시안 "366,000 원", 띄어 쓴다). 다른 화면은 formatPrice("366,000원") 그대로. */
const bookingPrice = (price: number | null | undefined) => (price == null ? "가격 정보 없음" : `${price.toLocaleString("ko-KR")} 원`);

/**
 * 판매처 이름 → 시안 로고(public/booking). 판매처 로고 API가 없어 이름으로 맞춘다(SerpApi는 한글·영문 이름이 섞여 온다).
 * 시안 판매처는 국내 여행사 위주라 구글 항공권 판매처(항공사·Trip.com 등)와 겹치는 경우는 적다. 맞는 게 없으면 항공사 로고 → 첫 글자.
 */
const SELLER_LOGOS: [RegExp, string][] = [
  [/네이버|naver/i, "naver.png"],
  [/카약|kayak/i, "kayak.png"],
  [/트립닷컴|trip\.com/i, "trip-com.png"],
  [/야놀자|yanolja/i, "nol-yanolja.webp"],
  [/여기어때|yeogi/i, "eogi-eottae.png"],
  [/노랑풍선|yellow ?balloon/i, "yellowballoon.png"],
  [/호텔스\s?컴바인|hotels\s?combined/i, "hotels-combined.png"],
  [/부킹닷컴|booking\.com/i, "booking.png"],
];

/** 이 일정 항공사 이름 → 로고. 항공사가 직접 파는 판매처(대한항공 등)는 이 로고를 쓴다. */
function airlineLogos(...legs: (FlightOption | undefined)[]) {
  const logos = new Map<string, string>();
  for (const segment of legs.flatMap((leg) => leg?.segments ?? [])) {
    if (segment.airline && segment.airlineLogo && !logos.has(segment.airline)) logos.set(segment.airline, segment.airlineLogo);
  }
  return logos;
}

function sellerLogo(name: string, airlines: Map<string, string>) {
  const known = SELLER_LOGOS.find(([pattern]) => pattern.test(name));
  return known ? `/booking/${known[1]}` : (airlines.get(name) ?? null);
}

const ADS = [
  ["/booking/ad-japan.png", "일본 여행 특가"],
  ["/booking/ad-southeast-asia.png", "동남아 여행 특가"],
];

/**
 * 광고(시안 목업, API 미연결). 599px 이하에서는 가로로 넘기는 캐러셀이 된다(1111 시안):
 * 앞뒤 복제본으로 끝없이 돌고 5초마다 넘기며, 손으로 넘기면 7초 쉬었다가 다시 넘긴다. 움직임 줄이기면 자동으로 넘기지 않는다.
 * 넓은 화면에서는 .ad-list가 display:contents, 복제본은 숨김이라 배치가 그대로다.
 */
function AdList({ onOpen }: { onOpen: () => void }) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = list.current;
    if (!box) return;
    const mobile = matchMedia("(max-width: 599px)");
    const items = () => [...box.querySelectorAll<HTMLElement>("a")];
    let index = ADS.length;
    let auto: ReturnType<typeof setInterval> | undefined;
    let resume: ReturnType<typeof setTimeout> | undefined;
    let loop: ReturnType<typeof setTimeout> | undefined;
    const go = (to: number, behavior: ScrollBehavior) => {
      index = to;
      box.scrollTo({ left: items()[to].offsetLeft - box.offsetLeft, behavior });
    };
    const nearest = () => {
      const all = items();
      index = all.reduce((best, item, i) => (Math.abs(box.scrollLeft - (item.offsetLeft - box.offsetLeft)) < Math.abs(box.scrollLeft - (all[best].offsetLeft - box.offsetLeft)) ? i : best), index);
    };
    const stop = () => {
      clearInterval(auto);
      clearTimeout(resume);
      clearTimeout(loop);
    };
    const next = () => {
      nearest();
      go(Math.min(index + 1, items().length - 1), "smooth");
      // 뒤 복제본까지 가면 같은 그림인 원본 자리로 몰래 돌아간다.
      if (index >= ADS.length * 2) loop = setTimeout(() => go(ADS.length, "auto"), 560);
    };
    const start = () => {
      stop();
      if (!mobile.matches || prefersReducedMotion()) return;
      go(ADS.length, "auto");
      auto = setInterval(next, 5000);
    };
    const pause = () => {
      stop();
      if (mobile.matches && !prefersReducedMotion()) resume = setTimeout(() => (nearest(), (auto = setInterval(next, 5000))), 7000);
    };
    start();
    mobile.addEventListener("change", start);
    for (const type of ["pointerdown", "touchstart", "wheel"]) box.addEventListener(type, pause, { passive: true });
    return () => {
      stop();
      mobile.removeEventListener("change", start);
      for (const type of ["pointerdown", "touchstart", "wheel"]) box.removeEventListener(type, pause);
    };
  }, []);
  const link = ([src, alt]: string[], clone: boolean, key: string) => (
    <a
      key={key}
      className={clone ? "ad-clone" : undefined}
      href="#"
      aria-label={`${alt} 확인`}
      aria-hidden={clone || undefined}
      tabIndex={clone ? -1 : undefined}
      onClick={(event) => {
        event.preventDefault();
        onOpen();
      }}
    >
      <img src={src} alt={clone ? "" : alt} />
    </a>
  );
  return (
    <div ref={list} className="ad-list">
      {ADS.map((ad, i) => link(ad, true, `lead-${i}`))}
      {ADS.map((ad, i) => link(ad, false, `ad-${i}`))}
      {ADS.map((ad, i) => link(ad, true, `tail-${i}`))}
    </div>
  );
}

function Booking({ selection }: { selection: BookingSelection }) {
  const router = useRouter();
  const { searchId, outboundId, returnId, outbound, inbound, request, locations } = selection;
  const { itinerary, error, expired, pendingKey, bookingError, book } = useItinerary({ searchId, outboundId, returnId });
  const [sort, setSort] = useState<Sort>("low");
  const { notify, toast } = useToast();
  const { travelClass } = querySummary(request);
  // 1111 시안: 요약 바는 "출발 → 도착" 경로와 출발지 국기. 성인 외 소아·유아는 아래 정보 줄에 따로 적는다(예산·여행 스타일은 데이터 없음).
  const flag = FLAGS[locations.origin.countryNameKo];
  const adults = `성인 ${request.adults}명`;
  const infants = request.infantsInSeat + request.infantsOnLap;
  const meta = [request.children && `소아 ${request.children}명`, infants && `유아 ${infants}명`].filter(Boolean).join(" · ");
  const logos = useMemo(() => airlineLogos(outbound, inbound), [outbound, inbound]);
  const options = itinerary ? sortOptions(itinerary.bookingOptions, sort) : [];
  // 모바일에서 정렬을 바꾸면 카드가 차례로 다시 나타난다(1111 시안 is-sort-refreshing).
  const offerList = useRef<HTMLDivElement>(null);
  const changeSort = (next: Sort) => {
    setSort(next);
    const box = offerList.current;
    if (!box || !matchMedia("(max-width: 599px)").matches) return;
    box.classList.remove("is-sort-refreshing");
    void box.offsetWidth;
    box.classList.add("is-sort-refreshing");
    setTimeout(() => box.classList.remove("is-sort-refreshing"), 1100);
  };
  const research = () =>
    router.push(`${request.returnDate ? "/flights/round-trip/step" : "/flights/one-way"}?${toSearchQuery(request, locations)}`);

  return (
    <>
      <main className="booking-layout">
        <section className="offers-section" aria-labelledby="booking-title">
          <div className="section-toolbar">
            <h1 id="booking-title">예약하기</h1>
            <SortMenu options={SORTS} value={sort} onChange={changeSort} />
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

          <div ref={offerList} className="offer-list" aria-live="polite">
            {options.map((option) => (
              <OfferCard key={optionKey(option)} option={option} logo={sellerLogo(option.sellerName ?? "", logos)} oneWay={!returnId} pending={pendingKey} onBook={() => void book(option)} />
            ))}
          </div>
          {options.length > 0 && (
            <p className="price-availability-notice" role="note">
              가격과 좌석은 실시간으로 변경될 수 있습니다. 예약처 이동 후 최종 금액과 예약 가능 여부를 확인해 주세요.
            </p>
          )}
        </section>

        <aside className="trip-sidebar" aria-label="선택한 항공 일정">
          <div className="itinerary-panel">
            <div className="trip-summary">
              {flag && (
                <span className="flag">
                  <img src={`/main/${flag}`} alt={`${locations.origin.countryNameKo} 국기`} />
                </span>
              )}
              <strong className="booking-route-summary">
                {cityName(locations.origin)} → {cityName(locations.destination)}
              </strong>
              <span>{adults}</span>
              <i>·</i>
              <span>{inbound ? "왕복" : "편도"}</span>
              <i>·</i>
              <span>{travelClass}</span>
            </div>
            {meta && <p className="booking-condition-meta">{meta}</p>}
            <div className="flight-list">
              <LegCard label="가는편" leg={outbound} />
              {inbound && <LegCard label="오는편" leg={inbound} />}
            </div>
          </div>

          {/* 광고는 시안 목업(API 미연결). */}
          <section className="ad-section" aria-labelledby="ad-title">
            <h2 id="ad-title">광고</h2>
            <AdList onOpen={() => notify("프로모션 페이지는 현재 준비 중입니다.")} />
          </section>
        </aside>
      </main>
      {!itinerary && !error && <SiteLoader busy label="판매처를 찾는 중" />}
      {toast}
    </>
  );
}

/** 판매처 카드. 로고는 sellerLogo(시안 로고 → 항공사 로고), 없으면 이름 첫 글자. 혜택은 시안 순서대로 수하물(baggagePrices) → 서비스(extensions). */
function OfferCard({ option, logo, oneWay, pending, onBook }: { option: BookingOption; logo: string | null; oneWay: boolean; pending: string; onBook: () => void }) {
  const name = option.sellerName ?? "판매처 정보 없음";
  const benefits = [
    ...option.baggagePrices.map((text) => ({ text, icon: "/booking/baggage.svg" })),
    ...option.extensions.map((text) => ({ text, icon: "/booking/service.svg" })),
  ].slice(0, 2);
  const key = optionKey(option);
  return (
    <article className="offer-card">
      <div className="provider-info">
        <div className="provider-title">
          {logo ? (
            <img className="provider-logo" src={logo} alt="" />
          ) : (
            <span className="provider-logo provider-initial" aria-hidden="true">
              {name.slice(0, 1)}
            </span>
          )}
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
        <strong className="price">{bookingPrice(option.price)}</strong>
        {option.bookable ? (
          <button className="book-button" type="button" onClick={onBook} disabled={pending !== ""}>
            {pending === key ? "이동 중..." : "예약하기"}
          </button>
        ) : (
          <span className="phone-booking">
            전화 예약{option.bookingPhone && ` ${option.bookingPhone}`}
            {option.estimatedPhoneServiceFee != null && ` (수수료 ${bookingPrice(option.estimatedPhoneServiceFee)})`}
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
  const toggle = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLElement>(null);
  // 모바일(1111 시안): 펼침 버튼 자리를 재 두고 absolute로 바꿔, 펼치면 카드 아래쪽으로 내려가게 한다.
  useEffect(() => {
    const button = toggle.current;
    const box = card.current;
    if (!button || !box || !matchMedia("(max-width: 599px)").matches) return;
    button.style.setProperty("--detail-toggle-top", `${button.getBoundingClientRect().top - box.getBoundingClientRect().top}px`);
    box.classList.add("mobile-detail-layout");
  }, []);
  const first = leg.segments[0];
  const last = leg.segments.at(-1);
  const airline = airlinesOf(leg).join(", ") || "항공사 정보 없음";
  const logo = leg.airlineLogo ?? first?.airlineLogo;
  const detailsId = `leg-details-${leg.id}`;
  return (
    // 모바일에서는 카드 아무 곳이나 눌러도 상세가 펼쳐진다(1111 시안). 키보드는 펼침 버튼으로.
    <article
      ref={card}
      className="flight-card"
      onClick={(event) => {
        if (matchMedia("(max-width: 599px)").matches && !(event.target as Element).closest(".detail-toggle")) setOpen(!open);
      }}
    >
      <div className="flight-heading">
        <h2>{label}</h2>
        <time dateTime={first?.departure?.localTime?.slice(0, 10)}>{longDate(first?.departure?.localTime)}</time>
      </div>
      <div className={`flight-content${open ? " is-details-open" : ""}`}>
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
            ref={toggle}
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
