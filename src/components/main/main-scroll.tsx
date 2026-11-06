"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "@/components/main/main-ui";

const MOBILE_QUERY = "(max-width: 599px)";

/** 모바일에서 스크롤하는 동안 GNB를 위로 숨기고, 멈추면 0.4초 뒤 다시 보여 준다(1105 시안). */
export function MainHeader({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = () => ref.current?.classList.remove("is-scroll-hidden");
    const onScroll = () => {
      clearTimeout(timer);
      if (!matchMedia(MOBILE_QUERY).matches || prefersReducedMotion()) return show();
      ref.current?.classList.add("is-scroll-hidden");
      timer = setTimeout(show, 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header ref={ref} className="header">
      {children}
    </header>
  );
}

/** 장점 목록. 모바일은 가로 한 줄이고 5초마다 다음 항목으로 넘긴다(끝에서는 처음으로). */
export function BenefitList({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const list = ref.current;
      if (!list || !matchMedia(MOBILE_QUERY).matches) return;
      const items = [...list.children] as HTMLElement[];
      const max = list.scrollWidth - list.clientWidth;
      // 마지막 근처(오차 8px)면 처음으로, 아니면 지금 위치 다음 항목의 왼쪽 끝으로.
      const next = list.scrollLeft >= max - 8 ? undefined : items.find((item) => item.offsetLeft - list.offsetLeft > list.scrollLeft + 2);
      list.scrollTo({ left: next ? next.offsetLeft - list.offsetLeft : 0, behavior: prefersReducedMotion() ? "instant" : "smooth" });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div ref={ref} className="benefit-list">
      {children}
    </div>
  );
}
