"use client";

/* eslint-disable @next/next/no-img-element -- 디자인 원본 SVG 아이콘을 그대로 쓴다. */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useHideOnScroll } from "@/components/main/main-scroll";
import { loginHref } from "@/lib/auth-client";
import { requestJson } from "@/lib/flight-client";

/**
 * 로그인 후 헤더 계정 메뉴(둘러보기 시안): "♡ 위시리스트" + "닉네임님 ▾"(→ 내 계정).
 * 로그아웃이면 시안(메인·항공권 목록·예약하기)대로 "로그인"만 보이므로 각 헤더가 따로 그린다. 메인 헤더도 이걸 쓴다.
 */
export function AccountLinks({ nickname }: { nickname: string }) {
  return (
    <nav className="account-nav" aria-label="내 계정">
      <Link className="wishlist-button" href="/wishlist">
        <img src="/explore/account.svg" width={14} height={13} alt="" />
        <span>위시리스트</span>
      </Link>
      <Link className="user-button" href="/account">
        {nickname}님
        <img src="/explore/chevron-down.svg" width={14} height={14} alt="" />
      </Link>
    </nav>
  );
}

/**
 * 둘러보기·항공권 화면 헤더. 로그인 상태면 AccountLinks, 아니면 새 디자인 로그인 페이지로 가는 "로그인"이다.
 * 토큰은 HttpOnly 쿠키라 /api/users/me 응답으로 로그인 여부를 판단한다(login-dialog와 같은 방식).
 */
/** hideOnScroll: 항공권 목록 화면(1105 시안)은 모바일에서 스크롤하는 동안 헤더를 숨긴다. */
export function ExploreHeader({ hideOnScroll = false }: { hideOnScroll?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useHideOnScroll(ref, hideOnScroll);
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
            <img src="/explore/back.svg" width={13} height={13} alt="" />
          </button>
          <Link className="brand" href="/" aria-label="가보자 GO 메인">
            가보자 <span>GO</span>
          </Link>
        </div>
        {nickname ? (
          <AccountLinks nickname={nickname} />
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
