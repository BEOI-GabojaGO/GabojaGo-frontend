"use client";

/* eslint-disable @next/next/no-img-element -- 디자인 원본 SVG 아이콘을 그대로 쓴다. */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loginHref } from "@/lib/auth-client";
import { requestJson } from "@/lib/flight-client";

/**
 * 둘러보기 디자인 헤더. 디자인의 사용자 이름 자리는 로그인 상태면 닉네임(→ 내 계정), 아니면 로그인 링크다.
 * 토큰은 HttpOnly 쿠키라 /api/users/me 응답으로 로그인 여부를 판단한다(login-dialog와 같은 방식).
 */
export function ExploreHeader() {
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
    <header className="site-header">
      <nav className="header-inner page-container" aria-label="주 메뉴">
        <div className="brand-group">
          <button className="back-button" type="button" aria-label="뒤로 가기" onClick={() => router.back()}>
            <img src="/explore/back.svg" width={13} height={13} alt="" />
          </button>
          <Link className="brand" href="/" aria-label="가보자 GO 메인">
            가보자 <span>GO</span>
          </Link>
        </div>
        <div className="account-nav">
          <Link className="wishlist-button" href="/wishlist">
            <img src="/explore/account.svg" width={14} height={13} alt="" />
            <span>위시리스트</span>
          </Link>
          {nickname ? (
            <Link className="user-button" href="/account">
              {nickname}님
              <img src="/explore/chevron-down.svg" width={14} height={14} alt="" />
            </Link>
          ) : (
            <Link className="user-button" href={loginHref(pathname)}>
              로그인
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
