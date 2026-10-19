"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Img, asset, prefersReducedMotion, useInfoDialog } from "@/components/main/main-ui";
import { COUNTRIES } from "@/lib/explore";
import { toSearchQuery } from "@/lib/flight-search-params";
import type { LocationOption } from "@/lib/flight-types";
import { findLocation } from "@/lib/locations";

// 추천 목록 API(GET /api/v1/destinations/recommendations)는 기획 정리 중이라 디자인 목업의 여행지를 쓴다.
// 가격·별점·찜은 데이터가 없어 뺐다(docs/main-recommendation-open-issues.md).
const TRAVELS: {
  name: string;
  country: string;
  destination: [LocationOption["type"], string];
  nights: number;
  description: string;
  tags: string[];
  image: string;
}[] = [
  { name: "다낭", country: "베트남", destination: ["AIRPORT", "DAD"], nights: 2, description: "아름다운 해변과 맛있는 음식, 가성비 최고의 휴양지", tags: ["해변휴양", "맛집", "가성비"], image: "imgTravelImage.webp" },
  { name: "푸꾸옥", country: "베트남", destination: ["AIRPORT", "PQC"], nights: 3, description: "매혹적인 자연과 자유로운 휴식", tags: ["자연", "휴양", "힐링"], image: "imgTravelImage1.webp" },
  { name: "오키나와", country: "일본", destination: ["AIRPORT", "OKA"], nights: 2, description: "가까운 거리의 이국적인 풍경과 문화", tags: ["가까운 여행", "문화", "쇼핑"], image: "imgTravelImage2.webp" },
  { name: "방콕", country: "태국", destination: ["CITY", "BKK"], nights: 3, description: "활기찬 도시와 전통이 공존하는 매력적인 도시", tags: ["도시 여행", "문화", "가성비"], image: "imgTravelImage3.webp" },
];

const tripLength = (nights: number) => `${nights}박 ${nights + 1}일`;
const dateKey = (d: Date) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");

/** 서비스 플로우: 인천 출발 → 여행지, 오늘로부터 한 달 뒤 왕복, 성인 1명, 일반석. */
function recommendedSearchUrl({ destination: [type, code], nights }: (typeof TRAVELS)[number]) {
  const origin = findLocation("AIRPORT", "ICN")!;
  const destination = findLocation(type, code)!;
  const today = new Date();
  // ponytail: 1월 31일처럼 다음 달에 같은 날이 없으면 그다음 달 초로 넘어간다. 추천 기준이 정해지면 보정.
  const depart = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const back = new Date(depart.getFullYear(), depart.getMonth(), depart.getDate() + nights);
  const request = {
    origin: origin.airportCodes,
    destination: destination.airportCodes,
    outboundDate: dateKey(depart),
    returnDate: dateKey(back),
    adults: 1,
    children: 0,
    infantsInSeat: 0,
    infantsOnLap: 0,
    travelClass: 1 as const,
  };
  return `/flights/round-trip/step?${toSearchQuery(request, { origin, destination })}`;
}

/** 모바일 시안은 임시 문구를 보여 준다. 화면 폭에 따른 전환은 CSS(.desktop-data / .mobile-data)가 한다. */
function Responsive({ desktop, mobile }: { desktop: ReactNode; mobile: ReactNode }) {
  return (
    <>
      <span className="desktop-data">{desktop}</span>
      <span className="mobile-data">{mobile}</span>
    </>
  );
}

