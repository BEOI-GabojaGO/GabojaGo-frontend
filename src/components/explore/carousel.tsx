"use client";

/* eslint-disable @next/next/no-img-element -- 디자인 원본 SVG 아이콘을 그대로 쓴다. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "@/components/main/main-ui";

/** 둘러보기 디자인의 가로 목록. 화살표는 카드 한 장씩 이동하고, ←/→ 키는 포커스된 목록의 기본 스크롤을 쓴다. */
export function Carousel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
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
    update();
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
    <section className="collection" id={id} aria-labelledby={`${id}-title`}>
      <div className="section-heading">
        <h2 id={`${id}-title`}>{title}</h2>
        <div className="carousel-controls">
          <button className="carousel-arrow" type="button" aria-label={`${title} 이전`} aria-controls={`${id}-track`} disabled={edges.start} onClick={() => scrollByCard(-1)}>
            <img src="/explore/chevron-left.svg" width={20} height={20} alt="" />
          </button>
          <button className="carousel-arrow" type="button" aria-label={`${title} 다음`} aria-controls={`${id}-track`} disabled={edges.end} onClick={() => scrollByCard(1)}>
            <img src="/explore/chevron-right.svg" width={20} height={20} alt="" />
          </button>
        </div>
      </div>
      <div ref={track} className="card-track" id={`${id}-track`} tabIndex={0} role="region" aria-label={`${title} 카드 목록`}>
        {children}
      </div>
    </section>
  );
}
