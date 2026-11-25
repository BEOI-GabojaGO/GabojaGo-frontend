"use client";

/* eslint-disable @next/next/no-img-element -- 디자인 원본 SVG 아이콘을 그대로 쓴다. */
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AuthForms, type AuthView } from "@/components/auth/auth-forms";
import { closeDialogAnimated, Img, isBackdropClick, prefersReducedMotion } from "@/components/main/main-ui";
import { logout } from "@/lib/auth-client";
import { requestJson } from "@/lib/flight-client";
import "@/app/auth.css";
import "@/app/account-menu.css";

/**
 * 로그인 후 헤더 계정 메뉴(11/23 시안): "♡ 위시리스트" + "닉네임님 ▾" → 드롭다운("내 정보"·"로그아웃").
 * 시안 드롭다운은 로그아웃만 있지만, 내 계정 화면으로 가는 길을 남기려고 "내 정보"를 둔다(사용자 결정 2026-11-24).
 */
function AccountMenu({ nickname, onLogout }: { nickname: string; onLogout: () => void }) {
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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 로그인·회원가입·로그아웃 전환 로더(11/23 시안 .auth-loader): 비행기가 곡선을 따라 날고 "가보자 GO".
 * 최소 0.9초(움직임 줄이기면 0.18초) 보여 준 뒤 0.38초 동안 흐려지며 사라지고, 끝나면 토스트를 띄운다.
 * 헤더는 transform(스크롤 숨김)이 있어 fixed 자식이 헤더 안에 갇히므로 로더·토스트는 body로 portal 한다.
 */
function useAuthTransition() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "leaving">("hidden");
  const [message, setMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const running = useRef(false);
  const toastTimer = useRef<number>(undefined);

  async function run(task: () => Promise<void>, done: string) {
    if (running.current) return;
    running.current = true;
    const reduced = prefersReducedMotion();
    const started = performance.now();
    setPhase("visible");
    try {
      await task();
      await wait(Math.max(0, (reduced ? 180 : 900) - (performance.now() - started)));
    } finally {
      setPhase("leaving");
      await wait(reduced ? 0 : 380);
      setPhase("hidden");
      running.current = false;
    }
    setMessage(done);
    setToastVisible(true);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 2500);
  }

  // 서버 HTML에는 portal이 없으므로 브라우저에서 그린 뒤에만 붙인다(hydration 불일치 방지).
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const layer = !isClient
    ? null
    : createPortal(
          <>
            {phase !== "hidden" && (
              <div className={`auth-loader is-animating ${phase === "visible" ? "is-visible" : "is-leaving"}`} role="status" aria-live="polite">
                <div className="auth-loader-route" aria-hidden="true">
                  <span className="auth-loader-start" />
                  <svg className="auth-loader-line" viewBox="0 0 150 30" preserveAspectRatio="none">
                    <path d="M 16 15 C 45 -3 105 -3 134 15" />
                  </svg>
                  <img className="auth-loader-plane" src="/flight/airplane.svg" alt="" />
                  <span className="auth-loader-end" />
                </div>
                <strong className="auth-loader-brand">
                  가보자 <span>GO</span>
                </strong>
              </div>
            )}
            <div className={`auth-toast${toastVisible ? " visible" : ""}`} role="status" aria-live="polite">
              {message}
            </div>
          </>,
          document.body,
        );

  return { run, layer };
}

/**
 * 헤더 로그인 버튼 + 로그인·회원가입 다이얼로그(AuthForms). 로그인 상태면 계정 메뉴(AccountMenu)를 보여 준다.
 * 메인·항공권 목록·예약하기·둘러보기 헤더가 모두 쓴다(11/23 시안: 모든 화면에서 로그인 창). 버튼 모양만 화면별로 받는다.
 */
export function LoginDialog({ triggerClassName = "login", triggerIcon }: { triggerClassName?: string; triggerIcon?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // 배경을 누른 채 시작했을 때만 배경 클릭으로 닫는다(입력칸 글자를 끌다가 바깥에서 떼도 닫히지 않게, 11/23 시안).
  const pressedOnBackdrop = useRef(false);
  // 열 때마다 AuthForms를 새로 그려 로그인 화면·빈 오류 상태로 시작한다.
  const [session, setSession] = useState(0);
  const [nickname, setNickname] = useState<string | null>(null);
  const transition = useAuthTransition();

  // 토큰은 HttpOnly 쿠키라 JS에서 볼 수 없으므로 /api/users/me 응답으로 로그인 여부와 닉네임을 얻는다.
  const me = (signal?: AbortSignal) => requestJson<{ nickname: string }>("/api/users/me", { signal });

  useEffect(() => {
    const controller = new AbortController();
    me(controller.signal)
      .then((result) => result.ok && setNickname(result.data.nickname))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function open() {
    setSession((n) => n + 1);
    ref.current?.showModal();
    document.body.classList.add("login-open");
  }

  // 닫힘 애니메이션이 끝난 뒤 닫는다(1111 시안부터 모바일 전체 화면에서도).
  const close = () => closeDialogAnimated(ref.current, 0);

  return (
    <>
      {nickname ? (
        <AccountMenu
          nickname={nickname}
          onLogout={() =>
            void transition
              .run(async () => {
                await logout();
                setNickname(null);
              }, "로그아웃되었습니다.")
              .then(() => trigger.current?.focus())
          }
        />
      ) : (
        <button ref={trigger} className={triggerClassName} type="button" aria-haspopup="dialog" aria-controls="login-dialog" onClick={open}>
          {triggerIcon ?? <Img name="imgIconLogin.svg" className="mobile-only" />}
          로그인
        </button>
      )}

      {/* auth.css 규칙이 .auth-ui 아래에 있으므로 다른 화면에서도 같은 범위로 감싼다(상자는 만들지 않음). */}
      <div className="auth-ui" style={{ display: "contents" }}>
        <dialog
          ref={ref}
          id="login-dialog"
          className="login-dialog"
          aria-labelledby="auth-title"
          onCancel={(event) => {
            event.preventDefault();
            void close();
          }}
          onClose={() => {
            document.body.classList.remove("login-open");
            trigger.current?.focus();
          }}
          onPointerDown={(event) => {
            pressedOnBackdrop.current = event.target === event.currentTarget;
          }}
          onClick={(event) => {
            const fromBackdrop = pressedOnBackdrop.current;
            pressedOnBackdrop.current = false;
            if (fromBackdrop && isBackdropClick(event) && !matchMedia("(max-width: 599px)").matches) void close();
          }}
        >
          <AuthForms
            key={session}
            onSuccess={(view: AuthView) =>
              transition.run(
                async () => {
                  await close();
                  const result = await me();
                  if (result.ok) setNickname(result.data.nickname);
                },
                view === "signup" ? "회원가입이 완료되었습니다." : "로그인되었습니다.",
              )
            }
            onClose={() => void close()}
          />
        </dialog>
      </div>
      {transition.layer}
    </>
  );
}
