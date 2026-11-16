"use client";

/* eslint-disable @next/next/no-img-element -- 디자인 원본 배너 사진을 그대로 쓴다. */
import { useEffect, useMemo, useRef, useState } from "react";
import { loadCountryPlaces } from "@/components/explore/country-places";
import { prefersReducedMotion } from "@/components/main/main-ui";

/** 관광명소 사진을 히어로에 더할 때: 최대 장수, 받은 사진의 최소 폭(1920px 폭에서 흐려 보이지 않게). */
const EXTRA_MAX = 4;
const MIN_WIDTH = 1200;
/** 크기를 재 볼 후보 수 상한(일본은 관광명소가 36곳이라 앞에서부터 이만큼만 받아 본다). */
const CANDIDATE_LIMIT = 8;

/**
 * 둘러보기 상세 히어로 슬라이드(1111 시안): 6.5초마다 다음 사진으로 1.5초 동안 겹쳐 바뀐다(전환은 CSS opacity transition).
 * 사진이 한 장이면 정지 화면이다. 다음 사진을 다 받은 뒤 바꾸고, 탭이 안 보이거나 움직임 줄이기면 넘기지 않는다.
 * placesOf: 전용 사진이 없는 나라(2026-11-16 사용자 결정). 첫 장(메인 국가 카드)을 바로 보여 주고, 그 나라 관광명소 사진 중
 * 폭 1200px 이상인 것을 앞에서부터 최대 4장 뒤에 붙인다. 사진은 하나씩 차례로 받아 재 보므로 첫 화면을 막지 않는다.
 */
export function HeroSlides({ images: base, placesOf }: { images: { src: string; alt: string }[]; placesOf?: string }) {
  const [active, setActive] = useState(0);
  const [extra, setExtra] = useState<{ src: string; alt: string }[]>([]);
  const images = useMemo(() => (extra.length ? [...base, ...extra] : base), [base, extra]);
  // 넘김 타이머는 장수가 늘어도 다시 시작하지 않고 그때의 목록을 읽는다.
  const latest = useRef(images);
  useEffect(() => {
    latest.current = images;
  });
  const rotates = images.length > 1;

  useEffect(() => {
    if (!placesOf) return;
    let alive = true;
    void (async () => {
      const result = await loadCountryPlaces(placesOf);
      if (!result.ok) return;
      const candidates = result.data.attractions.cities
        .flatMap((city) => city.attractions)
        .filter((place) => place.imageUrl)
        .slice(0, CANDIDATE_LIMIT);
      let accepted = 0;
      for (const place of candidates) {
        if (!alive || accepted >= EXTRA_MAX) return;
        const image = new Image();
        image.src = place.imageUrl!;
        const loaded = await image.decode().then(() => true, () => false);
        if (!alive || !loaded || image.naturalWidth < MIN_WIDTH) continue;
        accepted += 1;
        setExtra((current) => [...current, { src: place.imageUrl!, alt: place.name }]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [placesOf]);

  useEffect(() => {
    if (!rotates) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = async () => {
      if (!document.hidden && !prefersReducedMotion()) {
        const list = latest.current;
        const upcoming = new Image();
        upcoming.src = list[(active + 1) % list.length].src;
        await upcoming.decode().catch(() => {});
        setActive((current) => (current + 1) % latest.current.length);
      } else timer = setTimeout(next, 6500);
    };
    timer = setTimeout(next, 6500);
    return () => clearTimeout(timer);
  }, [active, rotates]);

  return (
    <div className="hero-slides" aria-hidden="true">
      {images.map((image, index) => (
        <img
          key={image.src}
          className={`hero-photo${index === active ? " is-active" : ""}`}
          src={image.src}
          alt=""
          width={1920}
          height={1280}
          fetchPriority={index === 0 ? "high" : "low"}
          decoding="async"
        />
      ))}
    </div>
  );
}