export function MainCarousels() {
  const router = useRouter();
  const { show, dialog } = useInfoDialog();

  return (
    <>
      <CarouselSection
        className="destinations"
        titleId="destination-title"
        title="여기 가볼까?"
        itemName="여행지"
        trackClass="travel-track"
        trackLabel="추천 여행지"
        onSeeAll={() => show("추천 여행지", "", TRAVELS.map((t) => `${t.name} · ${t.country} · ${tripLength(t.nights)}`))}
      >
        {TRAVELS.map((t) => (
          // 날짜는 렌더가 아니라 클릭 시점에 계산한다(서버·브라우저 날짜가 다르면 hydration 불일치).
          <button
            className="travel-card"
            type="button"
            key={t.name}
            aria-label={`${t.name} ${tripLength(t.nights)} 왕복 항공권 검색`}
            onClick={() => router.push(recommendedSearchUrl(t))}
          >
            <span className="travel-photo">
              <picture>
                <img src={asset(t.image)} alt={`${t.name} 여행 풍경`} />
              </picture>
              <span className="travel-label">
                <span className="travel-name"><Responsive desktop={t.name} mobile="여행지" /></span>
                <span className="travel-country"><Responsive desktop={t.country} mobile="국가명" /></span>
              </span>
            </span>
            <span className="travel-details">
              <span className="trip-duration"><Img name="imgCalendarIcon1.svg" />{tripLength(t.nights)}</span>
              <span className="travel-description"><Responsive desktop={t.description} mobile="여행지에 대한 간단한 설명입니다. " /></span>
              <span className="tags">
                {t.tags.map((tag) => (
                  <span key={tag}><Responsive desktop={`# ${tag}`} mobile="# 태그" /></span>
                ))}
              </span>
            </span>
          </button>
        ))}
      </CarouselSection>

      <CarouselSection
        className="countries"
        titleId="country-title"
        title="아시아 국가 둘러보기"
        itemName="국가"
        trackClass="country-track"
        trackLabel="아시아 국가"
        onSeeAll={() => router.push("/explore")}
      >
        {/* 디자인에 사진이 없는 나라(태국·대만·홍콩)는 사진 없이 회색 카드로 뒤에 이어 붙인다. */}
        {COUNTRIES.map(({ code, nameKo: name, nameEn: en, image }) => (
          <button
            className={image ? "country-card" : "country-card no-photo"}
            type="button"
            key={code}
            aria-label={`${name} 둘러보기`}
            onClick={() => router.push(`/explore/${code}`)}
          >
            {image && (
              <picture>
                <img className="desktop-image" src={asset(image)} alt={`${name} 풍경`} />
              </picture>
            )}
            <span className="country-label">
              <strong><Responsive desktop={name} mobile="국가명" /></strong>
              <small><Responsive desktop={en} mobile="Country Name" /></small>
            </span>
          </button>
        ))}
      </CarouselSection>

      {dialog}
    </>
  );
}

type CarouselSectionProps = {
  className: string;
  titleId: string;
  title: string;
  itemName: string;
  trackClass: string;
  trackLabel: string;
  onSeeAll: () => void;
  children: ReactNode;
};

function CarouselSection({ className, titleId, title, itemName, trackClass, trackLabel, onSeeAll, children }: CarouselSectionProps) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () =>
      setEdges({
        start: element.scrollLeft <= 1,
        end: element.scrollLeft >= element.scrollWidth - element.clientWidth - 1,
      });
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function scrollByCard(direction: 1 | -1) {
    const element = track.current;
    const card = element?.firstElementChild as HTMLElement | null;
    if (!element || !card) return;
    const gap = parseFloat(getComputedStyle(element).gap) || 0;
    element.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: prefersReducedMotion() ? "instant" : "smooth" });
  }

  return (
    <section className={`${className} carousel-section`} aria-labelledby={titleId}>
      <div className="section-heading">
        <div className="section-title">
          <h2 id={titleId}>{title}</h2>
          <button className="see-all" type="button" onClick={onSeeAll}>
            전체보기<Img name="imgChevronRightIcon1.svg" />
          </button>
        </div>
        <div className="arrows">
          <button className="arrow previous" type="button" aria-label={`이전 ${itemName}`} disabled={edges.start} onClick={() => scrollByCard(-1)}>
            <Img name="imgChevronLeftIcon.svg" />
          </button>
          <button className="arrow next" type="button" aria-label={`다음 ${itemName}`} disabled={edges.end} onClick={() => scrollByCard(1)}>
            <Img name="imgChevronRightIcon.svg" />
          </button>
        </div>
      </div>
      <div ref={track} className={`track ${trackClass}`} tabIndex={0} aria-label={trackLabel}>
        {children}
      </div>
    </section>
  );
}
