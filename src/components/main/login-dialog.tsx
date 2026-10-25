"use client";

import { useEffect, useRef, useState } from "react";
import { AuthForms } from "@/components/auth/auth-forms";
import { AccountLinks } from "@/components/explore/explore-header";
import { Img, isBackdropClick, prefersReducedMotion } from "@/components/main/main-ui";
import { requestJson } from "@/lib/flight-client";

/** 헤더 로그인 버튼 + 로그인·회원가입 다이얼로그(AuthForms). 로그인 상태면 시안의 "♡ 위시리스트 · 닉네임님 ▾"(AccountLinks)를 보여 준다. */
export function LoginDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closing = useRef<Promise<void> | null>(null);
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

  // 데스크톱·태블릿은 닫힘 애니메이션(login-fade-out)이 끝난 뒤 닫는다.
  function close() {
    const dialog = ref.current;
    if (!dialog?.open) return Promise.resolve();
    if (closing.current) return closing.current;
    if (!matchMedia("(min-width: 600px)").matches || prefersReducedMotion()) {
      dialog.close();
      return Promise.resolve();
    }
    closing.current = new Promise<void>((resolve) => {
      const finish = () => {
        window.clearTimeout(timer);
        dialog.removeEventListener("animationend", onEnd);
        dialog.close();
        dialog.classList.remove("is-closing");
        closing.current = null;
        resolve();
      };
      const onEnd = (event: AnimationEvent) => {
        if (event.target === dialog && event.animationName === "login-fade-out") finish();
      };
      const timer = window.setTimeout(finish, 260);
      dialog.addEventListener("animationend", onEnd);
      dialog.classList.add("is-closing");
    });
    return closing.current;
  }

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
