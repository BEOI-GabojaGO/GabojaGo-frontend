"use client";

import { useEffect, useRef, useState } from "react";
import { AuthForms } from "@/components/auth/auth-forms";
import { AccountLinks } from "@/components/explore/explore-header";
import { closeDialogAnimated, Img, isBackdropClick } from "@/components/main/main-ui";
import { requestJson } from "@/lib/flight-client";

/** 헤더 로그인 버튼 + 로그인·회원가입 다이얼로그(AuthForms). 로그인 상태면 시안의 "♡ 위시리스트 · 닉네임님 ▾"(AccountLinks)를 보여 준다. */
export function LoginDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // 열 때마다 AuthForms를 새로 그려 로그인 화면·빈 오류 상태로 시작한다.
  const [session, setSession] = useState(0);
  const [nickname, setNickname] = useState<string | null>(null);

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

  // 데스크톱·태블릿은 닫힘 애니메이션이 끝난 뒤 닫는다.
  const close = () => closeDialogAnimated(ref.current, 600);

  return (
    <>
      {nickname ? (
        <AccountLinks nickname={nickname} />
      ) : (
        <button ref={trigger} className="login" type="button" aria-haspopup="dialog" aria-controls="login-dialog" onClick={open}>
          <Img name="imgIconLogin.svg" className="mobile-only" />
          로그인
        </button>
      )}

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
        onClick={(event) => {
          if (isBackdropClick(event) && !matchMedia("(max-width: 599px)").matches) void close();
        }}
      >
        <AuthForms
          key={session}
          onSuccess={async () => {
            await close();
            const result = await me();
            if (result.ok) setNickname(result.data.nickname);
          }}
          onClose={() => void close()}
        />
      </dialog>
    </>
  );
}
