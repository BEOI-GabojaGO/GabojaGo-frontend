"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Img, isBackdropClick, prefersReducedMotion } from "@/components/main/main-ui";
import { readErrorMessage } from "@/lib/auth-client";

/** 헤더 로그인 버튼 + 로그인 다이얼로그. 로그인 상태면 위시리스트·내 정보 링크를 보여 준다. */
export function LoginDialog() {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closing = useRef<Promise<void> | null>(null);
  const [feedback, setFeedback] = useState("");
  const [invalid, setInvalid] = useState<"email" | "password" | null>(null);
  const [pending, setPending] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // 토큰은 HttpOnly 쿠키라 JS에서 볼 수 없으므로 /api/users/me 응답으로 로그인 여부를 판단한다.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/users/me", { cache: "no-store", signal: controller.signal })
      .then((response) => setLoggedIn(response.ok))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function open() {
    setFeedback("");
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const password = form.elements.namedItem("password") as HTMLInputElement;

    if (!email.validity.valid) {
      setInvalid("email");
      setFeedback(email.value.trim() ? "올바른 이메일 주소를 입력해 주세요." : "이메일을 입력해 주세요.");
      email.focus();
      return;
    }
    if (!password.value) {
      setInvalid("password");
      setFeedback("비밀번호를 입력해 주세요.");
      password.focus();
      return;
    }

    setPending(true);
    setFeedback("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.value, password: password.value }),
      });
      if (!response.ok) {
        setFeedback(await readErrorMessage(response));
        return;
      }
      form.reset();
      await close();
      setLoggedIn(true);
    } catch {
      setFeedback("서버에 연결할 수 없습니다. 백엔드 서버 상태를 확인해 주세요.");
    } finally {
      setPending(false);
    }
  }

  function clearError() {
    setInvalid(null);
    setFeedback("");
  }

  return (
    <>
      {loggedIn ? (
        <nav className="header-links" aria-label="내 계정">
          <Link className="login" href="/wishlist">
            위시리스트
          </Link>
          <Link className="login" href="/account">
            내 정보
          </Link>
        </nav>
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
        aria-labelledby="login-title"
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
        <div className="login-dialog-header">
          <span className="brand">
            가보자 <span>GO</span>
          </span>
          <button className="login-close" type="button" aria-label="로그인 닫기" onClick={() => void close()} />
        </div>
        <h2 id="login-title">로그인</h2>
        <form className="login-form" noValidate onSubmit={submit}>
          <label htmlFor="login-email">이메일</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="501ljy@naver.com"
            required
            aria-invalid={invalid === "email" || undefined}
            onInput={clearError}
          />
          <label htmlFor="login-password">비밀번호</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호를 입력해주세요"
            required
            aria-invalid={invalid === "password" || undefined}
            onInput={clearError}
          />
          <button className="login-submit" type="submit" disabled={pending}>
            {pending ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <p className="login-signup">
          계정이 없으신가요?{" "}
          <button
            className="login-signup-link"
            type="button"
            onClick={async () => {
              await close();
              router.push("/signup");
            }}
          >
            회원가입
          </button>
        </p>
        <div className="login-social">
          <button className="login-google" type="button" onClick={() => setFeedback("Google 계정 인증 연결이 필요합니다.")}>
            <Img name="google-g.svg" />
            Google로 계속하기
          </button>
          <button className="login-kakao" type="button" onClick={() => setFeedback("카카오 계정 인증 연결이 필요합니다.")}>
            <Img name="kakao-talk.svg" />
            카카오로 계속하기
          </button>
        </div>
        <p className="login-feedback" role="status" aria-live="polite">
          {feedback}
        </p>
      </dialog>

    </>
  );
}
