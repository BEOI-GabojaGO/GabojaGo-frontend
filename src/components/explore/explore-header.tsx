"use client";

/* eslint-disable @next/next/no-img-element -- 디자인 원본 SVG 아이콘을 그대로 쓴다. */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";
import { prefersReducedMotion } from "@/components/main/main-ui";
import { useHideOnScroll } from "@/components/main/main-scroll";
import { loginHref, logout } from "@/lib/auth-client";
import "@/app/account-menu.css";
import { requestJson } from "@/lib/flight-client";

/**
 * 로그인 후 헤더 계정 메뉴(11/23 시안): "♡ 위시리스트" + "닉네임님 ▾" → 드롭다운("내 정보"·"로그아웃").
 * 시안 드롭다운은 로그아웃만 있지만, 내 계정 화면으로 가는 길을 남기려고 "내 정보"를 둔다(사용자 결정 2026-11-24).
 * 로그아웃이면 각 헤더가 "로그인"을 따로 그린다. 메인·목록·예약하기·둘러보기 헤더가 모두 이걸 쓴다. 스타일은 account-menu.css.
 */
export function AccountMenu({ nickname, onLogout }: { nickname: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  // 열려 있을 때 바깥을 누르거나 ESC를 누르면 닫는다.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <nav className="account-nav" aria-label="내 계정">
      <Link className="wishlist-link" href="/wishlist">
        <span className="wishlist-link-content">
          <img className="wishlist-icon" src="/main/heart-stroke.svg" width={20} height={20} alt="" />
          <span>위시리스트</span>
        </span>
      </Link>
      <div ref={wrap} className="account-menu-wrap">
        <button
          ref={toggle}
          className="account-menu-toggle"
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="account-toggle-content">
            <span className="account-name">
              <span className="account-name-value">{nickname}</span>
              <span className="account-name-suffix">님</span>
            </span>
            <span className="account-chevron" aria-hidden="true" />
          </span>
        </button>
        {/* 닫힌 메뉴도 그려 두고 is-open으로 펼친다(시안의 0.2초 펼침·접힘). 닫혀 있으면 visibility:hidden이라 포커스되지 않는다. */}
        <div className={`account-menu${open ? " is-open" : ""}`} role="menu">
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)}>
            <span className="account-menu-label">내 정보</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            data-account-action="logout"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <span className="account-menu-label">로그아웃</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

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

/**
 * 둘러보기·항공권 화면 헤더. 로그인 상태면 계정 메뉴(AccountMenu), 아니면 새 디자인 로그인 페이지로 가는 "로그인"이다.
 * 토큰은 HttpOnly 쿠키라 /api/users/me 응답으로 로그인 여부를 판단한다(login-dialog와 같은 방식).
 */
/**
 * hideOnScroll: 항공권 목록 화면(1105 시안)은 모바일에서 스크롤하는 동안 헤더를 숨긴다.
 * overHero: 둘러보기 상세(1111 시안). 사진 위 어두운 헤더가 첫 목록이 헤더 밑으로 오면 밝은 헤더(is-light)로 바뀌고,
 * 699px 이하에서는 스크롤하는 동안 숨는다. 뒤로 아이콘도 시안의 왼쪽 화살표(20px)다.
 */
export function ExploreHeader({ hideOnScroll = false, overHero = false }: { hideOnScroll?: boolean; overHero?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useHideOnScroll(ref, hideOnScroll);
  useHeroHeader(ref, overHero);
  const router = useRouter();
  const pathname = usePathname();
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    requestJson<{ nickname: string }>("/api/users/me", { signal: controller.signal })
      .then((result) => result.ok && setNickname(result.data.nickname))
      .catch(() => {});
    return () => controller.abort();
  }, []);

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
        {nickname ? (
          <AccountMenu
            nickname={nickname}
            onLogout={async () => {
              await logout();
              setNickname(null);
            }}
          />
        ) : (
          <Link className="login-button" href={loginHref(pathname)}>
            <img className="login-icon" src="/main/imgIconLogin.svg" width={20} height={20} alt="" />
            로그인
          </Link>
        )}
      </nav>
    </header>
  );
}
