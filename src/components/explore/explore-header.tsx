"use client";

/* eslint-disable @next/next/no-img-element -- 디자인 원본 SVG 아이콘을 그대로 쓴다. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type RefObject } from "react";
import { prefersReducedMotion } from "@/components/main/main-ui";
import { useHideOnScroll } from "@/components/main/main-scroll";
import { LoginDialog } from "@/components/main/login-dialog";

/** 둘러보기 상세 헤더 동작(1111 시안 script.js syncHeaderTheme·handleMobileHeaderScroll). */
function useHeroHeader(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const header = ref.current;
    if (!enabled || !header) return;
    const mobile = matchMedia("(max-width: 699px)");
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const syncTheme = () => {
      frame = 0;
      const first = document.querySelector(".explore-page .collection, .explore-page .status");
      header.classList.toggle("is-light", !!first && first.getBoundingClientRect().top <= header.offsetHeight);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(syncTheme);
      clearTimeout(timer);
      if (!mobile.matches || prefersReducedMotion()) return header.classList.remove("is-scroll-hidden");
      header.classList.add("is-scroll-hidden");
      timer = setTimeout(() => header.classList.remove("is-scroll-hidden"), 400);
    };
    const onResize = () => {
      if (!frame) frame = requestAnimationFrame(syncTheme);
    };
    syncTheme();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [ref, enabled]);
}

/** 항공권 목록(11/23 시안 syncListGnbSurface): 900px 이상에서 맨 위에 있으면 헤더 배경·그림자를 없앤다(is-at-top). */
function useClearAtTop(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const header = ref.current;
    if (!enabled || !header) return;
    const wide = matchMedia("(min-width: 900px)");
    const sync = () => header.classList.toggle("is-at-top", wide.matches && window.scrollY < 1);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync, { passive: true });
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [ref, enabled]);
}

/**
 * 둘러보기·항공권 화면 헤더. 오른쪽은 메인과 같은 LoginDialog(로그인 상태면 계정 메뉴, 아니면 "로그인" → 로그인 창)다(11/23 시안).
 */
/**
 * hideOnScroll: 항공권 목록 화면(1105 시안)은 모바일에서 스크롤하는 동안 헤더를 숨긴다.
 * overHero: 둘러보기 상세(1111 시안). 사진 위 어두운 헤더가 첫 목록이 헤더 밑으로 오면 밝은 헤더(is-light)로 바뀌고,
 * 699px 이하에서는 스크롤하는 동안 숨는다. 뒤로 아이콘도 시안의 왼쪽 화살표(20px)다.
 */
export function ExploreHeader({
  hideOnScroll = false,
  overHero = false,
  clearAtTop = false,
}: {
  hideOnScroll?: boolean;
  overHero?: boolean;
  /** 항공권 목록: 넓은 화면 맨 위에서 헤더를 투명하게(11/23 시안). */
  clearAtTop?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useHideOnScroll(ref, hideOnScroll);
  useClearAtTop(ref, clearAtTop);
  useHeroHeader(ref, overHero);
  const router = useRouter();

  return (
    <header ref={ref} className="site-header">
      <nav className="header-inner page-container" aria-label="주 메뉴">
        <div className="brand-group">
          <button className="back-button" type="button" aria-label="뒤로 가기" onClick={() => router.back()}>
            {overHero ? <img src="/explore/back-left.svg" width={20} height={20} alt="" /> : <img src="/explore/back.svg" width={13} height={13} alt="" />}
          </button>
          <Link className="brand" href="/" aria-label="가보자 GO 메인">
            가보자 <span>GO</span>
          </Link>
        </div>
        <LoginDialog
          triggerClassName="login-button"
          triggerIcon={<img className="login-icon" src="/main/imgIconLogin.svg" width={20} height={20} alt="" />}
        />
      </nav>
    </header>
  );
}
